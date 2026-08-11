# FlyRank AI - AI Backend Track

---

## Week 2 (Assignment A1) - In-Memory CRUD API

![SwaggerUI docs fastapi](static/image.png)

### Setup (Week 2)
1. Clone the repository:
   ```bash
   git clone https://github.com/UniverseScripts/flyrank-ai-backend.git
   ```
2. Run server with `uv`:
   ```bash
   uv run w2/main.py
   ```
   Or with standard `uvicorn`:
   ```bash
   uv run uvicorn w2.main:app --reload
   ```

### Endpoints
- `GET /tasks` - Retrieve all in-memory tasks
- `GET /tasks/{id}` - Retrieve task by ID
- `POST /tasks` - Create task
- `PUT /tasks/{id}` - Update task
- `DELETE /tasks/{id}` - Delete task

### Testing
```bash
curl -X GET http://localhost:8000/tasks
curl -X GET http://localhost:8000/tasks/1
curl -X POST http://localhost:8000/tasks -d '{"title": "Task 1"}'
curl -X PUT http://localhost:8000/tasks/1 -d '{"title": "Task 1", "done": true}'
curl -X DELETE http://localhost:8000/tasks/1
```

---

## Week 3 (Assignment A2) - Connecting Your CRUD to SQLite Database

### Architecture & SQLite Choice
- **Why SQLite?**: Serverless, zero-configuration, single-file database engine with native cross-platform support. It ensures data persists across server restarts while maintaining high performance and zero external daemon overhead.
- **Database File**: `tasks.db` (auto-generated on initial server startup).

### Quickstart (A2)
Run the application using `uv`:
```bash
uv run w3/main.py
```

### Stage 4: Explored SQLite (Manual SQL Queries)
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

## Week 3 (Assignment A3) - Containerize Your Stack (PostgreSQL + Docker Compose)

### Overview
Packages the Task CRUD REST API along with a containerized PostgreSQL database into an isolated, reproducible stack managed via Docker Compose.

### One-Command Startup
To start the entire application and database stack with a single command:

```bash
cd w3
docker compose up --build
```

- API Base URL: `http://localhost:8000`
- Swagger UI Documentation: `http://localhost:8000/docs`

To stop the stack:
```bash
docker compose down
```

### Environment Variables & Configuration

Configuration is managed via `.env` (git-ignored). A template is provided in [`.env.example`](.env.example):

| Variable | Description | Local Value | Docker Compose Value |
|---|---|---|---|
| `database_url` | Async PostgreSQL connection string | `postgresql+asyncpg://postgres:dev@localhost:5432/tasks` | `postgresql+asyncpg://postgres:dev@db:5432/tasks` |

To configure local development without Docker Compose:
```bash
cp .env.example .env
uv run w3/main.py
```

### API Endpoints

| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `GET` | `/health` | Application health check | `200 OK` |
| `GET` | `/tasks` | List all tasks (supports `?search=`, `?done=`, `?sort=`) | `200 OK` |
| `GET` | `/tasks/{id}` | Retrieve a task by ID | `200 OK` / `404 Not Found` |
| `POST` | `/tasks` | Create a new task | `201 Created` / `400 Bad Request` |
| `PUT` | `/tasks/{id}` | Update an existing task | `200 OK` / `404 Not Found` |
| `DELETE` | `/tasks/{id}` | Delete a task | `204 No Content` / `404 Not Found` |
| `GET` | `/stats` | Aggregated task metrics (`total`, `completed`, `pending`) | `200 OK` |

### Sample Request & Response (`curl -i`)

#### Create Task (`POST /tasks`)
```bash
curl -i -X POST "http://localhost:8000/tasks" \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"Deploy Container Stack\", \"done\": false}"
```

**Response Output:**
```http
HTTP/1.1 201 Created
date: Tue, 11 Aug 2026 09:37:00 GMT
server: uvicorn
content-length: 53
content-type: application/json

{"id":4,"title":"Deploy Container Stack","done":false}
```

#### Retrieve Tasks (`GET /tasks`)
```bash
curl -i "http://localhost:8000/tasks"
```

**Response Output:**
```http
HTTP/1.1 200 OK
date: Tue, 11 Aug 2026 09:37:05 GMT
server: uvicorn
content-length: 172
content-type: application/json

[
  {"id":1,"title":"Task 1","done":false},
  {"id":2,"title":"Task 2","done":false},
  {"id":3,"title":"Task 3","done":false},
  {"id":4,"title":"Deploy Container Stack","done":false}
]
```

### Database Verification (`psql`)

```bash
docker exec -it w3-db-1 psql -U postgres -d tasks
```

```sql
tasks=# \dt
         List of relations
 Schema | Name  | Type  |  Owner   
--------+-------+-------+----------
 public | tasks | table | postgres
(1 row)

tasks=# SELECT * FROM tasks;
 id |          title          | done 
----+-------------------------+------
  1 | Task 1                  | f
  2 | Task 2                  | f
  3 | Task 3                  | f
  4 | Deploy Container Stack  | f
(4 rows)

tasks=# \q
```

### Running Automated Tests
```bash
uv run pytest -v
```