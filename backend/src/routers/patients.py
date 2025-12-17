import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from ..database import get_session
from ..services.export import (
    generate_care_plan_summary_text,
    generate_care_plan_summary_json,
    create_group_office_note,
    update_group_office_note,
    format_for_group_office,
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
def get_patients(tin: str | None = None, session: Session = Depends(get_session)):
    query = (
        select(Patient, PatientPII)
        .where(Patient.patient_id == PatientPII.patient_id)
        .where(Patient.deleted_at == None)  # noqa: E711
    )

    results = session.exec(query).all()
    patient_details_list = []
    for patient, pii in results:
        # Decrypt PII first
        pii.first_name = decrypt_data(pii.first_name)
        pii.last_name = decrypt_data(pii.last_name)
        pii.date_of_birth = decrypt_data(pii.date_of_birth)
        pii.tin = decrypt_data(pii.tin)
        if pii.phone_number:
            pii.phone_number = decrypt_data(pii.phone_number)
        if pii.address:
            pii.address = decrypt_data(pii.address)
        
        # Filter by TIN after decryption (if tin parameter is provided)
        if tin:
            if pii.tin == tin:
                patient_details = patient.model_dump()
                patient_details.update(pii.model_dump())
                patient_details_list.append(PatientReadDetails(**patient_details))
        else:
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

        # Check if TIN is unique (iterate and decrypt due to non-deterministic encryption)
        existing_tins = session.exec(select(PatientPII.tin)).all()
        for existing_tin in existing_tins:
            if decrypt_data(existing_tin) == patient_data.tin:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Patient with this TIN already exists",
                )

        pii_data = {
            "first_name": encrypt_data(patient_data.first_name),
            "last_name": encrypt_data(patient_data.last_name),
            "date_of_birth": encrypt_data(str(patient_data.date_of_birth)),
            "tin": encrypt_data(patient_data.tin),
            "phone_number": encrypt_data(patient_data.phone_number)
            if patient_data.phone_number
            else None,
            "address": encrypt_data(patient_data.address)
            if patient_data.address
            else None,
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
        new_pii.date_of_birth = decrypt_data(new_pii.date_of_birth)
        new_pii.tin = decrypt_data(new_pii.tin)
        if new_pii.phone_number:
            new_pii.phone_number = decrypt_data(new_pii.phone_number)
        if new_pii.address:
            new_pii.address = decrypt_data(new_pii.address)

        patient_details = new_patient.model_dump()
        patient_details.update(new_pii.model_dump())

        return PatientReadDetails(**patient_details)
    except HTTPException:
        session.rollback()
        raise
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
    pii.date_of_birth = decrypt_data(pii.date_of_birth)
    pii.tin = decrypt_data(pii.tin)
    if pii.phone_number:
        pii.phone_number = decrypt_data(pii.phone_number)
    if pii.address:
        pii.address = decrypt_data(pii.address)

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
    pii.date_of_birth = encrypt_data(str(patient_data.date_of_birth))
    pii.tin = encrypt_data(patient_data.tin)
    pii.phone_number = (
        encrypt_data(patient_data.phone_number) if patient_data.phone_number else None
    )
    pii.address = encrypt_data(patient_data.address) if patient_data.address else None

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
    pii.date_of_birth = decrypt_data(pii.date_of_birth)
    pii.tin = decrypt_data(pii.tin)
    if pii.phone_number:
        pii.phone_number = decrypt_data(pii.phone_number)
    if pii.address:
        pii.address = decrypt_data(pii.address)

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
    response: Response,
    export_format: str = "txt",
    destination: str = "download",
    session: Session = Depends(get_session),
):
    if export_format not in ("txt", "json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid export_format. Options: 'txt', 'json'",
        )

    if destination not in ("download", "group_office", "preview"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid destination. Options: 'download', 'group_office', 'preview'",
        )

    patient = session.get(Patient, patient_id)
    if not patient or patient.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found"
        )

    # 1. Generate Content (Data Layer)
    response_data = None
    patient_name = "Unknown"
    media_type = "text/plain"

    if export_format == "txt":
        response_data, patient_name = generate_care_plan_summary_text(
            patient_id, session
        )
        media_type = "text/plain"
    elif export_format == "json":
        response_data = generate_care_plan_summary_json(patient_id, session)
        if not response_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Patient PII not found"
            )
        patient_name = response_data.get("patient", {}).get("name", "Unknown")
        media_type = "application/json"

    if not patient_name:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient name not found"
        )

    # 2. Handle Delivery Strategy (Presentation Layer)
    # Ensure content is stringified for file-based destinations
    content_string = response_data
    if not isinstance(content_string, str):
        content_string = json.dumps(response_data)

    if destination == "group_office":
        note_title = f"Care Plan: {patient_name}"

        note_content = content_string
        if export_format == "txt":
            note_content = format_for_group_office(content_string)

        try:
            if patient.group_office_note_id is None:
                # Create new note
                note_id = create_group_office_note(note_title, note_content)
                patient.group_office_note_id = note_id
                session.add(patient)
                session.commit()
                session.refresh(patient)
                response.status_code = status.HTTP_201_CREATED
                return {"status": "success", "action": "created", "note_id": note_id}
            else:
                # Update existing note
                update_group_office_note(
                    patient.group_office_note_id, note_title, note_content
                )
                response.status_code = status.HTTP_200_OK
                return {
                    "status": "success",
                    "action": "updated",
                    "note_id": patient.group_office_note_id,
                }
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Group Office integration failed: {str(e)}",
            )

    if destination == "preview":
        # Return raw JSON dict or raw Text string directly
        if export_format == "json":
            return response_data
        return Response(content=content_string, media_type=media_type)

    # Default: File Download
    filename_date = datetime.now().strftime("%Y-%m-%d_%H-%M")
    safe_name = (
        "".join(c for c in patient_name if c.isalnum() or c in " _-")
        .replace(" ", "-")
        .strip()
    )
    filename = f"CarePlan_{safe_name}_{filename_date}.{export_format}"

    return Response(
        content=content_string,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
