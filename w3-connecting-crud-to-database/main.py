import sys
from pathlib import Path

from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db_engine import create_tables, engine, get_db
from db_models import Task
from helpers.seed_3 import seed_3_examples
from schemas.tasks import TaskCreate, TaskResponse, TaskStats, TaskUpdate


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    print("Creating tables...")
    await create_tables()
    print("Seeding 3 tasks...")
    seed_result = await seed_3_examples()
    if seed_result:
        print(seed_result)
    yield
    print("Shutting down...")
    await engine.dispose()


app = FastAPI(
    title="Flyrank AI - Week 3 Task API",
    description="Database-backed CRUD Task API with SQLite/Postgres and SQLAlchemy",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", summary="Health check")
async def health_check():
    return {"status": "ok"}

# A3 - Stage 2
@app.get("/tasks", response_model=List[TaskResponse], summary="Get all tasks with optional search/filter/sort")
async def get_tasks(
    search: Optional[str] = Query(None, description="Search term matching title"),
    done: Optional[bool] = Query(None, description="Filter tasks by done status"),
    sort: Optional[str] = Query(None, description="Sort order ('asc' or 'desc' by title)"),
    db: AsyncSession = Depends(get_db),
):
    try:
        stmt = select(Task)
        if search is not None:
            stmt = stmt.where(Task.title.ilike(f"%{search}%"))
        if done is not None:
            stmt = stmt.where(Task.done == done)
        if sort == "asc":
            stmt = stmt.order_by(Task.title.asc())
        elif sort == "desc":
            stmt = stmt.order_by(Task.title.desc())
        else:
            stmt = stmt.order_by(Task.id.asc())

        result = await db.execute(stmt)
        tasks = result.scalars().all()
        return tasks
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {str(e)}",
        )


@app.get("/tasks/{id}", response_model=TaskResponse, summary="Get task by ID")
async def get_task(id: int, db: AsyncSession = Depends(get_db)):
    try:
        stmt = select(Task).where(Task.id == id)
        result = await db.execute(stmt)
        task = result.scalar_one_or_none()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {str(e)}",
        )

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {id} not found",
        )
    return task

# A3 - Stage 3
@app.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED, summary="Create a new task")
async def create_task(task: TaskCreate, db: AsyncSession = Depends(get_db)):
    try:
        new_task = Task(
            title=task.title,
            done=task.done,
        )
        db.add(new_task)
        await db.commit()
        await db.refresh(new_task)
        return new_task
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create task: {str(e)}",
        )


@app.put("/tasks/{id}", response_model=TaskResponse, summary="Update task by ID")
async def update_task(id: int, payload: TaskUpdate, db: AsyncSession = Depends(get_db)):
    try:
        stmt = select(Task).where(Task.id == id)
        result = await db.execute(stmt)
        existing_task = result.scalar_one_or_none()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {str(e)}",
        )

    if existing_task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {id} not found",
        )

    try:
        if payload.title is not None:
            existing_task.title = payload.title
        if payload.done is not None:
            existing_task.done = payload.done

        await db.commit()
        await db.refresh(existing_task)
        return existing_task
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update task: {str(e)}",
        )


@app.delete("/tasks/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete task by ID")
async def delete_task(id: int, db: AsyncSession = Depends(get_db)):
    try:
        stmt = select(Task).where(Task.id == id)
        result = await db.execute(stmt)
        existing_task = result.scalar_one_or_none()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {str(e)}",
        )

    if existing_task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {id} not found",
        )

    try:
        await db.delete(existing_task)
        await db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete task: {str(e)}",
        )


@app.get("/stats", response_model=TaskStats, summary="Get task statistics (computed in SQL)")
async def get_stats(db: AsyncSession = Depends(get_db)):
    try:
        total_stmt = select(func.count(Task.id))
        completed_stmt = select(func.count(Task.id)).where(Task.done == True)  # noqa: E712
        pending_stmt = select(func.count(Task.id)).where(Task.done == False)  # noqa: E712

        total_res = await db.execute(total_stmt)
        completed_res = await db.execute(completed_stmt)
        pending_res = await db.execute(pending_stmt)

        total_tasks = total_res.scalar() or 0
        completed_tasks = completed_res.scalar() or 0
        pending_tasks = pending_res.scalar() or 0

        return TaskStats(
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            pending_tasks=pending_tasks,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute statistics: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)