from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from ..database import get_session
from ..services.export import (
    generate_care_plan_summary_text,
    get_group_office_payload_mock,
)
from ..models import (
    Client,
    ClientPII,
    ClientConsent,
    ConsentDefinition,
)
from ..services.encryption import decrypt_data, encrypt_data
from ..schemas import (
    ClientCreate,
    ClientReadDetails,
)

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[ClientReadDetails])
def get_clients(session: Session = Depends(get_session)):
    clients = session.exec(select(Client).where(Client.deleted_at == None)).all()  # noqa: E711
    client_details_list = []
    for client in clients:
        pii = session.exec(
            select(ClientPII).where(ClientPII.client_id == client.client_id)
        ).first()
        if pii:
            pii.first_name = decrypt_data(pii.first_name)
            pii.last_name = decrypt_data(pii.last_name)
            client_details = client.model_dump()
            client_details.update(pii.model_dump())
            client_details_list.append(ClientReadDetails(**client_details))
    return client_details_list


@router.post("", response_model=ClientReadDetails, status_code=status.HTTP_201_CREATED)
def create_client(client_data: ClientCreate, session: Session = Depends(get_session)):
    try:
        # Validate consents
        definitions = session.exec(select(ConsentDefinition)).all()
        mandatory_ids = {d.consent_definition_id for d in definitions if d.is_mandatory}
        provided_consents = {
            c.consent_definition_id: c.has_consented for c in client_data.consents
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
            "first_name": encrypt_data(client_data.first_name),
            "last_name": encrypt_data(client_data.last_name),
            "date_of_birth": client_data.date_of_birth,
            "email": client_data.email,
            "address": client_data.address,
        }

        new_client = Client()
        session.add(new_client)
        session.flush()

        if new_client.client_id is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create client",
            )

        new_pii = ClientPII(client_id=new_client.client_id, **pii_data)

        consent_objects = []
        for c in client_data.consents:
            consent_objects.append(
                ClientConsent(
                    client_id=new_client.client_id,
                    consent_definition_id=c.consent_definition_id,
                    has_consented=c.has_consented,
                )
            )

        session.add_all([new_pii] + consent_objects)
        session.commit()
        session.refresh(new_client)
        session.refresh(new_pii)

        new_pii.first_name = decrypt_data(new_pii.first_name)
        new_pii.last_name = decrypt_data(new_pii.last_name)

        client_details = new_client.model_dump()
        client_details.update(new_pii.model_dump())

        return ClientReadDetails(**client_details)
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create client: {e}",
        )


@router.get("/{client_id}", response_model=ClientReadDetails)
def get_client_details(client_id: int, session: Session = Depends(get_session)):
    client = session.get(Client, client_id)
    if not client or client.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Client not found"
        )

    pii = session.exec(
        select(ClientPII).where(ClientPII.client_id == client_id)
    ).first()
    if not pii:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Client PII not found"
        )

    # Decrypt PII before returning
    pii.first_name = decrypt_data(pii.first_name)
    pii.last_name = decrypt_data(pii.last_name)

    # Combine the two models into the response
    client_details = client.model_dump()
    client_details.update(pii.model_dump())
    return ClientReadDetails(**client_details)


@router.put("/{client_id}", response_model=ClientReadDetails)
def update_client_pii(
    client_id: int, client_data: ClientCreate, session: Session = Depends(get_session)
):
    client = session.get(Client, client_id)
    if not client or client.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Client not found"
        )

    # Validate mandatory consents
    definitions = session.exec(select(ConsentDefinition)).all()
    valid_ids = {d.consent_definition_id for d in definitions}
    mandatory_ids = {d.consent_definition_id for d in definitions if d.is_mandatory}
    provided_consents = {
        c.consent_definition_id: c.has_consented for c in client_data.consents
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
        select(ClientPII).where(ClientPII.client_id == client_id)
    ).first()
    if not pii:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Client PII not found"
        )

    # Note: PII encryption should happen here
    pii.first_name = encrypt_data(client_data.first_name)  # ENCRYPT
    pii.last_name = encrypt_data(client_data.last_name)  # ENCRYPT
    pii.date_of_birth = client_data.date_of_birth
    pii.email = client_data.email
    pii.address = client_data.address

    session.add(pii)

    # Handle Consents Update
    existing_consents = session.exec(
        select(ClientConsent).where(ClientConsent.client_id == client_id)
    ).all()
    existing_consents_map = {c.consent_definition_id: c for c in existing_consents}

    for consent_data in client_data.consents:
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
            new_consent = ClientConsent(
                client_id=client_id,
                consent_definition_id=cid,
                has_consented=has_consented,
                granted_at=datetime.now(timezone.utc),
                revoked_at=datetime.now(timezone.utc) if not has_consented else None,
            )
            session.add(new_consent)

    session.commit()
    session.refresh(pii)
    session.refresh(client)

    # Decrypt PII before returning
    pii.first_name = decrypt_data(pii.first_name)
    pii.last_name = decrypt_data(pii.last_name)

    client_details = client.model_dump()
    client_details.update(pii.model_dump())
    return ClientReadDetails(**client_details)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(client_id: int, session: Session = Depends(get_session)):
    client = session.get(Client, client_id)
    if not client or client.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Client not found"
        )

    now = datetime.now(timezone.utc)
    client.deleted_at = now
    client.is_active = False

    pii = session.exec(
        select(ClientPII).where(ClientPII.client_id == client_id)
    ).first()
    if pii:
        # Soft-deleting PII is a business decision. Here we nullify fields.
        pii.first_name = "DELETED"
        pii.last_name = "DELETED"
        pii.email = None
        pii.address = None
        session.add(pii)

    session.add(client)
    session.commit()
    return None


@router.get("/{client_id}/export")
def export_client_data(
    client_id: int, format: str = "txt", session: Session = Depends(get_session)
):
    client = session.get(Client, client_id)
    if not client or client.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Client not found"
        )

    summary_text, client_name = generate_care_plan_summary_text(client_id, session)

    if format == "txt":
        if not client_name:
            raise HTTPException(
                status_code=404, detail=summary_text
            )  # e.g. client not found

        filename_date = datetime.now().strftime("%Y-%m-%d_%H-%M")
        filename_name = (
            "".join(c for c in client_name if c.isalnum() or c in " _-")
            .replace(" ", "-")
            .rstrip()
        )

        return Response(
            content=summary_text,
            media_type="text/plain",
            headers={
                "Content-Disposition": f'attachment; filename="CarePlan_{filename_name}_{filename_date}.txt"'
            },
        )

    elif format == "group_office":
        mock_payload = get_group_office_payload_mock(
            str(client.client_uuid), summary_text
        )
        return mock_payload

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid format specified"
        )
