from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from sqlalchemy import desc

from ..database import get_session
from ..models import (
    CareIntervention,
    Client,
    ClientProblem,
    ClientProblemSymptom,
    OutcomeScore,
)  # type: ignore
from ..schemas import CarePlan, ClientProblemReadWithDetails, ClientRead

router = APIRouter(prefix="/clients", tags=["care-plans"])


@router.get("/{client_id}/care-plan", response_model=CarePlan)
def get_care_plan(client_id: int, session: Session = Depends(get_session)):
    client = session.get(Client, client_id)
    if not client or client.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Client not found"
        )

    # Eagerly load related data to avoid N+1 queries
    problems_query = (
        select(ClientProblem)
        .options(
            selectinload(ClientProblem.problem),  # type: ignore
            selectinload(ClientProblem.modifier_domain),  # type: ignore
            selectinload(ClientProblem.modifier_type),  # type: ignore
            selectinload(ClientProblem.selected_symptoms).selectinload(  # type: ignore
                ClientProblemSymptom.symptom  # type: ignore
            ),
            selectinload(ClientProblem.interventions).selectinload(  # type: ignore
                CareIntervention.category  # type: ignore
            ),
            selectinload(ClientProblem.interventions).selectinload(  # type: ignore
                CareIntervention.target  # type: ignore
            ),
        )
        .where(ClientProblem.client_id == client_id)
        .where(ClientProblem.is_active == True)  # noqa: E712
        .where(ClientProblem.deleted_at == None)  # noqa: E711
    )
    active_problems_db = session.exec(problems_query).all()

    active_problems_with_details = []
    for problem in active_problems_db:
        latest_score = session.exec(
            select(OutcomeScore)
            .where(OutcomeScore.client_problem_id == problem.client_problem_id)
            .order_by(desc(OutcomeScore.date_recorded))  # type: ignore
        ).first()

        problem_details = ClientProblemReadWithDetails.model_validate(problem)
        problem_details.latest_score = latest_score  # type: ignore
        active_problems_with_details.append(problem_details)

    client_read = ClientRead.model_validate(client)
    return CarePlan(client=client_read, active_problems=active_problems_with_details)
