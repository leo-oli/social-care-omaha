from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import create_db_and_tables
from .routers import (
    assessments,
    care_plans,
    patients,
    interventions,
    problems,
    static,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="Omaha System API", version="0.1", lifespan=lifespan)

# FIXED CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],  # Expose all headers
)

app.include_router(static.router, prefix="/api/v1")
app.include_router(patients.router, prefix="/api/v1")
app.include_router(assessments.router, prefix="/api/v1")
app.include_router(interventions.router, prefix="/api/v1")
app.include_router(care_plans.router, prefix="/api/v1")
app.include_router(problems.router, prefix="/api/v1")


@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok"}
