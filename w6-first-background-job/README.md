# Week 6 (Assignment A7) - Your First Background Job

> Durable background task execution and event-driven workflows leveraging Inngest and FastAPI.

---

## Architecture Overview
- **Pattern**: Accept fast, delegate slow execution to an asynchronous background worker, and report status.
- **Workflow Engine**: Inngest orchestrates durable steps (`step.sleep`, `step.run`), automated retries with exponential backoff, and scheduled cron jobs.
- **Dev Server**: Local Inngest engine running at `http://localhost:8288` synchronizing with FastAPI at `/api/inngest`.

---

## Quickstart

### 1. Installation
```bash
uv pip install -r requirements.txt
```

### 2. Start Application Server (Terminal 1)
```bash
uv run --directory . -m main
```
- API Base URL: `http://localhost:8000`
- Health Probe: `http://localhost:8000/health`
- Inngest Endpoint: `http://localhost:8000/api/inngest`

### 3. Start Inngest Dev Server (Terminal 2)
```bash
npx inngest-cli@latest dev -u http://localhost:8000/api/inngest
```
- Inngest Web Dashboard: `http://localhost:8288`

---

## Stages Implemented

### Stage 0: Hello, Server
- Endpoint: `GET /health` $\to$ `{"status": "ok"}`

### Stage 1: Hire the Worker: Connect Inngest
- Client ID: `report-api`
- Function ID: `say-hello`
- Trigger Event: `test/hello`
- Workflow: Sleeps 5 seconds (`ctx.step.sleep("sleep-for-5s", datetime.timedelta(seconds=5))`) then returns `"Hello from the background!"`.

### Stage 2: The Fast Door: Accept Now, Work Later
- **Endpoints**:
  - `POST /reports` $\to$ Returns HTTP `202 Accepted` with `{"id": "<uuid>", "status": "pending"}` in < 1 second.
  - `GET /reports/{id}` $\to$ Returns current status (`pending`, then `done` with `"result"`). Returns `404` for unknown IDs.
- **Workflow**: `make-report` function triggered by `report/requested`.
  - Step 1: `ctx.step.sleep("do-the-slow-work", datetime.timedelta(seconds=8))` (simulates slow task).
  - Step 2: `ctx.step.run("build-report", handler)` (compiles summary and sets status to `"done"`).

### Stage 3: Jobs Fail. Watch the Retry.
- **Durable Failure Handling & Memoization**:
  - `make-report` configured with `retries=2`.
  - Injected failure: If `topic == "fail"`, `build-report` raises `ValueError("The report oven is broken!")`.
  - Because `do-the-slow-work` is a distinct Inngest step, its result is memoized. On retry attempts (1 initial + 2 retries = 3 attempts total), Inngest skips the 8-second wait and immediately retries the failing `build-report` step before marking the run `Failed`.
- **Bad Input vs. Bad Luck (Architectural Reflection)**:
  - Missing or empty topic inputs are rejected immediately at the endpoint with `HTTP 400 Bad Request` without dispatching an event to Inngest or creating a pending report.
  > *"A wrong input must be rejected at the door with HTTP 400 because bad data will never succeed on a retry; only transient failures occurring at a wrong moment deserve automated retries with backoff."*

---

## Verification & Automated Tests

Run the test suites:
```bash
# Stage 1: Inngest setup & say-hello
uv run pytest ../tests/test_w6_stage1.py -v

# Stage 2: 202 Accepted, background make-report workflow, and status polling
uv run pytest ../tests/test_w6_stage2.py -v

# Stage 3: Retries, failure memoization, and 400 validation rejection
uv run pytest ../tests/test_w6_stage3.py -v

# Run all test suites
uv run pytest ../tests/test_w6_stage*.py -v
```

