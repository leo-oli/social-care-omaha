from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..database import get_session
from ..models import Client, ClientPII
from ..schemas import ClientCreate

router = APIRouter(prefix="/clients", tags=["clients"])


@router.post("", response_model=Client)
def create_client(client_data: ClientCreate, session: Session = Depends(get_session)):
    # Create the core client record without PII
    new_client = Client()
    session.add(new_client)
    session.commit()
    session.refresh(new_client)

    if new_client.client_id is None:
        raise HTTPException(status_code=500, detail="Failed to create client.")

    # Create the associated PII record
    pii_data = ClientPII(client_id=new_client.client_id, **client_data.model_dump())
    session.add(pii_data)
    session.commit()

    return new_client


@router.get("/{client_id}", response_model=Client)
def get_client(client_id: int, session: Session = Depends(get_session)):
    client = session.get(Client, client_id)
    if not client or client.deleted_at:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: int, session: Session = Depends(get_session)):
    client = session.get(Client, client_id)
    if not client or client.deleted_at:
        raise HTTPException(status_code=404, detail="Client not found")

    client.deleted_at = datetime.now(timezone.utc)
    client.is_active = False
    session.add(client)
    session.commit()
    return None
