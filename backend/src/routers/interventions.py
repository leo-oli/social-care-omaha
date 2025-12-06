from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..database import get_session
from ..models import CareIntervention, ClientProblem, InterventionTarget
from ..schemas import CareInterventionCreate

router = APIRouter(prefix="/interventions", tags=["interventions"])


@router.post("", response_model=CareIntervention)
def create_intervention(
    intervention_data: CareInterventionCreate, session: Session = Depends(get_session)
):
    # Check if client problem and target exist
    if not session.get(ClientProblem, intervention_data.client_problem_id):
        raise HTTPException(status_code=404, detail="Client Problem not found")
    if not session.get(InterventionTarget, intervention_data.target_id):
        raise HTTPException(status_code=404, detail="Intervention Target not found")

    intervention = CareIntervention.model_validate(intervention_data)
    session.add(intervention)
    session.commit()
    session.refresh(intervention)
    return intervention
