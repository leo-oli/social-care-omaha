from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import (
    OmahaDomain,
    OmahaProblem,
    InterventionCategory,
    InterventionTarget,
    ModifierStatus,
    ModifierSubject,
)

router = APIRouter(prefix="/static", tags=["static"])


@router.get("/domains", response_model=list[OmahaDomain])
def get_domains(session: Session = Depends(get_session)):
    return session.exec(select(OmahaDomain)).all()


@router.get("/problems/{domain_id}", response_model=list[OmahaProblem])
def get_problems_by_domain(domain_id: int, session: Session = Depends(get_session)):
    problems = session.exec(
        select(OmahaProblem).where(OmahaProblem.domain_id == domain_id)
    ).all()
    if not problems:
        raise HTTPException(status_code=404, detail="No problems found for this domain")
    return problems


@router.get("/targets", response_model=list[InterventionTarget])
def get_targets(session: Session = Depends(get_session)):
    return session.exec(select(InterventionTarget)).all()


@router.get("/intervention-categories", response_model=list[InterventionCategory])
def get_intervention_categories(session: Session = Depends(get_session)):
    return session.exec(select(InterventionCategory)).all()


@router.get("/modifier-statuses", response_model=list[ModifierStatus])
def get_modifier_statuses(session: Session = Depends(get_session)):
    return session.exec(select(ModifierStatus)).all()


@router.get("/modifier-subjects", response_model=list[ModifierSubject])
def get_modifier_subjects(session: Session = Depends(get_session)):
    return session.exec(select(ModifierSubject)).all()
