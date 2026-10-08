"""
Cascade simulator service.

Wraps the team's simulation/cascade.py (no second simulator): it calls
simulate_substation_failure() with save=False, so the API never overwrites
data/processed/cascade_results.csv.
"""

import sys
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import HTTPException

# project root (the folder holding backend/, simulation/, data/) must be importable
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from simulation.cascade import CascadeError, simulate_substation_failure  # noqa: E402
from simulation.scenario import SCENARIO                                   # noqa: E402

from services.data_service import ASSETS_FILE, LINKS_FILE, load_csv, to_records  # noqa: E402
from services.risk_service import classify_risk                                   # noqa: E402


def list_substations() -> list:
    """Substation names that have at least one linked hospital."""
    links = load_csv(LINKS_FILE)
    counts = links.groupby("Substation_Name").size().sort_values(ascending=False)
    return [{"name": n, "linked_hospitals": int(c)} for n, c in counts.items()]


def run_scenario(
    failed_substation: Optional[str] = None,
    hazard_type: Optional[str] = None,
    event_date: Optional[str] = None,
    top: int = 50,
) -> dict:
    # anything not given falls back to simulation/scenario.py
    failed_substation = failed_substation or SCENARIO["failed_substation"]
    hazard_type = hazard_type or SCENARIO["hazard_type"]
    if event_date is None:
        event_date = SCENARIO.get("event_date")

    try:
        df = simulate_substation_failure(
            failed_substation, hazard_type, event_date, save=False, verbose=False
        )
    except CascadeError as error:
        raise HTTPException(404, str(error))
    except FileNotFoundError as error:
        raise HTTPException(404, f"{Path(error.filename).name} not found. Run the data pipeline first.")

    # without an event date one hospital can appear once per historical event:
    # keep its worst row
    df = (
        df.sort_values("Cascade_Impact", ascending=False)
        .drop_duplicates(subset="Hospital_Name")
    )

    # add map coordinates from the assets file
    assets = load_csv(ASSETS_FILE)[["Asset_ID", "Latitude", "Longitude"]]
    df = df.merge(assets, on="Asset_ID", how="left")

    severity = float(df["Cascade_Severity"].iloc[0])
    return {
        "scenario": {
            "failed_substation": failed_substation,
            "hazard_type": hazard_type,
            "event_date": event_date,
        },
        "summary": {
            "cascade_severity": severity,
            "level": classify_risk(severity),
            "hospitals_affected": int(len(df)),
            "total_cascade_impact": round(float(df["Cascade_Impact"].sum()), 2),
        },
        "affected_hospitals": to_records(df.head(top)),
    }
