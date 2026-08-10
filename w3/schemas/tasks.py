from pydantic import BaseModel, Field
from typing import Optional

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, description="Title of the task")
    done: bool = Field(default=False, description="Done status of the task")

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, description="Updated title of the task")
    done: Optional[bool] = Field(None, description="Updated done status of the task")

class TaskResponse(BaseModel):
    id: int
    title: str
    done: bool

    class Config:
        from_attributes = True

class TaskStats(BaseModel):
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
