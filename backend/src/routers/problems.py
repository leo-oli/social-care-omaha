from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..models import (
    Patient,
    PatientProblem,
    PatientProblemSymptom,
    OmahaProblem,
    ModifierDomain,
    ModifierType,
    Symptom,
)
from ..schemas import (
    PatientProblemCreate,
    PatientProblemRead,
    PatientProblemUpdate,
    PatientProblemSymptomCreate,
)

router = APIRouter(prefix="/patients", tags=["problems"])


@router.get("/{patient_id}/problems", response_model=list[PatientProblemRead])
def get_patient_problems(patient_id: int, session: Session = Depends(get_session)):
    problems = session.exec(
        select(PatientProblem)
        .where(PatientProblem.patient_id == patient_id)
        .where(PatientProblem.is_active == True)  # noqa: E712
        .where(PatientProblem.deleted_at == None)  # noqa: E711
    ).all()
    return problems


@router.post(
    "/{patient_id}/problems",
    response_model=PatientProblemRead,
    status_code=status.HTTP_201_CREATED,
)
def create_patient_problem(
    patient_id: int,
    problem_data: PatientProblemCreate,
    session: Session = Depends(get_session),
):
    # Validate patient exists
    patient = session.get(Patient, patient_id)
    if not patient or patient.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found"
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

    new_problem = PatientProblem(patient_id=patient_id, **problem_data.model_dump())
    session.add(new_problem)
    session.commit()
    session.refresh(new_problem)
    return new_problem


@router.patch(
    "/{patient_id}/problems/{patient_problem_id}",
    response_model=PatientProblemRead,
)
def update_patient_problem(
    patient_id: int,
    patient_problem_id: int,
    problem_data: PatientProblemUpdate,
    session: Session = Depends(get_session),
):
    problem = session.get(PatientProblem, patient_problem_id)
    if not problem or problem.patient_id != patient_id or problem.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient problem not found"
        )

    problem.is_active = problem_data.is_active
    session.add(problem)
    session.commit()
    session.refresh(problem)
    return problem


@router.post(
    "/{patient_id}/problems/{patient_problem_id}/symptoms",
    status_code=status.HTTP_201_CREATED,
)
def add_symptom_to_problem(
    patient_id: int,
    patient_problem_id: int,
    symptom_data: PatientProblemSymptomCreate,
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

    # Check for duplicates
    existing_symptom = session.exec(
        select(PatientProblemSymptom)
        .where(PatientProblemSymptom.patient_problem_id == patient_problem_id)
        .where(PatientProblemSymptom.symptom_id == symptom_data.symptom_id)
        .where(PatientProblemSymptom.deleted_at == None)  # noqa: E711
    ).first()

    if existing_symptom:
        return {"message": "Symptom already associated with this problem"}

    symptom = session.get(Symptom, symptom_data.symptom_id)
    if not symptom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Symptom not found"
        )

    new_symptom = PatientProblemSymptom(
        patient_problem_id=patient_problem_id,
        symptom_id=symptom_data.symptom_id,
        symptom_comment=symptom_data.symptom_comment,
    )
    session.add(new_symptom)
    session.commit()
    return {"message": "Symptom added successfully"}
