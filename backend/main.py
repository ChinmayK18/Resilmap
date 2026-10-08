"""
Resilience Map - FastAPI backend entry point.

Run from the PROJECT ROOT (the folder that contains backend/, simulation/ and data/):

    uvicorn backend.main:app --reload

Docs: http://127.0.0.1:8000/docs
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent

# backend/ lets modules import `api`, `services`, `risk_engine`;
# the project root lets the backend import the team's `simulation` package.
for path in (BACKEND_DIR, PROJECT_ROOT):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from fastapi import FastAPI                               # noqa: E402
from fastapi.middleware.cors import CORSMiddleware        # noqa: E402

from api import general, hazards, risk, ml, simulation, cascade  # noqa: E402

app = FastAPI(
    title="Resilience Map API",
    description="Earth + space weather infrastructure risk, ML anomaly "
                "scores and cascade results.",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(general.router)
app.include_router(hazards.router)
app.include_router(risk.router)
app.include_router(ml.router)
app.include_router(simulation.router)
app.include_router(cascade.router)
