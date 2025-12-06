from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import (
    OmahaDomain,
    OmahaProblem,
    InterventionTarget,
    ModifierStatus,
    ModifierSubject,
)

router = APIRouter(prefix="/static", tags=["static"])


@router.get("/domains", response_model=List[OmahaDomain])
def get_domains(session: Session = Depends(get_session)):
    return session.exec(select(OmahaDomain)).all()


@router.get("/problems/{domain_id}", response_model=List[OmahaProblem])
def get_problems_by_domain(domain_id: int, session: Session = Depends(get_session)):
    problems = session.exec(
        select(OmahaProblem).where(OmahaProblem.domain_id == domain_id)
    ).all()
    if not problems:
        raise HTTPException(status_code=404, detail="No problems found for this domain")
    return problems


@router.get("/targets", response_model=List[InterventionTarget])
def get_targets(session: Session = Depends(get_session)):
    return session.exec(select(InterventionTarget)).all()


@router.get("/modifier-statuses", response_model=List[ModifierStatus])
def get_modifier_statuses(session: Session = Depends(get_session)):
    return session.exec(select(ModifierStatus)).all()


@router.get("/modifier-subjects", response_model=List[ModifierSubject])
def get_modifier_subjects(session: Session = Depends(get_session)):
    return session.exec(select(ModifierSubject)).all()
