from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from sqlalchemy import desc

from ..database import get_session
from ..models import (
    CareIntervention,
    Patient,
    PatientProblem,
    PatientProblemSymptom,
    OutcomeScore,
)  # type: ignore
from ..schemas import CarePlan, PatientProblemReadWithDetails, PatientRead

router = APIRouter(prefix="/patients", tags=["care-plans"])


@router.get("/{patient_id}/care-plan", response_model=CarePlan)
def get_care_plan(patient_id: int, session: Session = Depends(get_session)):
    patient = session.get(Patient, patient_id)
    if not patient or patient.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found"
        )

    # Eagerly load related data to avoid N+1 queries
    problems_query = (
        select(PatientProblem)
        .options(
            selectinload(PatientProblem.problem),  # type: ignore
            selectinload(PatientProblem.modifier_domain),  # type: ignore
            selectinload(PatientProblem.modifier_type),  # type: ignore
            selectinload(PatientProblem.selected_symptoms).selectinload(  # type: ignore
                PatientProblemSymptom.symptom  # type: ignore
            ),
            selectinload(PatientProblem.interventions).selectinload(  # type: ignore
                CareIntervention.category  # type: ignore
            ),
            selectinload(PatientProblem.interventions).selectinload(  # type: ignore
                CareIntervention.target  # type: ignore
            ),
        )
        .where(PatientProblem.patient_id == patient_id)
        .where(PatientProblem.is_active == True)  # noqa: E712
        .where(PatientProblem.deleted_at == None)  # noqa: E711
    )
    active_problems_db = session.exec(problems_query).all()

    active_problems_with_details = []
    for problem in active_problems_db:
        latest_score = session.exec(
            select(OutcomeScore)
            .where(OutcomeScore.patient_problem_id == problem.patient_problem_id)
            .order_by(desc(OutcomeScore.date_recorded))  # type: ignore
        ).first()

        problem_details = PatientProblemReadWithDetails.model_validate(problem)
        problem_details.latest_score = latest_score  # type: ignore
        active_problems_with_details.append(problem_details)

    patient_read = PatientRead.model_validate(patient)
    return CarePlan(patient=patient_read, active_problems=active_problems_with_details)
