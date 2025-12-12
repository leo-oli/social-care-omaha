from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from .database import create_db_and_tables
from .routers import (
    assessments,
    care_plans,
    clients,
    interventions,
    problems,
    static,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


# Create FastAPI app
app = FastAPI(title="Omaha System API", version="0.1", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(static.router, prefix="/api/v1")
app.include_router(clients.router, prefix="/api/v1")
app.include_router(assessments.router, prefix="/api/v1")
app.include_router(interventions.router, prefix="/api/v1")
app.include_router(care_plans.router, prefix="/api/v1")
app.include_router(problems.router, prefix="/api/v1")


# health check
@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok"}
