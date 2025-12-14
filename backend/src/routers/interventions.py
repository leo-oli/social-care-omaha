from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from ..database import get_session
from ..models import (
    CareIntervention,
    PatientProblem,
    InterventionCategory,
    InterventionTarget,
)
from ..schemas import CareInterventionCreate

router = APIRouter(prefix="/patients", tags=["interventions"])


@router.post(
    "/{patient_id}/problems/{patient_problem_id}/interventions",
    status_code=status.HTTP_201_CREATED,
)
def create_care_intervention(
    patient_id: int,
    patient_problem_id: int,
    intervention_data: CareInterventionCreate,
    session: Session = Depends(get_session),
):
    problem = session.get(PatientProblem, patient_problem_id)
    if not problem or problem.patient_id != patient_id or problem.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient problem not found"
        )

    # Validate foreign keys
    category = session.get(InterventionCategory, intervention_data.category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intervention category not found",
        )

    target = session.get(InterventionTarget, intervention_data.target_id)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intervention target not found",
        )

    new_intervention = CareIntervention(
        patient_problem_id=patient_problem_id, **intervention_data.model_dump()
    )
    session.add(new_intervention)
    session.commit()
    session.refresh(new_intervention)
    return new_intervention
