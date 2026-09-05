from sqlalchemy import Column, String, DateTime, Integer
from datetime import datetime, timezone
from db.config import Base

class Reports(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    path = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)