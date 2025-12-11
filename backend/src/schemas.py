from datetime import date, datetime
from pydantic import EmailStr
from sqlmodel import SQLModel
from .models import (
    OmahaProblem,
    ModifierDomain,
    ModifierType,
    OutcomeRatingStatus,
    OutcomeRatingKnowledge,
    OutcomeRatingBehavior,
)


# ==========================================
# A. STATIC DATA (Read Models)
# ==========================================
class OmahaDomainRead(SQLModel):
    domain_id: int
    domain_name: str
    domain_description: str | None


class OmahaProblemRead(SQLModel):
    problem_id: int
    domain_id: int
    problem_name: str
    problem_description: str | None


class SymptomRead(SQLModel):
    symptom_id: int
    problem_id: int
    symptom_description: str


class ModifierDomainRead(SQLModel):
    modifier_domain_id: int
    modifier_domain_name: str
    modifier_domain_description: str | None


class ModifierTypeRead(SQLModel):
    modifier_type_id: int
    modifier_type_name: str
    modifier_type_description: str | None


class InterventionCategoryRead(SQLModel):
    category_id: int
    category_name: str
    category_description: str | None


class InterventionTargetRead(SQLModel):
    target_id: int
    target_name: str
    target_description: str | None


class OutcomePhaseRead(SQLModel):
    phase_id: int
    phase_name: str
    phase_description: str | None


class OutcomeRatingRead(SQLModel):
    status: list[OutcomeRatingStatus]
    knowledge: list[OutcomeRatingKnowledge]
    behavior: list[OutcomeRatingBehavior]


# ==========================================
# B. CLIENT MANAGEMENT
# ==========================================


class ClientCreate(SQLModel):
    first_name: str
    last_name: str
    date_of_birth: date
    email: EmailStr | None = None
    address: str | None = None
    consent_type: str
    has_consented: bool


class ClientRead(SQLModel):
    client_uuid: str
    client_id: int


class ClientReadDetails(SQLModel):
    client_id: int
    client_uuid: str
    is_active: bool
    created_at: datetime
    updated_at: datetime | None
    deleted_at: datetime | None
    client_pii_id: int
    first_name: str
    last_name: str
    date_of_birth: date
    email: EmailStr | None
    address: str | None


# ==========================================
# C. CLINICAL WORKFLOW
# ==========================================


class ClientProblemCreate(SQLModel):
    problem_id: int
    modifier_domain_id: int
    modifier_type_id: int


class ClientProblemUpdate(SQLModel):
    is_active: bool


class ClientProblemRead(SQLModel):
    client_problem_id: int
    problem: OmahaProblemRead
    modifier_domain: ModifierDomainRead
    modifier_type: ModifierTypeRead
    is_active: bool


class ClientProblemSymptomCreate(SQLModel):
    symptom_id: int
    symptom_comment: str | None = None


class OutcomeScoreCreate(SQLModel):
    phase_id: int
    rating_knowledge_id: int
    rating_behavior_id: int
    rating_status_id: int


class CareInterventionCreate(SQLModel):
    category_id: int
    target_id: int
    specific_details: str | None = None


# ==========================================
# D. CARE PLAN
# ==========================================


class OutcomeScoreRead(SQLModel):
    phase: OutcomePhaseRead
    status_rating: OutcomeRatingStatus
    knowledge_rating: OutcomeRatingKnowledge
    behavior_rating: OutcomeRatingBehavior
    date_recorded: datetime


class ClientProblemSymptomRead(SQLModel):
    client_problem_symptom_id: int
    symptom: SymptomRead
    symptom_comment: str | None


class CareInterventionRead(SQLModel):
    target: InterventionTargetRead
    category: InterventionCategoryRead
    specific_details: str | None


class ClientProblemReadWithDetails(SQLModel):
    client_problem_id: int
    client_id: int
    problem_id: int
    modifier_domain_id: int
    modifier_type_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime | None
    deleted_at: datetime | None
    problem: OmahaProblem
    modifier_domain: ModifierDomain
    modifier_type: ModifierType
    selected_symptoms: list[ClientProblemSymptomRead] = []
    latest_score: OutcomeScoreRead | None = None
    interventions: list[CareInterventionRead] = []


class CarePlan(SQLModel):
    client: ClientRead
    active_problems: list[ClientProblemReadWithDetails]
