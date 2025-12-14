import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from ..database import get_session
from ..services.export import (
    generate_care_plan_summary_text,
    generate_care_plan_summary_json,
    get_group_office_payload_mock,
)
from ..models import (
    Patient,
    PatientPII,
    PatientConsent,
    ConsentDefinition,
)
from ..services.encryption import decrypt_data, encrypt_data
from ..schemas import (
    PatientCreate,
    PatientReadDetails,
)

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=list[PatientReadDetails])
def get_patients(session: Session = Depends(get_session)):
    patients = session.exec(select(Patient).where(Patient.deleted_at == None)).all()  # noqa: E711
    patient_details_list = []
    for patient in patients:
        pii = session.exec(
            select(PatientPII).where(PatientPII.patient_id == patient.patient_id)
        ).first()
        if pii:
            pii.first_name = decrypt_data(pii.first_name)
            pii.last_name = decrypt_data(pii.last_name)
            patient_details = patient.model_dump()
            patient_details.update(pii.model_dump())
            patient_details_list.append(PatientReadDetails(**patient_details))
    return patient_details_list


@router.post("", response_model=PatientReadDetails, status_code=status.HTTP_201_CREATED)
def create_patient(
    patient_data: PatientCreate, session: Session = Depends(get_session)
):
    try:
        # Validate consents
        definitions = session.exec(select(ConsentDefinition)).all()
        mandatory_ids = {d.consent_definition_id for d in definitions if d.is_mandatory}
        provided_consents = {
            c.consent_definition_id: c.has_consented for c in patient_data.consents
        }

        for mid in mandatory_ids:
            if mid is None:
                raise ValueError("Consent definition IDs should not contain None.")
            if provided_consents.get(mid) is not True:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mandatory consent {mid} missing or denied.",
                )

        pii_data = {
            "first_name": encrypt_data(patient_data.first_name),
            "last_name": encrypt_data(patient_data.last_name),
            "date_of_birth": patient_data.date_of_birth,
            "tin": patient_data.tin,
            "phone_number": patient_data.phone_number,
            "address": patient_data.address,
        }

        new_patient = Patient()
        session.add(new_patient)
        session.flush()

        if new_patient.patient_id is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create patient",
            )

        new_pii = PatientPII(patient_id=new_patient.patient_id, **pii_data)

        consent_objects = []
        for c in patient_data.consents:
            consent_objects.append(
                PatientConsent(
                    patient_id=new_patient.patient_id,
                    consent_definition_id=c.consent_definition_id,
                    has_consented=c.has_consented,
                )
            )

        session.add_all([new_pii] + consent_objects)
        session.commit()
        session.refresh(new_patient)
        session.refresh(new_pii)

        new_pii.first_name = decrypt_data(new_pii.first_name)
        new_pii.last_name = decrypt_data(new_pii.last_name)

        patient_details = new_patient.model_dump()
        patient_details.update(new_pii.model_dump())

        return PatientReadDetails(**patient_details)
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create patient: {e}",
        )


@router.get("/{patient_id}", response_model=PatientReadDetails)
def get_patient_details(patient_id: int, session: Session = Depends(get_session)):
    patient = session.get(Patient, patient_id)
    if not patient or patient.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found"
        )

    pii = session.exec(
        select(PatientPII).where(PatientPII.patient_id == patient_id)
    ).first()
    if not pii:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient PII not found"
        )

    # Decrypt PII before returning
    pii.first_name = decrypt_data(pii.first_name)
    pii.last_name = decrypt_data(pii.last_name)

    # Combine the two models into the response
    patient_details = patient.model_dump()
    patient_details.update(pii.model_dump())
    return PatientReadDetails(**patient_details)


