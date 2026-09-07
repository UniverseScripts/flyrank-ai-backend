import inngest
import datetime
import inngest.fast_api
from fastapi import FastAPI
from contextlib import asynccontextmanager
from settings.config import settings


inngest_client = inngest.Inngest(
    app_id="report-api",
    is_production=not settings.INNGEST_DEV
)

@inngest_client.create_function(
    fn_id="say-hello",
    trigger=inngest.TriggerEvent(event="test/hello"),
)

async def say_hello(ctx: inngest.Context):
    await ctx.step.sleep(step_id="sleep-for-5s", duration=datetime.timedelta(seconds=5))
    return "Hello from the background!"

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(" Application starting")
    yield
    print(" Application shutting down")

app = FastAPI(
    lifespan=lifespan, version="0.0.1", title="W6 First Background Job",
    description="A simple FastAPI application with Inngest integration"
)

inngest.fast_api.serve(app=app, client=inngest_client, functions=[say_hello])

@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app="main:app", host="0.0.0.0", port=8000, reload=True)