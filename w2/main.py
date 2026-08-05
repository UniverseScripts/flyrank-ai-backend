from fastapi import FastAPI, HTTPException, status
from json import load
from pydantic import BaseModel
from typing import Optional
import os

with open(os.path.join(os.path.dirname(__file__), 'mock_data.json'), 'r') as f:
    data = load(f)

app = FastAPI(title="Flyrank AI", description="Flyrank AI Backend", version="0.0.1")

@app.get("/", description="App info")
async def read_root():
    return { "name": "Task API", "version": "1.0", "endpoints": ["/tasks"] }

@app.get('/health', description="Health check")
async def check_health():
    return { "status": "ok" }

@app.get('/tasks', description="Get all tasks")
async def get_tasks():
    return data["tasks"]

@app.get('/tasks/{id}', description="Get task by id")
async def get_task(id: int):
    for task in data["tasks"]:
        if task["id"] == id:
            return task
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {id} not found")

class Task(BaseModel):
    id: int
    title: str
    done: bool

class TaskCreate(BaseModel):
    title: str

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    done: Optional[bool] = None

@app.post('/tasks', description="Create a new task", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(task: TaskCreate):
    new_task = {
        "id": len(data["tasks"]) + 1,
        "title": task.title,
        "done": False
    }
    data["tasks"].append(new_task)
    return {"task": new_task }

@app.put('/tasks/{id}', description="Update a task", response_model=Task, status_code=status.HTTP_202_ACCEPTED)
async def update_task(id: int, payload: TaskUpdate):
    for task in data["tasks"]:
        if task["id"] == id:
            if payload.title:
                task["title"] = payload.title
            if payload.done is not None:
                task["done"] = payload.done
            return {"task": task }
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {id} not found")

@app.delete('/tasks/{id}', description="Delete a task", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(id: int):
    for task in data["tasks"]:
        if task["id"] == id:
            data["tasks"].remove(task)
            return {"task": task }
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {id} not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run('main:app', host='127.0.0.1', port=8000, reload=True)
