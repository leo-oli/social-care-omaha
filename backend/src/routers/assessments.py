from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..database import get_session
from ..models import ClientProblem, Client, OmahaProblem, ModifierStatus, OutcomeScore
from ..schemas import ClientProblemCreate

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.post("", response_model=ClientProblem)
def create_assessment(
    assessment_data: ClientProblemCreate, session: Session = Depends(get_session)
):
    modifier_status = session.get(ModifierStatus, assessment_data.status_id)
    if not modifier_status:
        raise HTTPException(status_code=404, detail="Modifier Status not found")

    if modifier_status.name == "Actual" and not assessment_data.symptoms:
        raise HTTPException(
            status_code=400, detail="Symptoms are required for 'Actual' problems."
        )

    # Check if client and problem exist
    if not session.get(Client, assessment_data.client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    if not session.get(OmahaProblem, assessment_data.problem_id):
        raise HTTPException(status_code=404, detail="Omaha Problem not found")

    client_problem = ClientProblem.model_validate(assessment_data)
    session.add(client_problem)
    session.commit()
    session.refresh(client_problem)

    # Create initial outcome score if ratings are provided
    if (
        assessment_data.rating_knowledge is not None
        and assessment_data.rating_behavior is not None
        and assessment_data.rating_status is not None
        and client_problem.client_problem_id is not None
    ):
        score = OutcomeScore(
            client_problem_id=client_problem.client_problem_id,
            rating_knowledge=assessment_data.rating_knowledge,
            rating_behavior=assessment_data.rating_behavior,
            rating_status=assessment_data.rating_status,
        )
        session.add(score)
        session.commit()

    session.refresh(client_problem)
    return client_problem
