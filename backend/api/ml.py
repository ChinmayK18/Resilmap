from typing import Optional

from fastapi import APIRouter, Query

from services.data_service import AI_INFRA_FILE, AI_EVENT_FILE, FINAL_FILE, load_csv, to_records

router = APIRouter(prefix="/api/ml", tags=["ml"])


@router.get("/risk")
def ml_risk(
    hazard_type: Optional[str] = None,
    asset_type: Optional[str] = None,
    top: int = Query(50, ge=1, le=1000),
):
    """Asset x hazard AI risk (output of create_infrastructure_risk.py)."""
    df = load_csv(AI_INFRA_FILE)
    if hazard_type:
        df = df[df["Hazard_Type"] == hazard_type]
    if asset_type:
        df = df[df["Asset_Type"] == asset_type]
    df = df.sort_values("AI_Risk_Score", ascending=False).head(top)
    return {"count": len(df), "records": to_records(df)}


@router.get("/events")
def ml_events(
    hazard_type: Optional[str] = None,
    top: int = Query(50, ge=1, le=1000),
):
    """Highest-risk historical events (output of create_ai_event_risk.py)."""
    df = load_csv(AI_EVENT_FILE)
    if hazard_type:
        df = df[df["Hazard_Type"] == hazard_type]
    df = df.sort_values("AI_Event_Risk", ascending=False).head(top)
    return {"count": len(df), "records": to_records(df)}


@router.get("/anomalies")
def ml_anomalies(top: int = Query(50, ge=1, le=1000)):
    """Assets flagged as anomalous by the Isolation Forest."""
    df = load_csv(FINAL_FILE)
    df = df[df["ML_Anomaly"] == 1].sort_values("ML_Anomaly_Score", ascending=False)
    return {"count": len(df), "records": to_records(df.head(top))}
