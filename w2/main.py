from fastapi import FastAPI, HTTPException, status
from json import load
from pydantic import BaseModel
import os

with open(os.path.join(os.path.dirname(__file__), 'mock_data.json'), 'r') as f:
    data = load(f)

app = FastAPI(title="Flyrank AI", description="Flyrank AI Backend", version="0.0.1")

@app.get("/")
async def read_root():
    return { "name": "Task API", "version": "1.0", "endpoints": ["/tasks"] }

@app.get('/health')
async def check_health():
    return { "status": "ok" }

@app.get('/tasks')
async def get_tasks():
    return data["tasks"]

@app.get('/tasks/{id}')
async def get_task(id: int):
    for task in data["tasks"]:
        if task["id"] == id:
            return task
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {id} not found")

class TaskCreate(BaseModel):
    title: str

@app.post('/tasks')
async def create_task(task: TaskCreate, status_code: int = status.HTTP_201_CREATED):
    new_task = {
        "id": len(data["tasks"]) + 1,
        "title": task.title,
        "done": False
    }
    data["tasks"].append(new_task)
    return {"task": new_task }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run('main:app', host='127.0.0.1', port=8000, reload=True)
