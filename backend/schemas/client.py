from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class ClientBase(BaseModel):
    name: str
    name_kana: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    disability_type: Optional[str] = None
    disability_certificate_level: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    staff_id: Optional[int] = None
    status: Optional[str] = "active"
    intake_date: Optional[date] = None
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    name_kana: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    disability_type: Optional[str] = None
    disability_certificate_level: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    staff_id: Optional[int] = None
    status: Optional[str] = None
    intake_date: Optional[date] = None
    notes: Optional[str] = None


class ClientResponse(ClientBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
