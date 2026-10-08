from fastapi import APIRouter

from models.schemas import RawHazardInput
from risk_engine.hazard_scoring import (
    heat_severity,
    rainfall_severity,
    geomagnetic_severity,
    overall_hazard_score,
)

router = APIRouter(prefix="/api/hazards", tags=["hazards"])


@router.post("/score")
def score_hazards(raw: RawHazardInput):
    """Convert raw weather / space-weather values into 0-100 severities."""
    heat = heat_severity(raw.temperature_c)
    flood = rainfall_severity(raw.rainfall_mm, raw.normal_rainfall_mm)
    geo = geomagnetic_severity(raw.kp_max, raw.ap)

    return {
        "hazards": {"heat": heat, "flood": flood, "geomagnetic": geo},
        "overall_hazard_score": overall_hazard_score(heat, flood, geo),
    }


@router.get("/scenarios")
def get_scenarios():
    """Demo presets for the frontend. Tune values for your demo."""
    return {
        "normal": {"heat": 10, "flood": 5, "geomagnetic": 5},
        "severe_solar_storm": {"heat": 10, "flood": 5, "geomagnetic": 95},
        "compound_disaster": {"heat": 80, "flood": 60, "geomagnetic": 90},
    }
