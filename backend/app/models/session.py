"""
MindMirror AI — Pydantic Models: Session
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    """Request to start a new work session."""
    notes: Optional[str] = None


class SessionEnd(BaseModel):
    """Request to end the current session."""
    notes: Optional[str] = None


class Session(BaseModel):
    """Full session record."""
    id: str
    user_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: float = 0
    productivity_score: float = 0
    dominant_emotion: str = "neutral"
    focus_percentage: float = 0
    stress_percentage: float = 0
    breaks_taken: int = 0
    typing_avg_wpm: float = 0
    status: str = "active"  # active | paused | completed
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class SessionSummary(BaseModel):
    """Brief session summary for lists."""
    id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: float
    productivity_score: float
    dominant_emotion: str
    status: str
