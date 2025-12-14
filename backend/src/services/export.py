from datetime import datetime
from typing import Any
from sqlmodel import Session, select

from sqlalchemy import desc
from .. import models
from .encryption import decrypt_data


def generate_care_plan_summary_text(
    patient_id: int, db: Session
) -> tuple[str, str | None]:
    """
    Generates a plain text summary of a patient's care plan.
    Returns the summary text and the patient's full name.
    """
    patient = db.get(models.Patient, patient_id)
    if not patient:
        return "Patient not found.", None

    pii = db.exec(
        select(models.PatientPII).where(models.PatientPII.patient_id == patient_id)
    ).first()
    if not pii:
        return "Patient PII not found.", None

    first_name = decrypt_data(pii.first_name)
    last_name = decrypt_data(pii.last_name)
    patient_name = f"{first_name} {last_name}"
    dob = pii.date_of_birth
    tin = pii.tin
    address = pii.address
    phone_number = pii.phone_number
    generation_date = datetime.now().strftime("%Y-%m-%d %H:%M")

    lines = [
        "OMAHA SYSTEM CARE PLAN SUMMARY",
        "--------------------------------------------------",
        f"Patient: {patient_name}",
        f"DOB: {dob}",
        f"TIN: {tin}",
        f"Phone: {phone_number}",
        f"Address: {address}",
        f"Generated: {generation_date}",
        "--------------------------------------------------",
        "",
    ]

    active_problems = db.exec(
        select(models.PatientProblem)
        .where(models.PatientProblem.patient_id == patient_id)
        .where(models.PatientProblem.is_active == True)  # noqa: E712
    ).all()

    for i, problem in enumerate(active_problems, 1):
        problem_details = db.get(models.OmahaProblem, problem.problem_id)
        modifier_type = db.get(models.ModifierType, problem.modifier_type_id)
        modifier_domain = db.get(models.ModifierDomain, problem.modifier_domain_id)

        if not problem_details or not modifier_type or not modifier_domain:
            continue

        lines.append(
            f"PROBLEM {i}: {problem_details.problem_name} (Type: {modifier_type.modifier_type_name}, Domain: {modifier_domain.modifier_domain_name})"
        )

        symptoms = db.exec(
            select(models.PatientProblemSymptom).where(
                models.PatientProblemSymptom.patient_problem_id
                == problem.patient_problem_id
            )
        ).all()
        symptom_names = []
        for s in symptoms:
            symptom_details = db.get(models.Symptom, s.symptom_id)
            if symptom_details:
                description = symptom_details.symptom_description
                if description is None:
                    raise ValueError(
                        "Symptom description cannot be None if symptom_comment is provided."
                    )
                if s.symptom_comment:
                    description += f" ({s.symptom_comment})"
                symptom_names.append(description)
        lines.append(f"  Symptoms: {', '.join(symptom_names)}")

        latest_score = db.exec(
            select(models.OutcomeScore)
            .where(models.OutcomeScore.patient_problem_id == problem.patient_problem_id)
            .order_by(desc(models.OutcomeScore.date_recorded))  # type: ignore
        ).first()

        if latest_score:
            knowledge_rating = db.get(
                models.OutcomeRatingKnowledge, latest_score.rating_knowledge_id
            )
            behavior_rating = db.get(
                models.OutcomeRatingBehavior, latest_score.rating_behavior_id
            )
            status_rating = db.get(
                models.OutcomeRatingStatus, latest_score.rating_status_id
            )

            lines.append("  Latest Outcome:")
            if knowledge_rating:
                lines.append(
                    f"    - Knowledge: {knowledge_rating.rating_knowledge_label} (Rating: {knowledge_rating.rating_knowledge_id}/5)"
                )
            if behavior_rating:
                lines.append(
                    f"    - Behavior:  {behavior_rating.rating_behavior_label} (Rating: {behavior_rating.rating_behavior_id}/5)"
                )
            if status_rating:
                lines.append(
                    f"    - Status:    {status_rating.rating_status_label} (Rating: {status_rating.rating_status_id}/5)"
                )
        else:
            lines.append("  Latest Outcome: None recorded")

        all_interventions = db.exec(
            select(models.CareIntervention)
            .where(
                models.CareIntervention.patient_problem_id == problem.patient_problem_id
            )
            .order_by(desc(models.CareIntervention.date_performed))  # type: ignore
            .limit(5)
        ).all()
        if all_interventions:
            lines.append("  Interventions:")
            for intervention in all_interventions:
                category = db.get(models.InterventionCategory, intervention.category_id)
                target = db.get(models.InterventionTarget, intervention.target_id)
                if category and target:
                    lines.append(
                        f"    - {intervention.date_performed.strftime('%Y-%m-%d')}: {category.category_name} - {target.target_name} ({intervention.specific_details})"
                    )
        else:
            lines.append("  Interventions: None recorded")

        lines.append("")

    return "\n".join(lines), patient_name


