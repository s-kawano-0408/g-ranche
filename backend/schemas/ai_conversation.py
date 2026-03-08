from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel


class AIConversationResponse(BaseModel):
    id: int
    session_id: str
    messages: Optional[List[Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    session_id: str
    message: str
    client_id: Optional[int] = None


class GeneratePlanRequest(BaseModel):
    client_id: int
    additional_info: Optional[str] = None


class SummarizeRecordRequest(BaseModel):
    record_id: int
    content: Optional[str] = None


class GenerateReportRequest(BaseModel):
    client_id: int
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    additional_notes: Optional[str] = None
