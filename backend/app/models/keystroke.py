"""
MindMirror AI — Pydantic Models: Keystroke
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class KeystrokeData(BaseModel):
    """Incoming keystroke metrics from the browser tracker."""
    wpm: float = Field(..., ge=0, description="Words per minute")
    avg_hold_time_ms: float = Field(..., ge=0, description="Average key hold duration")
    avg_flight_time_ms: float = Field(..., ge=0, description="Average inter-key time")
    pause_count: int = Field(..., ge=0, description="Pauses > 3 seconds")
    error_rate: float = Field(..., ge=0.0, le=1.0, description="Backspace frequency ratio")
    consistency_score: float = Field(..., ge=0.0, le=1.0, description="Rhythm consistency")
    window_seconds: int = Field(default=60, description="Measurement window in seconds")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class KeystrokeLog(BaseModel):
    """Stored keystroke record."""
    id: str
    user_id: str
    session_id: Optional[str] = None
    wpm: float
    avg_hold_time_ms: float
    avg_flight_time_ms: float
    pause_count: int
    error_rate: float
    consistency_score: float
    window_start: datetime
    window_end: datetime
    timestamp: datetime


class KeystrokeSummary(BaseModel):
    """Aggregated keystroke summary for a time period."""
    period_start: datetime
    period_end: datetime
    avg_wpm: float
    max_wpm: float
    min_wpm: float
    avg_error_rate: float
    avg_consistency: float
    total_pauses: int
    total_measurements: int
