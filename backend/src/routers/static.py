from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..models import (
    OmahaDomain,
    OmahaProblem,
    Symptom,
    InterventionCategory,
    InterventionTarget,
    ModifierType,
    ModifierDomain,
    OutcomePhase,
    OutcomeRatingStatus,
    OutcomeRatingKnowledge,
    OutcomeRatingBehavior,
    ConsentDefinition,
)
from ..schemas import (
    OmahaDomainRead,
    OmahaProblemRead,
    SymptomRead,
    InterventionCategoryRead,
    InterventionTargetRead,
    ModifierTypeRead,
    ModifierDomainRead,
    OutcomePhaseRead,
    OutcomeRatingRead,
    ConsentDefinitionRead,
)


router = APIRouter(prefix="/static", tags=["static"])


@router.get("/domains", response_model=list[OmahaDomainRead])
def get_domains(session: Session = Depends(get_session)):
    return session.exec(select(OmahaDomain)).all()


@router.get("/problems", response_model=list[OmahaProblemRead])
def get_problems(domain_id: int | None = None, session: Session = Depends(get_session)):
    if domain_id:
        problems = session.exec(
            select(OmahaProblem).where(OmahaProblem.domain_id == domain_id)
        ).all()
    else:
        problems = session.exec(select(OmahaProblem)).all()
    if not problems:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No problems found"
        )
    return problems


@router.get("/problems/{problem_id}/symptoms", response_model=list[SymptomRead])
def get_symptoms_for_problem(problem_id: int, session: Session = Depends(get_session)):
    symptoms = session.exec(
        select(Symptom).where(Symptom.problem_id == problem_id)
    ).all()
    if not symptoms:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No symptoms found for this problem",
        )
    return symptoms


@router.get("/modifier-domains", response_model=list[ModifierDomainRead])
def get_modifier_domains(session: Session = Depends(get_session)):
    return session.exec(select(ModifierDomain)).all()


@router.get("/modifier-types", response_model=list[ModifierTypeRead])
def get_modifier_types(session: Session = Depends(get_session)):
    return session.exec(select(ModifierType)).all()


@router.get("/intervention-categories", response_model=list[InterventionCategoryRead])
def get_intervention_categories(session: Session = Depends(get_session)):
    return session.exec(select(InterventionCategory)).all()


@router.get("/intervention-targets", response_model=list[InterventionTargetRead])
def get_intervention_targets(session: Session = Depends(get_session)):
    return session.exec(select(InterventionTarget)).all()


@router.get("/outcome-phases", response_model=list[OutcomePhaseRead])
def get_outcome_phases(session: Session = Depends(get_session)):
    return session.exec(select(OutcomePhase)).all()


@router.get("/outcome-ratings", response_model=OutcomeRatingRead)
def get_outcome_ratings(session: Session = Depends(get_session)):
    status_ratings = session.exec(select(OutcomeRatingStatus)).all()
    knowledge_ratings = session.exec(select(OutcomeRatingKnowledge)).all()
    behavior_ratings = session.exec(select(OutcomeRatingBehavior)).all()
    return OutcomeRatingRead(
        status=list(status_ratings),
        knowledge=list(knowledge_ratings),
        behavior=list(behavior_ratings),
    )


@router.get("/consent-definitions", response_model=list[ConsentDefinitionRead])
def get_consent_definitions(session: Session = Depends(get_session)):
    return session.exec(select(ConsentDefinition)).all()
