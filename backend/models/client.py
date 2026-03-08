from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    name_kana = Column(String)
    birth_date = Column(Date)
    gender = Column(String)  # "男性"/"女性"/"その他"
    disability_type = Column(String)  # "身体障害"/"知的障害"/"精神障害"/"発達障害"/"難病"
    disability_certificate_level = Column(String)
    address = Column(String)
    phone = Column(String)
    emergency_contact = Column(String)
    emergency_phone = Column(String)
    staff_id = Column(Integer, ForeignKey("staffs.id"))
    status = Column(String, default="active")  # "active"/"inactive"
    intake_date = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    staff = relationship("Staff", back_populates="clients")
    support_plans = relationship("SupportPlan", back_populates="client")
    case_records = relationship("CaseRecord", back_populates="client")
    schedules = relationship("Schedule", back_populates="client")
