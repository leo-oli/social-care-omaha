from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..models import (
    PatientProblem,
    OutcomeScore,
    OutcomeRatingBehavior,
    OutcomeRatingKnowledge,
    OutcomeRatingStatus,
    OutcomePhase,
)
from ..schemas import OutcomeScoreCreate, OutcomeScoreRead

router = APIRouter(prefix="/patients", tags=["assessments"])


@router.post(
    "/{patient_id}/problems/{patient_problem_id}/scores",
    status_code=status.HTTP_201_CREATED,
)
def create_outcome_score(
    patient_id: int,
    patient_problem_id: int,
    score_data: OutcomeScoreCreate,
    session: Session = Depends(get_session),
):
    problem = session.get(PatientProblem, patient_problem_id)
    if not problem or problem.patient_id != patient_id or problem.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient problem not found"
        )

    if not session.get(OutcomePhase, score_data.phase_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phase_id.",
        )

    # Validate ratings (Must be 1-5 and exist in DB)
    if not (1 <= score_data.rating_knowledge_id <= 5) or not session.get(
        OutcomeRatingKnowledge, score_data.rating_knowledge_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid rating_knowledge_id. Must be between 1 and 5.",
        )

    if not (1 <= score_data.rating_behavior_id <= 5) or not session.get(
        OutcomeRatingBehavior, score_data.rating_behavior_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid rating_behavior_id. Must be between 1 and 5.",
        )

    if not (1 <= score_data.rating_status_id <= 5) or not session.get(
        OutcomeRatingStatus, score_data.rating_status_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid rating_status_id. Must be between 1 and 5.",
        )

    new_score = OutcomeScore(
        patient_problem_id=patient_problem_id, **score_data.model_dump()
    )
    session.add(new_score)
    session.commit()
    session.refresh(new_score)
    return new_score


@router.get(
    "/{patient_id}/problems/{patient_problem_id}/scores",
    response_model=list[OutcomeScoreRead],
)
def get_problem_scores(
    patient_id: int,
    patient_problem_id: int,
    session: Session = Depends(get_session),
):
    problem = session.get(PatientProblem, patient_problem_id)
    if not problem or problem.patient_id != patient_id or problem.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient problem not found"
        )

    if not problem.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient problem is not active",
        )

    scores = session.exec(
        select(OutcomeScore)
        .where(OutcomeScore.patient_problem_id == patient_problem_id)
        .where(OutcomeScore.deleted_at == None)  # noqa: E711
        .order_by(OutcomeScore.date_recorded.desc())  # type: ignore
    ).all()
    return scores
