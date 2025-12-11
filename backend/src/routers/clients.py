from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from ..database import get_session
from ..models import (
    Client,
    ClientPII,
    ClientConsent,
    ClientProblem,
    ClientProblemSymptom,
    Symptom,
    OmahaProblem,
    ModifierDomain,
    ModifierType,
    OutcomeScore,
)
from ..schemas import (
    ClientCreate,
    ClientRead,
    ClientReadDetails,
    ClientProblemCreate,
    ClientProblemRead,
    ClientProblemSymptomCreate,
    OutcomeScoreRead,
    ClientProblemUpdate,
)

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[ClientRead])
def get_clients(session: Session = Depends(get_session)):
    clients = session.exec(select(Client).where(Client.deleted_at == None)).all()  # noqa: E711
    return clients


@router.post("", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(client_data: ClientCreate, session: Session = Depends(get_session)):
    try:
        # Note: PII encryption should happen here before creating the ClientPII object.
        # For now, we'll store it as plain text and add a comment.
        pii_data = {
            "first_name": client_data.first_name,  # ENCRYPT THIS
            "last_name": client_data.last_name,  # ENCRYPT THIS
            "date_of_birth": client_data.date_of_birth,
            "email": client_data.email,
            "address": client_data.address,
        }

        new_client = Client()
        session.add(new_client)
        session.flush()  # Flush to get the new_client.client_id

        if new_client.client_id is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create client",
            )

        new_pii = ClientPII(client_id=new_client.client_id, **pii_data)
        new_consent = ClientConsent(
            client_id=new_client.client_id,
            consent_type=client_data.consent_type,
            has_consented=client_data.has_consented,
        )

        session.add_all([new_pii, new_consent])
        session.commit()
        session.refresh(new_client)

        return new_client
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

    pii = session.exec(
        select(ClientPII).where(ClientPII.client_id == client_id)
    ).first()
    if not pii:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Client PII not found"
        )

    # Note: PII encryption should happen here
    pii.first_name = client_data.first_name  # ENCRYPT
    pii.last_name = client_data.last_name  # ENCRYPT
    pii.date_of_birth = client_data.date_of_birth
    pii.email = client_data.email
    pii.address = client_data.address

    session.add(pii)
    session.commit()
    session.refresh(pii)
    session.refresh(client)

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


@router.get("/{client_id}/problems", response_model=list[ClientProblemRead])
def get_client_problems(client_id: int, session: Session = Depends(get_session)):
    problems = session.exec(
        select(ClientProblem)
        .where(ClientProblem.client_id == client_id)
        .where(ClientProblem.deleted_at == None)  # noqa: E711
    ).all()
    return problems


@router.post(
    "/{client_id}/problems",
    response_model=ClientProblemRead,
    status_code=status.HTTP_201_CREATED,
)
def create_client_problem(
    client_id: int,
    problem_data: ClientProblemCreate,
    session: Session = Depends(get_session),
):
    # Validate client exists
    client = session.get(Client, client_id)
    if not client or client.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Client not found"
        )

    # Validate foreign keys
    problem = session.get(OmahaProblem, problem_data.problem_id)
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found"
        )

    modifier_domain = session.get(ModifierDomain, problem_data.modifier_domain_id)
    if not modifier_domain:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Modifier domain not found"
        )

    modifier_type = session.get(ModifierType, problem_data.modifier_type_id)
    if not modifier_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Modifier type not found"
        )

    new_problem = ClientProblem(client_id=client_id, **problem_data.model_dump())
    session.add(new_problem)
    session.commit()
    session.refresh(new_problem)
    return new_problem


@router.patch(
    "/{client_id}/problems/{client_problem_id}",
    response_model=ClientProblemRead,
)
def update_client_problem(
    client_id: int,
    client_problem_id: int,
    problem_data: ClientProblemUpdate,
    session: Session = Depends(get_session),
):
    problem = session.get(ClientProblem, client_problem_id)
    if not problem or problem.client_id != client_id or problem.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Client problem not found"
        )

    problem.is_active = problem_data.is_active
    session.add(problem)
    session.commit()
    session.refresh(problem)
    return problem


@router.post(
    "/{client_id}/problems/{client_problem_id}/symptoms",
    status_code=status.HTTP_201_CREATED,
)
def add_symptom_to_problem(
    client_id: int,
    client_problem_id: int,
    symptom_data: ClientProblemSymptomCreate,
    session: Session = Depends(get_session),
):
    problem = session.get(ClientProblem, client_problem_id)
    if not problem or problem.client_id != client_id or problem.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Client problem not found"
        )

    # Check for duplicates
    existing_symptom = session.exec(
        select(ClientProblemSymptom)
        .where(ClientProblemSymptom.client_problem_id == client_problem_id)
        .where(ClientProblemSymptom.symptom_id == symptom_data.symptom_id)
        .where(ClientProblemSymptom.deleted_at == None)  # noqa: E711
    ).first()

    if existing_symptom:
        return {"message": "Symptom already associated with this problem"}

    symptom = session.get(Symptom, symptom_data.symptom_id)
    if not symptom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Symptom not found"
        )

    new_symptom = ClientProblemSymptom(
        client_problem_id=client_problem_id,
        symptom_id=symptom_data.symptom_id,
        symptom_comment=symptom_data.symptom_comment,
    )
    session.add(new_symptom)
    session.commit()
    return {"message": "Symptom added successfully"}


@router.get(
    "/{client_id}/problems/{client_problem_id}/scores",
    response_model=list[OutcomeScoreRead],
)
def get_problem_scores(
    client_id: int,
    client_problem_id: int,
    session: Session = Depends(get_session),
):
    problem = session.get(ClientProblem, client_problem_id)
    if not problem or problem.client_id != client_id or problem.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Client problem not found"
        )

    scores = session.exec(
        select(OutcomeScore)
        .where(OutcomeScore.client_problem_id == client_problem_id)
        .where(OutcomeScore.deleted_at == None)  # noqa: E711
        .order_by(OutcomeScore.date_recorded.desc())  # type: ignore
    ).all()
    return scores


@router.get("/{client_id}/export")
def export_client_data(
    client_id: int, format: str = "txt", session: Session = Depends(get_session)
):
    client = session.get(Client, client_id)
    if not client or client.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Client not found"
        )

    if format == "txt":
        pii = session.exec(
            select(ClientPII).where(ClientPII.client_id == client_id)
        ).first()
        problems = session.exec(
            select(ClientProblem)
            .where(ClientProblem.client_id == client_id)
            .where(ClientProblem.deleted_at == None)  # noqa: E711
        ).all()

        if pii is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client PII not found for export",
            )

        content = f"Client Export: {pii.first_name} {pii.last_name}\n"
        content += f"DOB: {pii.date_of_birth}\n"
        content += f"Email: {pii.email}\n\n"
        content += "--- Problems ---\n"
        for prob in problems:
            content += f"- {prob.problem.problem_name}\n"

        return Response(
            content=content,
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename=client_{client_id}_export.txt"
            },
        )

    elif format == "group_office":
        return {
            "status": "success",
            "external_system": "GroupOffice",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "client_id": client.client_uuid,
        }

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid format specified"
        )
