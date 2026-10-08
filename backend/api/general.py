from typing import Optional

from fastapi import APIRouter

from services.data_service import (
    ASSETS_FILE, RISK_FILE, AI_INFRA_FILE, AI_EVENT_FILE,
    FINAL_FILE, CASCADE_FILE, load_csv, to_records,
)

router = APIRouter(tags=["general"])


@router.get("/health")
def health():
    files = {
        p.name: p.exists()
        for p in [ASSETS_FILE, RISK_FILE, AI_INFRA_FILE, AI_EVENT_FILE, FINAL_FILE, CASCADE_FILE]
    }
    return {"status": "ok", "data_files": files}


@router.get("/api/assets")
def get_assets(asset_type: Optional[str] = None):
    df = load_csv(ASSETS_FILE)
    if asset_type:
        df = df[df["Asset_Type"] == asset_type]
    return {"count": len(df), "assets": to_records(df)}
