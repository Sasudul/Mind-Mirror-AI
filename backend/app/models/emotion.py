"""
MindMirror AI — Pydantic Models: Emotion
"""

from datetime import datetime
from typing import Dict, Optional
from pydantic import BaseModel, Field


class EmotionData(BaseModel):
    """Incoming emotion data from browser face-api.js detection."""
    emotion: str = Field(..., description="Dominant emotion label")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    all_emotions: Dict[str, float] = Field(
        ..., description="Full emotion distribution"
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class EmotionLog(BaseModel):
    """Stored emotion record."""
    id: str
    user_id: str
    session_id: Optional[str] = None
    emotion: str
    confidence: float
    all_emotions: Dict[str, float]
    timestamp: datetime


class EmotionSummary(BaseModel):
    """Aggregated emotion summary for a time period."""
    period_start: datetime
    period_end: datetime
    dominant_emotion: str
    emotion_distribution: Dict[str, float]
    avg_confidence: float
    total_readings: int
    stress_percentage: float
    focus_percentage: float


class EmotionTimelinePoint(BaseModel):
    """Single point in an emotion timeline chart."""
    timestamp: datetime
    emotion: str
    confidence: float
    all_emotions: Dict[str, float]
