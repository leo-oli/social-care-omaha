from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import (
    Client,
    ClientProblem,
    OutcomeScore,
    CareIntervention,
    InterventionTarget,
)
from ..schemas import (
    CarePlan,
    ClientProblemRead,
    OutcomeScoreRead,
    CareInterventionRead,
)

router = APIRouter(prefix="/clients", tags=["care-plans"])


@router.get("/{client_id}/care-plan", response_model=CarePlan)
def get_care_plan(client_id: int, session: Session = Depends(get_session)):
    client = session.get(Client, client_id)
    if not client:
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
            .order_by(OutcomeScore.date_recorded.desc())
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

        interventions_read = []
        for i in interventions_db:
            intervention_dict = i.model_dump()
            intervention_dict["target"] = session.get(InterventionTarget, i.target_id)
            interventions_read.append(
                CareInterventionRead.model_validate(intervention_dict)
            )

        if cp.client_problem_id is not None:
            problem_read = ClientProblemRead(
                client_problem_id=cp.client_problem_id,
                problem=cp.problem,
                modifier_status=cp.modifier_status,
                modifier_subject=cp.modifier_subject,
                symptoms=cp.symptoms,
                active=cp.active,
                latest_score=latest_score_read,
                interventions=interventions_read,
            )
            care_plan_problems.append(problem_read)

    return CarePlan(client=client, active_problems=care_plan_problems)
