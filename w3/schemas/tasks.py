from pydantic import BaseModel, Field

class TaskBase(BaseModel):
    title: str = Field(..., description="Title of the task")
    done: bool = Field(default=False, description="Done status of the task")

class TaskCreate(TaskBase):
    pass
