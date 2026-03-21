from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    pseudonym_hash = Column(String, unique=True, nullable=False)
    gender = Column(String)
    client_type = Column(String, nullable=False)  # "児"/"者"
    staff_id = Column(Integer, ForeignKey("staffs.id"), index=True)
    status = Column(String, default="active", index=True)  # "active"/"inactive"
    notes = Column(Text)
    end_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    staff = relationship("Staff", back_populates="clients")
    support_plans = relationship("SupportPlan", back_populates="client")
    case_records = relationship("CaseRecord", back_populates="client")
    schedules = relationship("Schedule", back_populates="client")