def generate_care_plan_summary_json(
    patient_id: int, db: Session
) -> dict[str, Any] | None:
    """
    Generates a structured JSON summary of a patient's care plan.
    Resolves IDs to human-readable labels for better readability.
    """
    patient = db.get(models.Patient, patient_id)
    if not patient:
        return None

    pii = db.exec(
        select(models.PatientPII).where(models.PatientPII.patient_id == patient_id)
    ).first()
    if not pii:
        return None

    first_name = decrypt_data(pii.first_name)
    last_name = decrypt_data(pii.last_name)

    summary = {
        "patient": {
            "name": f"{first_name} {last_name}",
            "dob": pii.date_of_birth.isoformat() if pii.date_of_birth else None,
            "tin": pii.tin,
            "phone": pii.phone_number,
            "address": pii.address,
        },
        "generated_at": datetime.now().isoformat(),
        "active_problems": [],
    }

    active_problems = db.exec(
        select(models.PatientProblem)
        .where(models.PatientProblem.patient_id == patient_id)
        .where(models.PatientProblem.is_active == True)  # noqa: E712
    ).all()

    for problem in active_problems:
        problem_details = db.get(models.OmahaProblem, problem.problem_id)
        modifier_type = db.get(models.ModifierType, problem.modifier_type_id)
        modifier_domain = db.get(models.ModifierDomain, problem.modifier_domain_id)

        if not problem_details or not modifier_type or not modifier_domain:
            continue

        problem_entry = {
            "problem_name": problem_details.problem_name,
            "type": modifier_type.modifier_type_name,
            "domain": modifier_domain.modifier_domain_name,
            "symptoms": [],
            "latest_outcome": None,
            "all_interventions": [],
        }

        symptoms = db.exec(
            select(models.PatientProblemSymptom).where(
                models.PatientProblemSymptom.patient_problem_id
                == problem.patient_problem_id
            )
        ).all()

        for s in symptoms:
            symptom_details = db.get(models.Symptom, s.symptom_id)
            if symptom_details:
                desc_text = symptom_details.symptom_description or "Unknown"
                problem_entry["symptoms"].append(
                    {"description": desc_text, "comment": s.symptom_comment}
                )

        latest_score = db.exec(
            select(models.OutcomeScore)
            .where(models.OutcomeScore.patient_problem_id == problem.patient_problem_id)
            .order_by(desc(models.OutcomeScore.date_recorded))  # type: ignore
        ).first()

        if latest_score:
            k = db.get(models.OutcomeRatingKnowledge, latest_score.rating_knowledge_id)
            b = db.get(models.OutcomeRatingBehavior, latest_score.rating_behavior_id)
            s = db.get(models.OutcomeRatingStatus, latest_score.rating_status_id)

            problem_entry["latest_outcome"] = {
                "knowledge": k.rating_knowledge_label if k else None,
                "behavior": b.rating_behavior_label if b else None,
                "status": s.rating_status_label if s else None,
                "scores": {
                    "knowledge": k.rating_knowledge_id if k else None,
                    "behavior": b.rating_behavior_id if b else None,
                    "status": s.rating_status_id if s else None,
                },
                "date_recorded": latest_score.date_recorded.isoformat(),
            }

        all_interventions = db.exec(
            select(models.CareIntervention)
            .where(
                models.CareIntervention.patient_problem_id == problem.patient_problem_id
            )
            .order_by(desc(models.CareIntervention.date_performed))  # type: ignore
        ).all()

        for intervention in all_interventions:
            category = db.get(models.InterventionCategory, intervention.category_id)
            target = db.get(models.InterventionTarget, intervention.target_id)
            if category and target:
                problem_entry["all_interventions"].append(
                    {
                        "date": intervention.date_performed.isoformat(),
                        "category": category.category_name,
                        "target": target.target_name,
                        "details": intervention.specific_details,
                    }
                )

        summary["active_problems"].append(problem_entry)

    return summary


def get_group_office_payload_mock(
    patient_uuid: str, summary_text: str
) -> dict[str, Any]:
    """
    Generates a mock payload for Group Office integration.
    """
    return {
        "status": "success",
        "message": "Care Plan ready for Group Office sync",
        "payload_mock": {
            "external_system": "GroupOffice",
            "action": "create_note",
            "linked_contact_uuid": patient_uuid,
            "note_title": "Omaha Care Plan Summary",
            "note_body": summary_text,
        },
    }
