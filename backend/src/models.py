import uuid
from datetime import date, datetime, timezone

from sqlmodel import Field, Relationship, SQLModel, Column, DateTime

# ==========================================
# 1. STATIC TABLES (Taxonomy)
# ==========================================


class OutcomePhase(SQLModel, table=True):
    __tablename__ = "outcome_phase"  # type: ignore
    phase_id: int | None = Field(default=None, primary_key=True)
    phase_name: str = Field(unique=True)
    phase_description: str | None = None


# ==========================================
# 1. STATIC TABLES (Taxonomy)
# ==========================================


class OmahaDomain(SQLModel, table=True):
    __tablename__ = "omaha_domain"  # type: ignore
    domain_id: int | None = Field(default=None, primary_key=True)
    domain_name: str = Field(unique=True)
    domain_description: str | None = None

    problems: list["OmahaProblem"] = Relationship(back_populates="domain")


class OmahaProblem(SQLModel, table=True):
    __tablename__ = "omaha_problem"  # type: ignore
    problem_id: int | None = Field(default=None, primary_key=True)
    domain_id: int = Field(foreign_key="omaha_domain.domain_id")
    problem_name: str
    problem_description: str | None = None

    domain: OmahaDomain = Relationship(back_populates="problems")
    possible_symptoms: list["Symptom"] = Relationship(back_populates="problem")


class Symptom(SQLModel, table=True):
    __tablename__ = "symptom"  # type: ignore
    symptom_id: int | None = Field(default=None, primary_key=True)
    problem_id: int = Field(foreign_key="omaha_problem.problem_id")
    symptom_description: str | None = None

    problem: OmahaProblem = Relationship(back_populates="possible_symptoms")


class InterventionTarget(SQLModel, table=True):
    __tablename__ = "intervention_target"  # type: ignore
    target_id: int | None = Field(default=None, primary_key=True)
    target_name: str = Field(unique=True)
    target_description: str | None = None


class InterventionCategory(SQLModel, table=True):
    __tablename__ = "intervention_category"  # type: ignore
    category_id: int | None = Field(default=None, primary_key=True)
    category_name: str = Field(unique=True)
    category_description: str | None = None


class ModifierDomain(SQLModel, table=True):
    __tablename__ = "modifier_domain"  # type: ignore
    modifier_domain_id: int | None = Field(default=None, primary_key=True)
    modifier_domain_name: str = Field(unique=True)
    modifier_domain_description: str | None = None


class ModifierType(SQLModel, table=True):
    __tablename__ = "modifier_type"  # type: ignore
    modifier_type_id: int | None = Field(default=None, primary_key=True)
    modifier_type_name: str = Field(unique=True)
    modifier_type_description: str | None = None


class OutcomeRatingStatus(SQLModel, table=True):
    __tablename__ = "outcome_rating_status"  # type: ignore
    rating_status_id: int | None = Field(default=None, primary_key=True)
    rating_status_label: str
    rating_status_description: str | None = None


class OutcomeRatingKnowledge(SQLModel, table=True):
    __tablename__ = "outcome_rating_knowledge"  # type: ignore
    rating_knowledge_id: int | None = Field(default=None, primary_key=True)
    rating_knowledge_label: str
    rating_knowledge_description: str | None = None


class OutcomeRatingBehavior(SQLModel, table=True):
    __tablename__ = "outcome_rating_behavior"  # type: ignore
    rating_behavior_id: int | None = Field(default=None, primary_key=True)
    rating_behavior_label: str
    rating_behavior_description: str | None = None


# ==========================================
# 2. DYNAMIC TABLES (Patient & Clinical Data)
# ==========================================


class PatientPII(SQLModel, table=True):
    __tablename__ = "patient_pii"  # type: ignore
    patient_pii_id: int | None = Field(default=None, primary_key=True)
    patient_id: int = Field(foreign_key="patient.patient_id", unique=True)
    first_name: str  # Note: Handle encryption in application logic
    last_name: str  # Note: Handle encryption in application logic
    date_of_birth: date
    tin: str = Field(unique=True, max_length=11)
    phone_number: str | None = None
    address: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime, onupdate=lambda: datetime.now(timezone.utc)),
    )

    patient: "Patient" = Relationship(back_populates="pii")


class ConsentDefinition(SQLModel, table=True):
    __tablename__ = "consent_definition"  # type: ignore
    consent_definition_id: int | None = Field(default=None, primary_key=True)
    consent_code: str = Field(unique=True)
    consent_title: str
    consent_description: str | None = None
    is_mandatory: bool = Field(default=False)


