from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from ..database import get_session
from ..models import (
    ClientProblem,
    OutcomeScore,
    OutcomeRatingBehavior,
    OutcomeRatingKnowledge,
    OutcomeRatingStatus,
    OutcomePhase,
)
from ..schemas import OutcomeScoreCreate

router = APIRouter(prefix="/clients", tags=["assessments"])


@router.post(
    "/{client_id}/problems/{client_problem_id}/scores",
    status_code=status.HTTP_201_CREATED,
)
def create_outcome_score(
    client_id: int,
    client_problem_id: int,
    score_data: OutcomeScoreCreate,
    session: Session = Depends(get_session),
):
    problem = session.get(ClientProblem, client_problem_id)
    if not problem or problem.client_id != client_id or problem.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Client problem not found"
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
        client_problem_id=client_problem_id, **score_data.model_dump()
    )
    session.add(new_score)
    session.commit()
    session.refresh(new_score)
    return new_score
