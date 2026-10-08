"""Request schemas (Pydantic models) for the API."""

from typing import Optional

from pydantic import BaseModel, Field


class HazardInput(BaseModel):
    """Hazard severities on a 0-100 scale. 0 = hazard not active."""
    heat: float = Field(0, ge=0, le=100)
    flood: float = Field(0, ge=0, le=100)
    geomagnetic: float = Field(0, ge=0, le=100)


class RawHazardInput(BaseModel):
    """Raw measurements, converted to severities with hazard_scoring.py."""
    temperature_c: float = Field(..., description="Max temperature in deg C")
    rainfall_mm: float = Field(0, ge=0)
    normal_rainfall_mm: float = Field(1, ge=0)
    kp_max: float = Field(0, ge=0, le=9)
    ap: float = Field(0, ge=0)


class RiskRequest(BaseModel):
    hazards: HazardInput
    asset_type: Optional[str] = Field(
        None, description="Optional filter: Hospital, Power Station or Substation"
    )
class ScenarioRequest(BaseModel):
    failed_substation: Optional[str] = Field(
        None, description="e.g. '220kV BORIVALI'. Empty = value in simulation/scenario.py"
    )
    hazard_type: Optional[str] = Field(None, description="Heat, Flood or Geomagnetic")
    event_date: Optional[str] = Field(None, description="e.g. 2024-05-11")
    top: int = Field(50, ge=1, le=500)