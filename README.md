# FlyRank AI - AI Backend Track

## Week 2
![SwaggerUI docs fastapi](static/image.png)

### Setup
1. Clone the Repo
```bash
git clone https://github.com/UniverseScripts/flyrank-ai-backend.git
```
2. Create a Virtual Environment
```bash
python -m venv .venv
```

3. Activate the Virtual Environment
```bash
.venv\Scripts\activate
```

4. Install Dependencies
```bash
pip install -r requirements.txt
```

5. Run the server
```bash
uvicorn w2.main:app --reload
```

6. Access the SwaggerUI docs at ``http://[IP_ADDRESS]/docs``

### Endpoints
- GET /tasks
- GET /tasks/{id}
- POST /tasks
- PUT /tasks/{id}
- DELETE /tasks/{id}

### Testing
```bash
curl -X GET http://localhost:8000/tasks
```
```bash
curl -X GET http://localhost:8000/tasks/1
```
```bash
curl -X POST http://localhost:8000/tasks -d '{"title": "Task 1"}'
```
```bash
curl -X PUT http://localhost:8000/tasks/1 -d '{"title": "Task 1", "done": true}'
```
```bash
curl -X DELETE http://localhost:8000/tasks/1
```