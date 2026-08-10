from fastapi import FastAPI, HTTPException, Depends, status
from contextlib import asynccontextmanager
from sqlalchemy import select, insert
from sqlalchemy.ext.asyncio import AsyncSession
from w3.db_engine import create_tables, get_db, engine
from w3.helper.seed_3 import seed_3_examples
from w3.db_models import Task
from w3.schemas.tasks import TaskCreate

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    print("Creating tables...")
    await create_tables()
    print("Seeding 3 tasks")
    seed_3 = await seed_3_examples()
    if seed_3:
        print(seed_3)
    yield
    print("Shutting down...")
    await engine.dispose()

app = FastAPI(lifespan=lifespan)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Return all tasks from the database

@app.get("/tasks")
async def get_tasks(db: AsyncSession = Depends(get_db)):
    try:
        stmt = select(Task)
        result = await db.execute(stmt)
        tasks = result.scalars().all()
        return tasks
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.get("/tasks/{id}")
async def get_task(id: int, db: AsyncSession = Depends(get_db)):
    try:
        stmt = select(Task).where(Task.id == id)
        result = await db.execute(stmt)
        task = result.scalar_one_or_none()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@app.post("/tasks", status_code=status.HTTP_201_CREATED)
async def create_task(task: TaskCreate, db: AsyncSession = Depends(get_db)):
    try:
        new_task = Task(
            title=task.title,
            done=task.done
        )
        db.add(new_task)
        await db.commit()
        await db.refresh(new_task)
        return {"message": "Task created successfully", "task": new_task}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.put("/tasks/{id}")
async def update_task(id: int, task: TaskCreate, db: AsyncSession = Depends(get_db)):
    try:
        stmt = select(Task).where(Task.id == id)
        result = await db.execute(stmt)
        new_task = result.scalar_one_or_none()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    if new_task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    new_task.title = task.title
    new_task.done = task.done
    await db.commit()
    await db.refresh(new_task)
    return {"message": "Task updated successfully", "task": new_task}

@app.delete("/tasks/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(id: int, db: AsyncSession = Depends(get_db)):
    try:
        stmt = select(Task).where(Task.id == id)
        result = await db.execute(stmt)
        task = result.scalar_one_or_none()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    await db.delete(task)
    await db.commit()