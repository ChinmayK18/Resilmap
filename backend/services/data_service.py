"""File paths and CSV loading shared by all routes."""

from functools import lru_cache
from pathlib import Path
from typing import List

import pandas as pd
from fastapi import HTTPException

BACKEND_DIR = Path(__file__).resolve().parent.parent
BASE_DIR = BACKEND_DIR.parent
DATA_DIR = BASE_DIR / "data" / "processed"

ASSETS_FILE = DATA_DIR / "mumbai_infrastructure_assets.csv"
RISK_FILE = DATA_DIR / "mumbai_infrastructure_risk.csv"
AI_INFRA_FILE = DATA_DIR / "ai_infrastructure_risk.csv"
AI_EVENT_FILE = DATA_DIR / "ai_event_risk.csv"
FINAL_FILE = DATA_DIR / "final_ai_cascade_output.csv"
CASCADE_FILE = DATA_DIR / "cascade_results.csv"
LINKS_FILE = DATA_DIR / "hospital_substation_links.csv"


@lru_cache(maxsize=16)
def _read_cached(path_str: str, mtime: float) -> pd.DataFrame:
    return pd.read_csv(path_str)


def read_csv_cached(path: Path) -> pd.DataFrame:
    """Read a CSV once; re-read automatically when the file changes.
    Callers must not modify the returned DataFrame in place."""
    return _read_cached(str(path), path.stat().st_mtime)


def load_csv(path: Path) -> pd.DataFrame:
    """Read a CSV or raise a clear 404 telling which script to run."""
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"{path.name} not found. Run the data/ML pipeline scripts first.",
        )
    return read_csv_cached(path)


def to_records(df: pd.DataFrame) -> List[dict]:
    """DataFrame -> JSON-safe list of dicts (NaN becomes null)."""
    return df.astype(object).where(df.notna(), None).to_dict("records")
