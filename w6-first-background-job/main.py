from fastapi import FastAPI
from contextlib import asynccontextmanager
from inngest import Inngest
from .config import Settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(" Application starting")
    global inngest
    inngest = Inngest(app=app, settings=Settings())
    yield
    print(" Application shutting down")

app = FastAPI(
    lifespan=lifespan, version="0.0.1", title="W6 First Background Job",
    description="A simple FastAPI application with Inngest integration"
)

@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}