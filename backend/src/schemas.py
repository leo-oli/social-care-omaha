from datetime import date, datetime
from typing import List

from sqlmodel import SQLModel

from .models import (
    Client,
    InterventionTarget,
    ModifierStatus,
    ModifierSubject,
    OmahaProblem,
)


# Pydantic models for request/response
class ClientCreate(SQLModel):
    first_name: str
    last_name: str
    date_of_birth: date


class ClientProblemCreate(SQLModel):
    client_id: int
    problem_id: int
    status_id: int
    subject_id: int
    symptoms: str | None = None
    rating_knowledge: int | None = None
    rating_behavior: int | None = None
    rating_status: int | None = None


class CareInterventionCreate(SQLModel):
    client_problem_id: int
    target_id: int
    cat_teaching: bool = False
    cat_treatments: bool = False
    cat_casemgmt: bool = False
    cat_surveillance: bool = False
    specific_details: str


# Response Models
class OutcomeScoreRead(SQLModel):
    rating_knowledge: int
    rating_behavior: int
    rating_status: int
    date_recorded: datetime


class CareInterventionRead(SQLModel):
    target: InterventionTarget
    cat_teaching: bool
    cat_treatments: bool
    cat_casemgmt: bool
    cat_surveillance: bool
    specific_details: str


class ClientProblemRead(SQLModel):
    client_problem_id: int
    problem: OmahaProblem
    modifier_status: ModifierStatus
    modifier_subject: ModifierSubject
    symptoms: str | None
    active: bool
    latest_score: OutcomeScoreRead | None = None
    interventions: List[CareInterventionRead] = []


class CarePlan(SQLModel):
    client: Client
    active_problems: List[ClientProblemRead]
