# Week 2 (Assignment A1) - In-Memory CRUD API

> High-performance in-memory Task management REST API built with FastAPI and Pydantic v2.

---

## Visual Documentation

![SwaggerUI docs fastapi](../static/w1.png)

---

## Setup & Quickstart

### Prerequisites
- Python 3.10+
- `uv` (recommended) or standard `pip`

### 1. Installation
Install dependencies:
```bash
uv pip install -r requirements.txt
```

### 2. Run the Server
Using Python module execution with `uv`:
```bash
uv run --directory . python -m uvicorn main:app --reload
```
Or directly from the assignment folder:
```bash
uv run main.py
```

- **Base URL**: `http://localhost:8000`
- **Interactive Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## API Endpoints

| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `GET` | `/` | Service metadata and version info | `200 OK` |
| `GET` | `/health` | Application health check probe | `200 OK` |
| `GET` | `/tasks` | Retrieve all in-memory tasks | `200 OK` |
| `GET` | `/tasks/{id}` | Retrieve a specific task by its integer ID | `200 OK` / `404 Not Found` |
| `POST` | `/tasks` | Create a new task (auto-incrementing ID) | `201 Created` |
| `PUT` | `/tasks/{id}` | Partially update an existing task title or status | `202 Accepted` / `404 Not Found` |
| `DELETE` | `/tasks/{id}` | Remove a task from the in-memory store | `204 No Content` / `404 Not Found` |

---

## Verification & Testing (`curl`)

```bash
# Health probe
curl -X GET http://localhost:8000/health

# List all tasks
curl -X GET http://localhost:8000/tasks

# Retrieve single task
curl -X GET http://localhost:8000/tasks/1

# Create new task
curl -X POST http://localhost:8000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Deploy initial prototype"}'

# Update task status
curl -X PUT http://localhost:8000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Task Title", "done": true}'

# Delete task
curl -X DELETE http://localhost:8000/tasks/1
```
