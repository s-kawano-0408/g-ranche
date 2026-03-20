from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class ClientCreate(BaseModel):
    family_name: str
    given_name: str
    family_name_kana: str
    given_name_kana: str
    birth_date: date
    certificate_number: str
    gender: Optional[str] = None
    client_type: str
    staff_id: Optional[int] = None
    status: Optional[str] = "active"
    end_date: Optional[date] = None
    notes: Optional[str] = None


class ClientUpdate(BaseModel):
    certificate_number: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    client_type: Optional[str] = None
    staff_id: Optional[int] = None
    status: Optional[str] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None


class ClientResponse(BaseModel):
    id: int
    pseudonym_hash: str
    gender: Optional[str] = None
    client_type: str
    staff_id: Optional[int] = None
    status: Optional[str] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
