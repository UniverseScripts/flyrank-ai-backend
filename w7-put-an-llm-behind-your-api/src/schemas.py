from pydantic import BaseModel, Field
from typing import Literal


class ClassifySupportMessageRequest(BaseModel):
    text: str = Field(..., description="The user's message")


class ClassifySupportMessageResponse(BaseModel):
    category: Literal["billing", "bug", "feature", "other"]
    urgency: Literal["low", "normal", "high"]
    confidence: float = Field(..., ge=0.0, le=1.0)
    reason: str