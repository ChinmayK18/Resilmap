from fastapi import APIRouter

from models.schemas import ScenarioRequest
from services.cascade_service import list_substations, run_scenario

router = APIRouter(prefix="/api/cascade", tags=["cascade"])


@router.get("/substations")
def cascade_substations():
    """Substations that can be chosen as the failed one (for a dropdown)."""
    items = list_substations()
    return {"count": len(items), "substations": items}


@router.post("/run")
def cascade_run(req: ScenarioRequest):
    """Run the team's cascade simulator for one scenario.
    Omitted fields fall back to simulation/scenario.py."""
    return run_scenario(req.failed_substation, req.hazard_type, req.event_date, req.top)
