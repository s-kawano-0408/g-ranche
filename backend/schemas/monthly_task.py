from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class MonthlyTaskCreate(BaseModel):
    client_id: int
    year: int
    month: int
    task_type: str


class MonthlyTaskUpdate(BaseModel):
    task_type: Optional[str] = None


class MonthlyTaskResponse(BaseModel):
    id: int
    client_id: int
    year: int
    month: int
    task_type: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
