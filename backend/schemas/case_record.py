from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CaseRecordBase(BaseModel):
    client_id: int
    staff_id: int
    record_date: datetime
    record_type: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    next_action: Optional[str] = None


class CaseRecordCreate(CaseRecordBase):
    pass


class CaseRecordUpdate(BaseModel):
    record_date: Optional[datetime] = None
    record_type: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    next_action: Optional[str] = None


class CaseRecordResponse(CaseRecordBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
