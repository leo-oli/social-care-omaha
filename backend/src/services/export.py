from datetime import datetime
from typing import Any, Dict
from sqlmodel import Session, select

from sqlalchemy import desc
from .. import models
from .encryption import decrypt_data


def generate_care_plan_summary_text(
    client_id: int, db: Session
) -> tuple[str, str | None]:
    """
    Generates a plain text summary of a client's care plan.
    Returns the summary text and the client's full name.
    """
    client = db.get(models.Client, client_id)
    if not client:
        return "Client not found.", None

    pii = db.exec(
        select(models.ClientPII).where(models.ClientPII.client_id == client_id)
    ).first()
    if not pii:
        return "Client PII not found.", None

    first_name = decrypt_data(pii.first_name)
    last_name = decrypt_data(pii.last_name)
    client_name = f"{first_name} {last_name}"
    dob = pii.date_of_birth
    tin = pii.tin
    address = pii.address
    phone_number = pii.phone_number
    generation_date = datetime.now().strftime("%Y-%m-%d %H:%M")

    lines = [
        "OMAHA SYSTEM CARE PLAN SUMMARY",
        "--------------------------------------------------",
        f"Client: {client_name}",
        f"DOB: {dob}",
        f"TIN: {tin}",
        f"Phone: {phone_number}",
        f"Address: {address}",
        f"Generated: {generation_date}",
        "--------------------------------------------------",
        "",
    ]

    active_problems = db.exec(
        select(models.ClientProblem)
        .where(models.ClientProblem.client_id == client_id)
        .where(models.ClientProblem.is_active == True)  # noqa: E712
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
            select(models.ClientProblemSymptom).where(
                models.ClientProblemSymptom.client_problem_id
                == problem.client_problem_id
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
            .where(models.OutcomeScore.client_problem_id == problem.client_problem_id)
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

        recent_interventions = db.exec(
            select(models.CareIntervention)
            .where(
                models.CareIntervention.client_problem_id == problem.client_problem_id
            )
            .order_by(desc(models.CareIntervention.date_performed))  # type: ignore
            .limit(5)
        ).all()
        if recent_interventions:
            lines.append("  Recent Interventions:")
            for intervention in recent_interventions:
                category = db.get(models.InterventionCategory, intervention.category_id)
                target = db.get(models.InterventionTarget, intervention.target_id)
                if category and target:
                    lines.append(
                        f"    - {intervention.date_performed.strftime('%Y-%m-%d')}: {category.category_name} - {target.target_name} ({intervention.specific_details})"
                    )
        else:
            lines.append("  Recent Interventions: None recorded")

        lines.append("")

    return "\n".join(lines), client_name


def get_group_office_payload_mock(
    client_uuid: str, summary_text: str
) -> Dict[str, Any]:
    """
    Generates a mock payload for Group Office integration.
    """
    return {
        "status": "success",
        "message": "Care Plan ready for Group Office sync",
        "payload_mock": {
            "external_system": "GroupOffice",
            "action": "create_note",
            "linked_contact_uuid": client_uuid,
            "note_title": "Omaha Care Plan Summary",
            "note_body": summary_text,
        },
    }
