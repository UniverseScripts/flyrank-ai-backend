from pydantic import BaseModel
from typing import Optional

class ReportRequest(BaseModel):
    """
    Schema definition for a report request.
    """
    force: Optional[bool] = False
