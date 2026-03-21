from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class CaseRecord(Base):
    __tablename__ = "case_records"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    staff_id = Column(Integer, ForeignKey("staffs.id"), nullable=False, index=True)
    record_date = Column(DateTime, nullable=False, index=True)
    record_type = Column(String)  # "面談"/"訪問"/"電話"/"モニタリング"/"サービス担当者会議"/"その他"
    content = Column(Text)
    summary = Column(Text)
    next_action = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="case_records")
    staff = relationship("Staff", back_populates="case_records")
