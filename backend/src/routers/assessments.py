from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import (
    ClientProblem,
    Client,
    OmahaProblem,
    ModifierStatus,
    OutcomeScore,
    ClientProblemSymptom,
    OutcomePhase,
)
from ..schemas import ClientProblemCreate, ClientProblemRead

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.post("", response_model=ClientProblemRead)
def create_assessment(
    assessment_data: ClientProblemCreate, session: Session = Depends(get_session)
):
    modifier_status = session.get(ModifierStatus, assessment_data.status_id)
    if not modifier_status:
        raise HTTPException(status_code=404, detail="Modifier Status not found")

    if modifier_status.name == "Actual" and not assessment_data.symptom_ids:
        raise HTTPException(
            status_code=400, detail="Symptoms are required for 'Actual' problems."
        )

    # Check if client and problem exist
    if not session.get(Client, assessment_data.client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    if not session.get(OmahaProblem, assessment_data.problem_id):
        raise HTTPException(status_code=404, detail="Omaha Problem not found")

    # Create ClientProblem from schema, excluding non-model fields
    problem_data = assessment_data.model_dump(
        exclude={"symptom_ids", "rating_knowledge", "rating_behavior", "rating_status"}
    )
    client_problem = ClientProblem(**problem_data)
    session.add(client_problem)
    session.commit()
    session.refresh(client_problem)

    # Handle symptom associations
    if assessment_data.symptom_ids and client_problem.client_problem_id:
        for symptom_id in assessment_data.symptom_ids:
            association = ClientProblemSymptom(
                client_problem_id=client_problem.client_problem_id,
                symptom_id=symptom_id,
            )
            session.add(association)

    # Create initial outcome score if ratings are provided
    if (
        assessment_data.rating_knowledge is not None
        and assessment_data.rating_behavior is not None
        and assessment_data.rating_status is not None
        and client_problem.client_problem_id is not None
    ):
        # Get the 'Admission' phase id
        admission_phase = session.exec(
            select(OutcomePhase).where(OutcomePhase.name == "Admission")
        ).first()
        if not admission_phase or not admission_phase.phase_id:
            raise HTTPException(
                status_code=500, detail="Admission phase not found in database."
            )

        score = OutcomeScore(
            phase_id=admission_phase.phase_id,
            client_problem_id=client_problem.client_problem_id,
            rating_knowledge=assessment_data.rating_knowledge,
            rating_behavior=assessment_data.rating_behavior,
            rating_status=assessment_data.rating_status,
        )
        session.add(score)
        session.commit()

    session.refresh(client_problem)
    return client_problem
