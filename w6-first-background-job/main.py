import inngest
import datetime
import inngest.fast_api
import uuid
from fastapi import FastAPI, HTTPException, status
from contextlib import asynccontextmanager
from settings.config import settings
from schemas.reports import ReportRequest

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
    app.state.reports_map: dict[str, dict] = {}
    yield
    print(" Application shutting down")
    del app.state.reports_map

app = FastAPI(
    lifespan=lifespan, version="0.0.1", title="W6 First Background Job",
    description="A simple FastAPI application with Inngest integration"
)
app.state.reports_map: dict[str, dict] = {}

@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


@app.post("/reports", status_code=202)
async def request_report(request: ReportRequest):
    report_id = str(uuid.uuid4())
    app.state.reports_map[report_id] = {"id": report_id, "topic": request.topic, "status": "pending"}
    await inngest_client.send(
        inngest.Event(
            name="report/requested",
            data={
                "id": report_id,
                "topic": request.topic,
            },
        )
    )
    return {"id": report_id, "status": "pending"}

@inngest_client.create_function(
    fn_id="make-report",
    trigger=inngest.TriggerEvent(event="report/requested"),
)
async def make_report(ctx: inngest.Context):
    await ctx.step.sleep(step_id="do-the-slow-work", duration=datetime.timedelta(seconds=8))
    def build_report():
        report_id = ctx.event.data["id"]
        report_topic = ctx.event.data["topic"]

        result = f"Summary report for topic: {report_topic}"

        app.state.reports_map[report_id]["result"] = result
        app.state.reports_map[report_id]["status"] = "done"

        return app.state.reports_map[report_id]
    await ctx.step.run(step_id="build-report", handler=build_report)


@app.get("/reports/{id}")
async def get_report(id: str):
    if id not in app.state.reports_map:
        raise HTTPException(status_code=404, detail="Report not found")
    return app.state.reports_map[id]


inngest.fast_api.serve(app=app, client=inngest_client, functions=[say_hello, make_report])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app="main:app", host="0.0.0.0", port=8000, reload=True)