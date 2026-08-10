from fastapi import FastAPI
from contextlib import asynccontextmanager
from w3.db_engine import create_tables, get_db, engine
from w3.helper.seed_3 import seed_3_examples
from w3.db_models import Task

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    print("Creating tables...")
    await create_tables()
    print("Seeding 3 tasks")
    seed_3 = await seed_3_examples()
    if seed_3:
        print(seed_3)
    yield
    print("Shutting down...")
    await engine.dispose()

app = FastAPI(lifespan=lifespan)

@app.get("/health")
async def health_check():
    return {"status": "ok"}
