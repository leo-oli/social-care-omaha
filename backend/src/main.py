from contextlib import asynccontextmanager

from fastapi import FastAPI

from .database import create_db_and_tables
from .routers import (
    assessments,
    care_plans,
    clients,
    interventions,
    static,
)
from .seed import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code to run on startup
    print("INFO:     Calling lifespan startup")
    create_db_and_tables()
    seed_database()
    yield
    # Code to run on shutdown
    print("INFO:     Calling lifespan shutdown")


# Create FastAPI app
app = FastAPI(title="Omaha System API", version="0.1", lifespan=lifespan)

app.include_router(static.router, prefix="/api/v1")
app.include_router(clients.router, prefix="/api/v1")
app.include_router(assessments.router, prefix="/api/v1")
app.include_router(interventions.router, prefix="/api/v1")
app.include_router(care_plans.router, prefix="/api/v1")
