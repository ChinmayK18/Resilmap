"""Live (rule-based) risk calculation, summaries and alerts."""

from typing import Dict, List, Optional

import pandas as pd
from fastapi import HTTPException

from risk_engine.risk_engine import calculate_risk
from risk_engine.exposure import get_baseline_exposure
from risk_engine.dependency import get_baseline_dependency_factor
from services.data_service import ASSETS_FILE, load_csv


def classify_risk(score: float) -> str:
    if score <= 25:
        return "Low"
    elif score <= 50:
        return "Moderate"
    elif score <= 75:
        return "High"
    return "Critical"


def combine_risks(scores: List[float]) -> float:
    """
    Combine several per-hazard risk scores (0-100) into one compound score.
    Probabilistic OR: 1 - prod(1 - r). Two 60s give 84, not 120.
    """
    p = 1.0
    for s in scores:
        p *= 1 - min(max(s, 0), 100) / 100
    return round((1 - p) * 100, 2)


def compute_live_risk(hazards: Dict[str, float], asset_type: Optional[str] = None) -> pd.DataFrame:
    assets = load_csv(ASSETS_FILE)

    if asset_type:
        assets = assets[assets["Asset_Type"] == asset_type]
        if assets.empty:
            raise HTTPException(404, f"No assets of type '{asset_type}'")

    active = {h: s for h, s in hazards.items() if s > 0}

    results = []
    for _, a in assets.iterrows():
        per_hazard = {}
        for hazard, severity in active.items():
            per_hazard[hazard] = calculate_risk(
                a["Asset_Type"], hazard, severity, a["Asset_ID"]
            )

        combined = combine_risks(list(per_hazard.values())) if per_hazard else 0.0

        results.append({
            "Asset_ID": a["Asset_ID"],
            "Asset_Name": a["Asset_Name"],
            "Asset_Type": a["Asset_Type"],
            "Latitude": a.get("Latitude"),
            "Longitude": a.get("Longitude"),
            "Exposure": get_baseline_exposure(a["Asset_Type"], a["Asset_ID"]),
            "Dependency_Factor": get_baseline_dependency_factor(a["Asset_Type"], a["Asset_ID"]),
            "Hazard_Risks": per_hazard,
            "Risk_Score": combined,
            "Risk_Level": classify_risk(combined),
        })

    return pd.DataFrame(results)


def summarize(df: pd.DataFrame) -> dict:
    if df.empty:
        return {"overall": {"score": 0, "level": "Low"}, "by_asset_type": {}, "levels": {}}

    by_type = {}
    for t, g in df.groupby("Asset_Type"):
        avg = round(float(g["Risk_Score"].mean()), 2)
        by_type[t] = {
            "average_score": avg,
            "max_score": round(float(g["Risk_Score"].max()), 2),
            "level": classify_risk(avg),
            "count": int(len(g)),
        }

    overall = round(float(df["Risk_Score"].mean()), 2)
    return {
        "overall": {"score": overall, "level": classify_risk(overall)},
        "by_asset_type": by_type,
        "levels": df["Risk_Level"].value_counts().to_dict(),
    }


def build_alerts(df: pd.DataFrame, limit: int = 10) -> List[dict]:
    flagged = df[df["Risk_Level"].isin(["High", "Critical"])]
    flagged = flagged.sort_values("Risk_Score", ascending=False).head(limit)

    alerts = []
    for _, r in flagged.iterrows():
        worst = max(r["Hazard_Risks"], key=r["Hazard_Risks"].get) if r["Hazard_Risks"] else None
        alerts.append({
            "asset_id": r["Asset_ID"],
            "asset_name": r["Asset_Name"],
            "asset_type": r["Asset_Type"],
            "risk_score": r["Risk_Score"],
            "risk_level": r["Risk_Level"],
            "main_hazard": worst,
            "message": f"{r['Asset_Type']} '{r['Asset_Name']}' is at "
                       f"{r['Risk_Level'].upper()} risk"
                       + (f", mainly from {worst}." if worst else "."),
        })
    return alerts
