# Week 3 - Connecting Your CRUD to the Database & Containerization

> Asynchronous Task CRUD REST API featuring dual database backends: SQLite with SQLAlchemy AsyncIO (Assignment A2) and production containerization with PostgreSQL via Docker Compose (Assignment A3).

---

## Assignment A2: SQLite Integration

### Architecture & Engine Rationale
- **Why SQLite?**: Serverless, zero-configuration, single-file database engine with native cross-platform support. It ensures durable task persistence across server restarts while maintaining high throughput and zero external daemon overhead.
- **Async Driver**: Utilizes `aiosqlite` with SQLAlchemy's `AsyncSession` and `create_async_engine` to prevent blocking the FastAPI event loop during disk I/O.
- **Database File**: `tasks.db` (auto-created and migrated on application startup).

### Quickstart (Local SQLite)
```bash
uv run --directory . python -m uvicorn main:app --reload
```
- API Base URL: `http://localhost:8000`
- Swagger UI Documentation: `http://localhost:8000/docs`

### Manual SQLite Queries
```sql
-- 1. List every task
SELECT * FROM tasks;

-- 2. Filter completed tasks
SELECT * FROM tasks WHERE done = 1;

-- 3. Total task count
SELECT COUNT(*) FROM tasks;

-- 4. Mark all tasks as completed
UPDATE tasks SET done = 1;

-- 5. Delete completed tasks
DELETE FROM tasks WHERE done = 1;
```

---

## Assignment A3: Containerization (PostgreSQL + Docker Compose)

### Overview
Packages the Task CRUD REST API alongside an isolated PostgreSQL container into a reproducible multi-container service orchestrated via Docker Compose.

### One-Command Startup
To build images and spin up the complete service stack:
```bash
docker compose up --build
```

To stop and remove containers:
```bash
docker compose down
```

### Environment Configuration
Configuration is strictly managed through `.env` (gitignored), validated via Pydantic `BaseSettings`:

| Variable | Description | Local Value | Docker Compose Value |
|---|---|---|---|
| `DATABASE_URL` | Async PostgreSQL connection string | `postgresql+asyncpg://postgres:dev@localhost:5432/tasks` | `postgresql+asyncpg://postgres:dev@db:5432/tasks` |

Template file: [`.env.example`](.env.example)

---

## API Endpoints & Specification

| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `GET` | `/health` | Application and database readiness check | `200 OK` |
| `GET` | `/tasks` | List tasks (supports query filters `?search=`, `?done=`, `?sort=`) | `200 OK` |
| `GET` | `/tasks/{id}` | Retrieve a specific task by ID | `200 OK` / `404 Not Found` |
| `POST` | `/tasks` | Create a new task item | `201 Created` / `400 Bad Request` |
| `PUT` | `/tasks/{id}` | Update task title or status | `200 OK` / `404 Not Found` |
| `DELETE` | `/tasks/{id}` | Delete a task permanently | `204 No Content` / `404 Not Found` |
| `GET` | `/stats` | Aggregated task metrics (`total_tasks`, `completed_tasks`, `pending_tasks`) | `200 OK` |

---

## Running Integration Tests
Execute the asynchronous HTTP integration test suite:
```bash
uv run pytest ../tests/test_w3_api.py -v
```
