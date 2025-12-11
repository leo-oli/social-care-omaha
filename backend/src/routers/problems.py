from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..models import (
    Client,
    ClientProblem,
    ClientProblemSymptom,
    OmahaProblem,
    ModifierDomain,
    ModifierType,
    Symptom,
)
from ..schemas import (
    ClientProblemCreate,
    ClientProblemRead,
    ClientProblemUpdate,
    ClientProblemSymptomCreate,
)

router = APIRouter(prefix="/clients", tags=["problems"])


@router.get("/{client_id}/problems", response_model=list[ClientProblemRead])
def get_client_problems(client_id: int, session: Session = Depends(get_session)):
    problems = session.exec(
        select(ClientProblem)
        .where(ClientProblem.client_id == client_id)
        .where(ClientProblem.is_active == True)  # noqa: E712
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

    if not problem.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client problem is not active",
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
