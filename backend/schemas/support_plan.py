from datetime import date, datetime
from typing import Optional, List, Any
from pydantic import BaseModel


class SupportPlanBase(BaseModel):
    client_id: int
    plan_date: Optional[date] = None
    long_term_goal: Optional[str] = None
    short_term_goal: Optional[str] = None
    service_contents: Optional[List[Any]] = None
    monitoring_interval: Optional[int] = 6
    next_monitoring_date: Optional[date] = None
    status: Optional[str] = "active"


class SupportPlanCreate(SupportPlanBase):
    pass


class SupportPlanUpdate(BaseModel):
    plan_date: Optional[date] = None
    long_term_goal: Optional[str] = None
    short_term_goal: Optional[str] = None
    service_contents: Optional[List[Any]] = None
    monitoring_interval: Optional[int] = None
    next_monitoring_date: Optional[date] = None
    status: Optional[str] = None


class SupportPlanResponse(SupportPlanBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
