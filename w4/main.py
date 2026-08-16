import sys
from pathlib import Path

from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db_engine import create_tables, engine, get_db
from db_models import Task
from helpers.seed_3 import seed_3_examples
from schemas.tasks import TaskCreate, TaskResponse, TaskStats, TaskUpdate


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    print("Creating tables...")
    await create_tables()
    print("Seeding 3 tasks...")
    seed_result = await seed_3_examples()
    if seed_result:
        print(seed_result)
    yield
    print("Shutting down...")
    await engine.dispose()


app = FastAPI(
    title="Flyrank AI - Week 3 Task API",
    description="Database-backed CRUD Task API with SQLite/Postgres and SQLAlchemy",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", summary="Health check")
async def health_check():
    return {"status": "ok"}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)