@router.put("/{patient_id}", response_model=PatientReadDetails)
def update_patient_pii(
    patient_id: int,
    patient_data: PatientCreate,
    session: Session = Depends(get_session),
):
    patient = session.get(Patient, patient_id)
    if not patient or patient.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found"
        )

    # Validate mandatory consents
    definitions = session.exec(select(ConsentDefinition)).all()
    valid_ids = {d.consent_definition_id for d in definitions}
    mandatory_ids = {d.consent_definition_id for d in definitions if d.is_mandatory}
    provided_consents = {
        c.consent_definition_id: c.has_consented for c in patient_data.consents
    }

    for cid in provided_consents:
        if cid not in valid_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid consent definition ID: {cid}",
            )

    for mid in mandatory_ids:
        if mid in provided_consents and provided_consents[mid] is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mandatory consent {mid} cannot be revoked.",
            )

    pii = session.exec(
        select(PatientPII).where(PatientPII.patient_id == patient_id)
    ).first()
    if not pii:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient PII not found"
        )

    # Note: PII encryption should happen here
    pii.first_name = encrypt_data(patient_data.first_name)  # ENCRYPT
    pii.last_name = encrypt_data(patient_data.last_name)  # ENCRYPT
    pii.date_of_birth = patient_data.date_of_birth
    pii.phone_number = patient_data.phone_number
    pii.address = patient_data.address
    pii.tin = patient_data.tin

    session.add(pii)

    # Handle Consents Update
    existing_consents = session.exec(
        select(PatientConsent).where(PatientConsent.patient_id == patient_id)
    ).all()
    existing_consents_map = {c.consent_definition_id: c for c in existing_consents}

    for consent_data in patient_data.consents:
        cid = consent_data.consent_definition_id
        has_consented = consent_data.has_consented

        if cid in existing_consents_map:
            existing_consent = existing_consents_map[cid]
            if existing_consent.has_consented != has_consented:
                existing_consent.has_consented = has_consented
                if has_consented:
                    existing_consent.granted_at = datetime.now(timezone.utc)
                    existing_consent.revoked_at = None
                else:
                    existing_consent.revoked_at = datetime.now(timezone.utc)
                session.add(existing_consent)
        else:
            new_consent = PatientConsent(
                patient_id=patient_id,
                consent_definition_id=cid,
                has_consented=has_consented,
                granted_at=datetime.now(timezone.utc),
                revoked_at=datetime.now(timezone.utc) if not has_consented else None,
            )
            session.add(new_consent)

    session.commit()
    session.refresh(pii)
    session.refresh(patient)

    # Decrypt PII before returning
    pii.first_name = decrypt_data(pii.first_name)
    pii.last_name = decrypt_data(pii.last_name)

    patient_details = patient.model_dump()
    patient_details.update(pii.model_dump())
    return PatientReadDetails(**patient_details)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: int, session: Session = Depends(get_session)):
    patient = session.get(Patient, patient_id)
    if not patient or patient.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found"
        )

    now = datetime.now(timezone.utc)
    patient.deleted_at = now
    patient.is_active = False

    pii = session.exec(
        select(PatientPII).where(PatientPII.patient_id == patient_id)
    ).first()
    if pii:
        # Soft-deleting PII is a business decision. Here we nullify fields.
        pii.first_name = "DELETED"
        pii.last_name = "DELETED"
        pii.phone_number = None
        pii.address = None
        session.add(pii)

    session.add(patient)
    session.commit()
    return None


@router.get("/{patient_id}/export")
def export_patient_data(
    patient_id: int,
    export_format: str = "txt",
    destination: str = "download",
    session: Session = Depends(get_session),
):
    patient = session.get(Patient, patient_id)
    if not patient or patient.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found"
        )

    if export_format == "txt":
        summary_text, patient_name = generate_care_plan_summary_text(
            patient_id, session
        )
        if not patient_name:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=patient_name
            )
        content = summary_text
        media_type = "text/plain"
        extension = "txt"
    elif export_format == "json":
        summary_json = generate_care_plan_summary_json(patient_id, session)
        if not summary_json:
            raise HTTPException(status_code=404, detail="Patient PII not found")
        patient_name = summary_json["patient"]["name"]
        content = json.dumps(summary_json, indent=2)
        media_type = "application/json"
        extension = "json"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid export_format specified",
        )

    if destination == "group_office":
        mock_payload = get_group_office_payload_mock(str(patient.patient_uuid), content)
        return mock_payload

    # Default: download
    filename_date = datetime.now().strftime("%Y-%m-%d_%H-%M")
    filename_name = (
        "".join(c for c in patient_name if c.isalnum() or c in " _-")
        .replace(" ", "-")
        .rstrip()
    )

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="CarePlan_{filename_name}_{filename_date}.{extension}"'
        },
    )
