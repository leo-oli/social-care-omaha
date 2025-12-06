from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..database import get_session
from ..models import Client
from ..schemas import ClientCreate

router = APIRouter(prefix="/clients", tags=["clients"])


@router.post("", response_model=Client)
def create_client(client_data: ClientCreate, session: Session = Depends(get_session)):
    new_client = Client.model_validate(client_data)
    session.add(new_client)
    session.commit()
    session.refresh(new_client)
    return new_client


@router.get("/{client_id}", response_model=Client)
def get_client(client_id: int, session: Session = Depends(get_session)):
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client
