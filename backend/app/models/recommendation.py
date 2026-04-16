"""
MindMirror AI — Pydantic Models: Recommendation
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Recommendation(BaseModel):
    """AI-generated recommendation."""
    id: str
    user_id: str
    session_id: Optional[str] = None
    type: str  # break | task_switch | encouragement | warning | insight
    title: str
    message: str
    emoji: str
    urgency: str = "medium"  # low | medium | high | critical
    status: str = "pending"  # pending | dismissed | accepted
    feedback: Optional[str] = None  # helpful | not_helpful
    created_at: datetime
    responded_at: Optional[datetime] = None


class RecommendationCreate(BaseModel):
    """Internal model for creating a recommendation."""
    user_id: str
    session_id: Optional[str] = None
    type: str
    title: str
    message: str
    emoji: str
    urgency: str = "medium"


class RecommendationFeedback(BaseModel):
    """User feedback on a recommendation."""
    feedback: str = Field(..., pattern="^(helpful|not_helpful)$")
