# FlyRank AI - AI Backend Track

## Week 2 - In-Memory CRUD API
![SwaggerUI docs fastapi](static/image.png)

### Setup (Week 2)
1. Clone the Repo:
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

---

## Week 3 - Connecting Your CRUD to SQLite Database

### Architecture & SQLite Choice
- **Why SQLite?**: Serverless, zero-configuration, single-file database engine with native cross-platform support. It ensures data persists across server restarts while maintaining high performance and zero external daemon overhead.
- **Database File**: `tasks.db` (auto-generated in workspace root on initial server startup).

### Quickstart (Week 3)
Run the application directly using `uv`:
```bash
uv run w3/main.py
```
Or run with `uvicorn`:
```bash
uv run uvicorn w3.main:app --reload --port 8000
```
Interactive API documentation will be available at `http://127.0.0.1:8000/docs`.

### Database Schema
Table: `tasks`
- `id` (INTEGER, Primary Key, Auto-increment)
- `title` (TEXT, Not Null)
- `done` (BOOLEAN, Default False / 0)

### Endpoints
- `GET /health` - Health check
- `GET /tasks` - Retrieve all tasks (supports query filters: `?search=term`, `?done=true|false`, `?sort=asc|desc`)
- `GET /tasks/{id}` - Retrieve task by ID
- `POST /tasks` - Create task (`201 Created`)
- `PUT /tasks/{id}` - Update task
- `DELETE /tasks/{id}` - Delete task (`204 No Content`)
- `GET /stats` - Aggregated task metrics (`total_tasks`, `completed_tasks`, `pending_tasks`)

### Stage 4: Explored SQLite (Manual SQL Queries)
Queries executed and validated directly via SQLite database client:
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

### Running Automated Tests
Execute the asynchronous pytest test suite using `uv`:
```bash
uv run pytest -v
```