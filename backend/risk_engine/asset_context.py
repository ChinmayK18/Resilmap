"""
Per-asset context for the risk engine.

Reads the assets and hospital-substation link files ONCE and builds, for
every asset, the numbers that exposure.py and dependency.py need:

  capacity_rank   0-1 rank of the asset's capacity WITHIN its own type
                  (a big hospital vs other hospitals, not vs a power plant)
  served_norm     substations only: hospitals served / max hospitals served
  strength_norm   substations: avg dependency strength / max strength
                  hospitals:   strongest link strength / max strength
  supply_links    hospitals only: number of substations linked

None means "no link data for this asset", and the callers then fall back
to the old per-type baseline.

Assumes this file lives in <project>/backend/risk_engine/ and the data is in
<project>/data/processed/.
"""

from functools import lru_cache
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "processed"

ASSET_FILE = DATA_DIR / "mumbai_infrastructure_assets.csv"
LINK_FILE = DATA_DIR / "hospital_substation_links.csv"

DEFAULT_CONTEXT = {
    "capacity_rank": 0.5,
    "served_norm": None,
    "strength_norm": None,
    "supply_links": None,
}


@lru_cache(maxsize=1)
def _load_context():
    if not ASSET_FILE.exists():
        return {}

    assets = pd.read_csv(ASSET_FILE)

    # --- capacity rank within each asset type -------------------------
    assets["Capacity"] = pd.to_numeric(assets["Capacity"], errors="coerce")
    assets["Capacity_Rank"] = (
        assets.groupby("Asset_Type")["Capacity"]
        .rank(pct=True)
        .fillna(0.5)
    )

    # --- dependency statistics from the links file --------------------
    sub_stats, hosp_stats = {}, {}
    max_served, max_strength = 0, 0.0

    if LINK_FILE.exists():
        links = pd.read_csv(LINK_FILE)
        links["Dependency_Strength"] = pd.to_numeric(
            links["Dependency_Strength"], errors="coerce"
        )

        sub_stats = (
            links.groupby("Substation_Name")
            .agg(
                served=("Hospital_Name", "count"),
                strength=("Dependency_Strength", "mean"),
            )
            .to_dict("index")
        )

        hosp_stats = (
            links.groupby("Hospital_Name")
            .agg(
                links=("Substation_Name", "count"),
                strength=("Dependency_Strength", "max"),
            )
            .to_dict("index")
        )

        if sub_stats:
            max_served = max(v["served"] for v in sub_stats.values())
        max_strength = float(links["Dependency_Strength"].max() or 0)

    def norm(value, maximum):
        if value is None or pd.isna(value) or not maximum:
            return None
        return float(min(max(value / maximum, 0.0), 1.0))

    # --- build one context dict per asset -----------------------------
    context = {}
    for row in assets.itertuples():
        ctx = dict(DEFAULT_CONTEXT)
        ctx["capacity_rank"] = float(row.Capacity_Rank)

        if row.Asset_Type == "Substation" and row.Asset_Name in sub_stats:
            s = sub_stats[row.Asset_Name]
            ctx["served_norm"] = norm(s["served"], max_served)
            ctx["strength_norm"] = norm(s["strength"], max_strength)

        elif row.Asset_Type == "Hospital" and row.Asset_Name in hosp_stats:
            h = hosp_stats[row.Asset_Name]
            ctx["strength_norm"] = norm(h["strength"], max_strength)
            ctx["supply_links"] = int(h["links"])

        context[row.Asset_ID] = ctx

    return context


def get_asset_context(asset_id):
    """Context for one asset; defaults if the asset or files are missing."""
    return _load_context().get(asset_id, DEFAULT_CONTEXT)
