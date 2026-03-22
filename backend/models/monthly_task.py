from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from database import Base


class MonthlyTask(Base):
    __tablename__ = "monthly_tasks"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    task_type = Column(String, nullable=False)  # "モニタ"/"最終モニタ"/"更新"/"新+モニ"/"その他"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("client_id", "year", "month", name="uq_client_year_month"),
        Index("ix_monthly_task_composite", "client_id", "year", "month"),
    )

    # Relationships
    client = relationship("Client", backref="monthly_tasks")
