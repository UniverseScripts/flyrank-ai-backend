from pydantic import BaseModel

class ReportRequest(BaseModel):
    """Request schema for creating a new report"""
    topic: str