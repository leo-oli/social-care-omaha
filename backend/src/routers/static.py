from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import (
    OmahaDomain,
    OmahaProblem,
    InterventionCategory,
    InterventionTarget,
    ModifierType,
    ModifierDomain,
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


@router.get("/modifier-types", response_model=list[ModifierType])
def get_modifier_types(session: Session = Depends(get_session)):
    return session.exec(select(ModifierType)).all()


@router.get("/modifier-domains", response_model=list[ModifierDomain])
def get_modifier_domains(session: Session = Depends(get_session)):
    return session.exec(select(ModifierDomain)).all()