class PatientConsent(SQLModel, table=True):
    __tablename__ = "patient_consent"  # type: ignore
    consent_id: int | None = Field(default=None, primary_key=True)
    patient_id: int = Field(foreign_key="patient.patient_id")
    consent_definition_id: int = Field(
        foreign_key="consent_definition.consent_definition_id"
    )
    has_consented: bool
    ip_address: str | None = None
    granted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    revoked_at: datetime | None = None

    patient: "Patient" = Relationship(back_populates="consents")
    definition: ConsentDefinition = Relationship()


class Patient(SQLModel, table=True):
    __tablename__ = "patient"  # type: ignore
    patient_id: int | None = Field(default=None, primary_key=True)
    patient_uuid: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True)
    is_active: bool = Field(default=True)
    group_office_note_id: int | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime, onupdate=lambda: datetime.now(timezone.utc)),
    )
    deleted_at: datetime | None = None

    pii: PatientPII | None = Relationship(back_populates="patient")
    consents: list["PatientConsent"] = Relationship(back_populates="patient")
    problems: list["PatientProblem"] = Relationship(back_populates="patient")


class PatientProblem(SQLModel, table=True):
    __tablename__ = "patient_problem"  # type: ignore
    patient_problem_id: int | None = Field(default=None, primary_key=True)
    patient_id: int = Field(foreign_key="patient.patient_id")
    problem_id: int = Field(foreign_key="omaha_problem.problem_id")
    modifier_domain_id: int = Field(foreign_key="modifier_domain.modifier_domain_id")
    modifier_type_id: int = Field(foreign_key="modifier_type.modifier_type_id")
    is_active: bool = Field(default=True)

    # Audit timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime, onupdate=lambda: datetime.now(timezone.utc)),
    )
    deleted_at: datetime | None = None

    patient: Patient = Relationship(back_populates="problems")
    problem: OmahaProblem = Relationship()
    modifier_domain: ModifierDomain = Relationship()
    modifier_type: ModifierType = Relationship()

    # Relationships to child tables
    selected_symptoms: list["PatientProblemSymptom"] = Relationship(
        back_populates="patient_problem"
    )
    scores: list["OutcomeScore"] = Relationship(back_populates="patient_problem")
    interventions: list["CareIntervention"] = Relationship(
        back_populates="patient_problem"
    )


class PatientProblemSymptom(SQLModel, table=True):
    __tablename__ = "patient_problem_symptom"  # type: ignore
    patient_problem_symptom_id: int | None = Field(default=None, primary_key=True)
    patient_problem_id: int = Field(foreign_key="patient_problem.patient_problem_id")
    symptom_id: int = Field(foreign_key="symptom.symptom_id")
    symptom_comment: str | None = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime, onupdate=lambda: datetime.now(timezone.utc)),
    )
    deleted_at: datetime | None = None

    patient_problem: PatientProblem = Relationship(back_populates="selected_symptoms")
    symptom: Symptom = Relationship()


class OutcomeScore(SQLModel, table=True):
    __tablename__ = "outcome_score"  # type: ignore
    score_id: int | None = Field(default=None, primary_key=True)
    patient_problem_id: int = Field(foreign_key="patient_problem.patient_problem_id")

    phase_id: int = Field(foreign_key="outcome_phase.phase_id")
    rating_status_id: int = Field(foreign_key="outcome_rating_status.rating_status_id")
    rating_knowledge_id: int = Field(
        foreign_key="outcome_rating_knowledge.rating_knowledge_id"
    )
    rating_behavior_id: int = Field(
        foreign_key="outcome_rating_behavior.rating_behavior_id"
    )

    date_recorded: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime, onupdate=lambda: datetime.now(timezone.utc)),
    )
    deleted_at: datetime | None = None

    patient_problem: PatientProblem = Relationship(back_populates="scores")
    phase: OutcomePhase = Relationship()
    status_rating: OutcomeRatingStatus = Relationship()
    knowledge_rating: OutcomeRatingKnowledge = Relationship()
    behavior_rating: OutcomeRatingBehavior = Relationship()


class CareIntervention(SQLModel, table=True):
    __tablename__ = "care_intervention"  # type: ignore
    intervention_id: int | None = Field(default=None, primary_key=True)
    patient_problem_id: int = Field(foreign_key="patient_problem.patient_problem_id")

    category_id: int = Field(foreign_key="intervention_category.category_id")
    target_id: int = Field(foreign_key="intervention_target.target_id")
    specific_details: str | None = None

    date_performed: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime, onupdate=lambda: datetime.now(timezone.utc)),
    )
    deleted_at: datetime | None = None

    patient_problem: PatientProblem = Relationship(back_populates="interventions")
    category: InterventionCategory = Relationship()
    target: InterventionTarget = Relationship()
