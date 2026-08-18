# FlyRank AI - AI Backend Track

---

## Week 2 (Assignment A1) - In-Memory CRUD API

![SwaggerUI docs fastapi](static/w1.png)

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

### Environment Variables & Configuration (A3)

Configuration is managed via `.env` (git-ignored). A template is provided in [`.env.example`](.env.example):

| Variable | Description | Local Value | Docker Compose Value |
|---|---|---|---|
| `database_url` | Async PostgreSQL connection string | `postgresql+asyncpg://postgres:dev@localhost:5432/tasks` | `postgresql+asyncpg://postgres:dev@db:5432/tasks` |

To configure local development without Docker Compose:
```bash
cp .env.example .env
uv run w3/main.py
```

### API Endpoints (A3)

| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `GET` | `/health` | Application health check | `200 OK` |
| `GET` | `/tasks` | List all tasks (supports `?search=`, `?done=`, `?sort=`) | `200 OK` |
| `GET` | `/tasks/{id}` | Retrieve a task by ID | `200 OK` / `404 Not Found` |
| `POST` | `/tasks` | Create a new task | `201 Created` / `400 Bad Request` |
| `PUT` | `/tasks/{id}` | Update an existing task | `200 OK` / `404 Not Found` |
| `DELETE` | `/tasks/{id}` | Delete a task | `204 No Content` / `404 Not Found` |
| `GET` | `/stats` | Aggregated task metrics (`total`, `completed`, `pending`) | `200 OK` |

---

## Week 4 (Assignment A4) - Auth · Login & Protect (Supabase Auth & JWT Middleware)

![Swagger UI Bearer Auth](static/w4.png)

### Overview
Integrates **Supabase Auth** as the external Identity Provider (IdP). Implements full user authentication lifecycles (Signup, Login, Logout), cryptographic JWT bearer token verification via FastAPI dependencies, and interactive Swagger UI documentation with bearer authorization padlocks.

### Environment Setup (A4)
Create a `.env` file in `w4/` based on [`w4/.env.example`](w4/.env.example):

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key
PORT=8000
```

> [!CAUTION]
> Never commit `.env` or use the `service_role` key in client configurations. Only use the public `anon` key.

### Startup Command
Run the application directly using `uv`:
```bash
uv run w4/main.py
```
- API Base URL: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`

---

### API Endpoints & Auth Matrix (A4)

| Method | Endpoint | Description | Auth Required | Status Code |
|---|---|---|---|---|
| `POST` | `/auth/signup` | Register a new user account | No | `201 Created` / `400 Bad Request` |
| `POST` | `/auth/login` | Authenticate credentials and receive JWT | No | `200 OK` / `401 Unauthorized` |
| `POST` | `/auth/logout` | Terminate user session | Yes (`Bearer <token>`) | `204 No Content` / `401 Unauthorized` |
| `GET` | `/public/info` | Public open endpoint | No | `200 OK` |
| `GET` | `/protected/profile` | Retrieve verified user metadata | Yes (`Bearer <token>`) | `200 OK` / `401 Unauthorized` |
| `GET` | `/protected/dashboard`| Reusable guard verification route | Yes (`Bearer <token>`) | `200 OK` / `401 Unauthorized` |

---

### End-to-End Authentication Flow (`curl -i`)

#### 1. Sign Up (`POST /auth/signup`)
```bash
curl -i -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"developer@example.com\",\"password\":\"securepass123\"}"
```
**Response:**
```http
HTTP/1.1 201 Created
content-type: application/json

{"id":"d954e7d1-cf1b-4f9e-a02b-e7b8972e391a","email":"developer@example.com","created_at":"2026-08-18T10:00:00Z"}
```

#### 2. Log In (`POST /auth/login`)
```bash
curl -i -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"developer@example.com\",\"password\":\"securepass123\"}"
```
**Response:**
```http
HTTP/1.1 200 OK
content-type: application/json

{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "v0_refresh_token_string...",
  "token_type": "bearer",
  "user": {"id":"d954e7d1-cf1b-4f9e-a02b-e7b8972e391a","email":"developer@example.com"}
}
```

#### 3. Access Protected Route with Bearer Token (`GET /protected/profile`)
```bash
curl -i http://localhost:8000/protected/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```
**Response:**
```http
HTTP/1.1 200 OK
content-type: application/json

{
  "id": "d954e7d1-cf1b-4f9e-a02b-e7b8972e391a",
  "email": "developer@example.com",
  "role": "authenticated"
}
```

#### 4. Access Protected Route with Forged/Tampered Token
```bash
curl -i http://localhost:8000/protected/profile \
  -H "Authorization: Bearer invalid_or_tampered_token"
```
**Response:**
```http
HTTP/1.1 401 Unauthorized
content-type: application/json

{"detail":"Invalid or expired token"}
```

#### 5. Log Out (`POST /auth/logout`)
```bash
curl -i -X POST http://localhost:8000/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```
**Response:**
```http
HTTP/1.1 204 No Content
```