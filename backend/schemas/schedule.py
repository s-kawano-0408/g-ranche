from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ScheduleBase(BaseModel):
    client_id: Optional[int] = None
    staff_id: int
    title: str
    schedule_type: Optional[str] = None
    start_datetime: datetime
    end_datetime: datetime
    location: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "scheduled"


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    client_id: Optional[int] = None
    title: Optional[str] = None
    schedule_type: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class ScheduleResponse(ScheduleBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
