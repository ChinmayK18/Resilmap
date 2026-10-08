from typing import Optional

from fastapi import APIRouter

from models.schemas import RiskRequest
from services.data_service import RISK_FILE, load_csv, to_records
from services.risk_service import compute_live_risk, summarize, build_alerts

router = APIRouter(prefix="/api/risk", tags=["risk"])


@router.post("")
def risk(req: RiskRequest):
    """Live risk for every asset given the current hazard severities."""
    hazards = {
        "Heat": req.hazards.heat,
        "Flood": req.hazards.flood,
        "Geomagnetic": req.hazards.geomagnetic,
    }
    df = compute_live_risk(hazards, req.asset_type)

    return {
        "hazards": hazards,
        "summary": summarize(df),
        "alerts": build_alerts(df),
        "assets": to_records(df),
    }


@router.get("/table")
def risk_table(
    hazard_type: Optional[str] = None,
    asset_type: Optional[str] = None,
    level: Optional[str] = None,
):
    """Precomputed rule-based table (output of generate_risk_table.py)."""
    df = load_csv(RISK_FILE)
    if hazard_type:
        df = df[df["Hazard_Type"] == hazard_type]
    if asset_type:
        df = df[df["Asset_Type"] == asset_type]
    if level:
        df = df[df["Risk_Level"].str.lower() == level.lower()]
    return {"count": len(df), "records": to_records(df)}
