from typing import Optional

from fastapi import APIRouter, Query

from models.schemas import RiskRequest
from services.data_service import AI_INFRA_FILE, CASCADE_FILE, load_csv, to_records
from services.risk_service import compute_live_risk, summarize, build_alerts

router = APIRouter(prefix="/api", tags=["simulation"])


@router.get("/cascade")
def cascade(hazard_type: Optional[str] = None, top: int = Query(100, ge=1, le=2000)):
    """Saved result of the last offline run of simulation/cascade.py.
    For a scenario of your own use POST /api/cascade/run."""
    df = load_csv(CASCADE_FILE)
    if hazard_type and "Hazard_Type" in df.columns:
        df = df[df["Hazard_Type"] == hazard_type]
    return {"count": len(df), "records": to_records(df.head(top))}


@router.post("/simulate")
def simulate(req: RiskRequest):
    """
    What-if simulator: live rule-based risk + ML context + saved cascade rows
    for the hazards the user switched on.
    """
    hazards = {
        "Heat": req.hazards.heat,
        "Flood": req.hazards.flood,
        "Geomagnetic": req.hazards.geomagnetic,
    }
    active = [h for h, s in hazards.items() if s > 0]

    live = compute_live_risk(hazards, req.asset_type)

    # ML context (optional: simulation still works if ML files are missing)
    ml_context = []
    if AI_INFRA_FILE.exists() and active:
        ai = load_csv(AI_INFRA_FILE)
        ai = ai[ai["Hazard_Type"].isin(active)]
        ai = ai.sort_values("AI_Risk_Score", ascending=False).head(10)
        ml_context = to_records(
            ai[["Asset_Name", "Asset_Type", "Hazard_Type", "AI_Risk_Score", "Risk_Level"]]
        )

    # Saved cascade rows (optional)
    cascade_paths = []
    if CASCADE_FILE.exists() and active:
        c = load_csv(CASCADE_FILE)
        if "Hazard_Type" in c.columns:
            c = c[c["Hazard_Type"].isin(active)]
        if "Cascade_Severity" in c.columns:
            c = c.sort_values("Cascade_Severity", ascending=False)
        cascade_paths = to_records(c.head(20))

    return {
        "active_hazards": active,
        "summary": summarize(live),
        "alerts": build_alerts(live),
        "assets": to_records(live),
        "ml_top_risks": ml_context,
        "cascade_paths": cascade_paths,
    }
