from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base


class SupportPlan(Base):
    __tablename__ = "support_plans"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    plan_date = Column(Date)
    long_term_goal = Column(Text)
    short_term_goal = Column(Text)
    service_contents = Column(JSON)  # list of services
    monitoring_interval = Column(Integer, default=6)  # months
    next_monitoring_date = Column(Date)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="support_plans")
