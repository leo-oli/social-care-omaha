from datetime import date, datetime

from sqlmodel import SQLModel

from .models import (
    OutcomePhase,
    Client,
    InterventionTarget,
    InterventionCategory,
    ModifierDomain,
    ModifierType,
    OmahaProblem,
    Symptom,
    OutcomeRatingStatus,
    OutcomeRatingKnowledge,
    OutcomeRatingBehavior,
)


class ClientCreate(SQLModel):
    first_name: str
    last_name: str
    date_of_birth: date


class ClientProblemCreate(SQLModel):
    client_id: int
    problem_id: int
    modifier_domain_id: int
    modifier_type_id: int
    symptom_ids: list[int] | None = None
    rating_knowledge: int | None = None
    rating_behavior: int | None = None
    rating_status: int | None = None


class CareInterventionCreate(SQLModel):
    client_problem_id: int
    target_id: int
    category_id: int
    specific_details: str | None = None


# Response Models
class OutcomeScoreRead(SQLModel):
    phase: OutcomePhase
    status_rating: OutcomeRatingStatus
    knowledge_rating: OutcomeRatingKnowledge
    behavior_rating: OutcomeRatingBehavior
    date_recorded: datetime


class ClientProblemSymptomRead(SQLModel):
    id: int
    symptom: Symptom


class CareInterventionRead(SQLModel):
    target: InterventionTarget
    category: InterventionCategory
    specific_details: str | None


class ClientProblemRead(SQLModel):
    client_problem_id: int
    problem: OmahaProblem
    modifier_domain: ModifierDomain
    modifier_type: ModifierType
    active: bool
    selected_symptoms: list[ClientProblemSymptomRead] = []
    latest_score: OutcomeScoreRead | None = None
    interventions: list[CareInterventionRead] = []


class CarePlan(SQLModel):
    client: Client
    active_problems: list[ClientProblemRead]
