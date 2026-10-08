from risk_engine.vulnerability import get_asset_vulnerability
from risk_engine.exposure import get_baseline_exposure
from risk_engine.dependency import get_baseline_dependency_factor


def calculate_risk(
    asset_type,
    hazard_type,
    hazard_severity,
    asset_id=None
):
    """
    Calculate infrastructure risk using:

    Risk =
        Hazard Severity
        × Exposure
        × Vulnerability
        × Dependency Factor

    Final score is normalized to 0-100.

    If asset_id is given, exposure and the dependency factor are
    calculated for that specific asset (capacity, hospital-substation
    links). Without it, the per-type baselines are used, so existing
    callers keep working.
    """

    vulnerability = get_asset_vulnerability(
        asset_type,
        hazard_type
    )

    exposure = get_baseline_exposure(
        asset_type,
        asset_id
    )

    dependency_factor = get_baseline_dependency_factor(
        asset_type,
        asset_id
    )

    risk = (
        hazard_severity
        * exposure
        * vulnerability
        * dependency_factor
    )

    risk = min(max(risk, 0), 100)

    return round(float(risk), 2)
