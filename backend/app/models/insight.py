"""
MindMirror AI — Pydantic Models: Insight
"""

from datetime import datetime, date
from typing import Dict, Optional, List
from pydantic import BaseModel


class DailyInsight(BaseModel):
    """Daily productivity insight."""
    date: date
    productivity_score: float
    total_focus_hours: float
    total_stress_hours: float
    total_work_hours: float
    peak_hour: int  # 0-23
    emotion_distribution: Dict[str, float]
    typing_stats: Dict[str, float]
    sessions_count: int
    breaks_taken: int


class WeeklyInsight(BaseModel):
    """Weekly trend analysis."""
    week_start: date
    week_end: date
    daily_scores: List[float]  # Mon-Sun productivity scores
    avg_productivity: float
    best_day: str
    worst_day: str
    emotion_trend: Dict[str, List[float]]
    avg_typing_speed: float
    total_focus_hours: float
    total_work_hours: float


class MonthlyInsight(BaseModel):
    """Monthly report data."""
    month: int
    year: int
    daily_scores: List[Optional[float]]  # Score per day of month
    avg_productivity: float
    total_focus_hours: float
    total_work_hours: float
    emotion_summary: Dict[str, float]
    peak_hour: int
    improvement_trend: str  # improving | declining | stable


class HeatmapData(BaseModel):
    """Hour-by-hour productivity heatmap."""
    date: date
    hours: Dict[str, float]  # {"0": score, "1": score, ...}
    dominant_emotions: Dict[str, str]  # {"0": "focused", "1": "neutral", ...}


class PeakHoursData(BaseModel):
    """Peak productivity hours analysis."""
    hour: int
    avg_productivity: float
    avg_focus: float
    avg_stress: float
    sample_count: int
