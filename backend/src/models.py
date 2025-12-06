from datetime import date, datetime
from typing import List

from sqlmodel import Field, Relationship, SQLModel


class OmahaDomain(SQLModel, table=True):
    domain_id: int = Field(default=None, primary_key=True)
    name: str

    problems: List["OmahaProblem"] = Relationship(back_populates="domain")


class OmahaProblem(SQLModel, table=True):
    problem_id: int = Field(default=None, primary_key=True)
    name: str
    domain_id: int = Field(foreign_key="omahadomain.domain_id")

    domain: OmahaDomain = Relationship(back_populates="problems")


class InterventionTarget(SQLModel, table=True):
    target_id: int = Field(default=None, primary_key=True)
    name: str


class ModifierStatus(SQLModel, table=True):
    status_id: int = Field(default=None, primary_key=True)
    name: str


class ModifierSubject(SQLModel, table=True):
    subject_id: int = Field(default=None, primary_key=True)
    name: str


class Client(SQLModel, table=True):
    client_id: int = Field(default=None, primary_key=True)
    first_name: str
    last_name: str
    date_of_birth: date

    problems: List["ClientProblem"] = Relationship(back_populates="client")


class ClientProblem(SQLModel, table=True):
    client_problem_id: int | None = Field(default=None, primary_key=True)
    client_id: int = Field(foreign_key="client.client_id")
    problem_id: int = Field(foreign_key="omahaproblem.problem_id")
    status_id: int = Field(foreign_key="modifierstatus.status_id")
    subject_id: int = Field(foreign_key="modifiersubject.subject_id")
    symptoms: str | None = None  # Comma-separated
    active: bool = Field(default=True)

    client: Client = Relationship(back_populates="problems")
    problem: "OmahaProblem" = Relationship()
    modifier_status: "ModifierStatus" = Relationship()
    modifier_subject: "ModifierSubject" = Relationship()
    scores: List["OutcomeScore"] = Relationship(back_populates="client_problem")
    interventions: List["CareIntervention"] = Relationship(
        back_populates="client_problem"
    )


class OutcomeScore(SQLModel, table=True):
    outcome_score_id: int | None = Field(default=None, primary_key=True)
    client_problem_id: int = Field(foreign_key="clientproblem.client_problem_id")
    rating_knowledge: int
    rating_behavior: int
    rating_status: int
    date_recorded: datetime = Field(default_factory=datetime.utcnow)

    client_problem: ClientProblem = Relationship(back_populates="scores")


class CareIntervention(SQLModel, table=True):
    intervention_id: int | None = Field(default=None, primary_key=True)
    client_problem_id: int = Field(foreign_key="clientproblem.client_problem_id")
    target_id: int = Field(foreign_key="interventiontarget.target_id")
    cat_teaching: bool = Field(default=False)
    cat_treatments: bool = Field(default=False)
    cat_casemgmt: bool = Field(default=False)
    cat_surveillance: bool = Field(default=False)
    specific_details: str

    client_problem: ClientProblem = Relationship(back_populates="interventions")
    target: InterventionTarget = Relationship()
