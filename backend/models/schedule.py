from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True, index=True)
    staff_id = Column(Integer, ForeignKey("staffs.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    schedule_type = Column(String)  # "面談"/"訪問"/"モニタリング"/"会議"/"その他"
    start_datetime = Column(DateTime, nullable=False, index=True)
    end_datetime = Column(DateTime, nullable=False)
    location = Column(String)
    notes = Column(Text)
    status = Column(String, default="scheduled")  # "scheduled"/"completed"/"cancelled"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="schedules")
    staff = relationship("Staff", back_populates="schedules")
