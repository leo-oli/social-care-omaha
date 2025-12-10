from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Client, ClientProblem, OutcomeScore, CareIntervention
from sqlalchemy import desc
from ..schemas import (
    CarePlan,
    ClientProblemRead,
    OutcomeScoreRead,
    CareInterventionRead,
    ClientProblemSymptomRead,
)

router = APIRouter(prefix="/clients", tags=["care-plans"])


@router.get("/{client_id}/care-plan", response_model=CarePlan)
def get_care_plan(client_id: int, session: Session = Depends(get_session)):
    client = session.get(Client, client_id)
    if not client or client.deleted_at:
        raise HTTPException(status_code=404, detail="Client not found")

    # Get active problems for the client
    active_problems_db = session.exec(
        select(ClientProblem).where(
            ClientProblem.client_id == client_id, ClientProblem.active
        )
    ).all()

    care_plan_problems = []
    for cp in active_problems_db:
        # Get the latest score for each problem
        latest_score_db = session.exec(
            select(OutcomeScore)
            .where(OutcomeScore.client_problem_id == cp.client_problem_id)
            .order_by(desc(OutcomeScore.date_recorded))  # type: ignore
        ).first()

        latest_score_read = (
            OutcomeScoreRead.model_validate(latest_score_db)
            if latest_score_db
            else None
        )

        # Get interventions for each problem
        interventions_db = session.exec(
            select(CareIntervention).where(
                CareIntervention.client_problem_id == cp.client_problem_id
            )
        ).all()

        if cp.client_problem_id is not None:
            problem_read = ClientProblemRead(
                client_problem_id=cp.client_problem_id,
                problem=cp.problem,
                modifier_domain=cp.modifier_domain,
                modifier_type=cp.modifier_type,
                selected_symptoms=[
                    ClientProblemSymptomRead.model_validate(s)
                    for s in cp.selected_symptoms
                ],
                active=cp.active,
                latest_score=latest_score_read,
                interventions=[
                    CareInterventionRead.model_validate(i) for i in interventions_db
                ],
            )
            care_plan_problems.append(problem_read)

    return CarePlan(client=client, active_problems=care_plan_problems)
