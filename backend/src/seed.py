from sqlmodel import Session, select

from .database import engine, create_db_and_tables
from .models import (
    OmahaDomain,
    OmahaProblem,
    Symptom,
    OutcomePhase,
    InterventionCategory,
    InterventionTarget,
    ModifierStatus,
    ModifierSubject,
)


def seed_database():
    with Session(engine) as session:
        # Check if domains are already seeded
        if session.exec(select(OmahaDomain)).first():
            print("Database already seeded.")
            return

        print("Seeding database with initial data...")

        # Create Domains
        domain_env = OmahaDomain(name="Environmental")
        domain_psy = OmahaDomain(name="Psychosocial")
        domain_phy = OmahaDomain(name="Physiological")
        domain_hrb = OmahaDomain(name="Health-related Behaviors")

        session.add_all([domain_env, domain_psy, domain_phy, domain_hrb])
        session.commit()

        if (
            domain_env.domain_id is None
            or domain_env.name is None
            or domain_psy.domain_id is None
            or domain_phy.domain_id is None
            or domain_hrb.domain_id is None
        ):
            raise ValueError("Domain IDs should not be None after commit.")

        # Create Problems
        problems = [
            OmahaProblem(domain_id=domain_env.domain_id, name="Income"),
            OmahaProblem(domain_id=domain_env.domain_id, name="Sanitation"),
            OmahaProblem(domain_id=domain_psy.domain_id, name="Social contact"),
            OmahaProblem(domain_id=domain_phy.domain_id, name="Pain"),
            OmahaProblem(domain_id=domain_phy.domain_id, name="Respiration"),
            OmahaProblem(domain_id=domain_hrb.domain_id, name="Nutrition"),
            OmahaProblem(
                domain_id=domain_hrb.domain_id,
                name="Sleep and rest patterns",
            ),
        ]
        session.add_all(problems)
        session.commit()

        # Find problems to add symptoms to
        pain_problem = session.exec(select(OmahaProblem).where(OmahaProblem.name == "Pain")).one()
        nutrition_problem = session.exec(select(OmahaProblem).where(OmahaProblem.name == "Nutrition")).one()

        # Create Symptoms
        symptoms = [
            Symptom(problem_id=pain_problem.problem_id, description="Reports sharp, localized pain"),
            Symptom(problem_id=pain_problem.problem_id, description="Grimaces or guards a body part"),
            Symptom(problem_id=pain_problem.problem_id, description="Cries or moans"),
            Symptom(problem_id=nutrition_problem.problem_id, description="Underweight/overweight"),
            Symptom(problem_id=nutrition_problem.problem_id, description="Reports poor appetite"),
        ]
        session.add_all(symptoms)

        # Create Intervention Targets
        targets = [
            InterventionTarget(name="Medication administration"),
            InterventionTarget(name="Wound care"),
            InterventionTarget(name="Behavioral therapy"),
            InterventionTarget(name="Family counseling"),
            InterventionTarget(name="Dietary guidance"),
        ]
        session.add_all(targets)

        # Create Modifier Statuses
        statuses = [
            ModifierStatus(name="Actual"),
            ModifierStatus(name="Potential"),
            ModifierStatus(name="Health Promotion"),
        ]
        session.add_all(statuses)

        # Create Modifier Subjects
        subjects = [
            ModifierSubject(name="Individual"),
            ModifierSubject(name="Family"),
            ModifierSubject(name="Community"),
        ]
        session.add_all(subjects)

        # Create Intervention Categories
        categories = [
            InterventionCategory(name="Teaching, Guidance, and Counseling"),
            InterventionCategory(name="Treatments and Procedures"),
            InterventionCategory(name="Case Management"),
            InterventionCategory(name="Surveillance"),
        ]
        session.add_all(categories)

        # Create Outcome Phases
        phases = [
            OutcomePhase(name="Admission"),
            OutcomePhase(name="Interim"),
            OutcomePhase(name="Discharge"),
        ]
        session.add_all(phases)

        session.commit()
        print("Seeding complete.")


if __name__ == "__main__":
    print("Initializing database...")
    create_db_and_tables()
    seed_database()
    print("Database initialization finished.")
