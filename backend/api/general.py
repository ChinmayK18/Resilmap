import json
from datetime import datetime, timezone
from typing import Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter

from services.data_service import (
    ASSETS_FILE, RISK_FILE, AI_INFRA_FILE, AI_EVENT_FILE,
    FINAL_FILE, CASCADE_FILE, load_csv, to_records,
)

from risk_engine.hazard_scoring import heat_severity, rainfall_severity

router = APIRouter(tags=["general"])

NORMAL_RAINFALL_MM = 10.0  # assumption: tune from data/processed/mumbai_rainfall_daily.csv


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


@router.get("/api/live-weather")
def get_live_weather():
    """Fetch the latest available weather conditions for Mumbai (Open-Meteo)."""
    url = (
        "https://api.open-meteo.com/v1/forecast"
        "?latitude=19.0760&longitude=72.8777"
        "&current=temperature_2m,relative_humidity_2m,"
        "precipitation,rain,wind_speed_10m,weather_code"
        "&timezone=Asia%2FKolkata"
    )
    request = Request(url, headers={"User-Agent": "ResilMap/1.0"})

    try:
        with urlopen(request, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
        current = data["current"]
        return {
            "source": "Open-Meteo",
            "location": "Mumbai, Maharashtra",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "observation_time": current["time"],
            "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
            "temperature_c": current["temperature_2m"],
            "humidity_percent": current["relative_humidity_2m"],
            "precipitation_mm": current["precipitation"],
            "rain_mm": current["rain"],
            "wind_speed_kmh": current["wind_speed_10m"],
            "weather_code": current["weather_code"],
            "data_status": "live_api_response",
        }
    except (HTTPError, URLError, TimeoutError, OSError, ValueError, KeyError) as exc:
        return {
            "location": "Mumbai, Maharashtra",
            "data_status": "unavailable",
            "message": str(exc),
        }


@router.get("/api/live-weather/hazard-score")
def live_weather_hazard_score():
    """Run live weather through the existing heat / flood severity functions."""
    weather = get_live_weather()
    if weather.get("data_status") != "live_api_response":
        return weather
    return {
        "weather": weather,
        "hazards": {
            "heat": heat_severity(weather["temperature_c"]),
            "flood": rainfall_severity(weather["precipitation_mm"], NORMAL_RAINFALL_MM),
        },
        "note": "Geomagnetic excluded: no live space-weather feed connected.",
    }
