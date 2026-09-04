from pydantic import BaseModel, Field
from db.config import Base
from sqlalchemy import Column, Integer, String, Float

class Books(Base):
    __tablename__ = "books"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, index=True, nullable=False)
    price = Column(Float, nullable=False)
    rating = Column(Integer, nullable=False)
    url = Column(String, nullable=False)