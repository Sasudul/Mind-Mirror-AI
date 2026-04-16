"""
MindMirror AI — Analytics Service
Combines emotion + keystroke data into composite productivity metrics.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional

from bson import ObjectId
from app.core.database import database


class AnalyticsService:
    """Generates composite productivity scores and trend analysis."""

    async def calculate_productivity_score(
        self, user_id: str, window_minutes: int = 30
    ) -> float:
        """
        Calculate composite productivity score (0-100).
        Formula: (focus_weight * focus_score) + (typing_weight * consistency) - (stress_penalty * stress)
        """
        since = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
        user_oid = ObjectId(user_id)

        # Emotion component
        emotion_pipeline = [
            {"$match": {"user_id": user_oid, "timestamp": {"$gte": since}}},
            {"$group": {
                "_id": None,
                "total": {"$sum": 1},
                "focus": {"$sum": {"$cond": [{"$in": ["$emotion", ["neutral", "happy"]]}, 1, 0]}},
                "stress": {"$sum": {"$cond": [
                    {"$in": ["$emotion", ["angry", "fearful", "disgusted", "sad"]]}, 1, 0
                ]}},
            }},
        ]
        emotion_result = await database.emotions.aggregate(emotion_pipeline).to_list(1)

        focus_score = 50
        stress_score = 0
        if emotion_result:
            er = emotion_result[0]
            total = max(er["total"], 1)
            focus_score = er["focus"] / total * 100
            stress_score = er["stress"] / total * 100

        # Typing component
        ks_pipeline = [
            {"$match": {"user_id": user_oid, "timestamp": {"$gte": since}}},
            {"$group": {
                "_id": None,
                "avg_consistency": {"$avg": "$consistency_score"},
                "avg_wpm": {"$avg": "$wpm"},
            }},
        ]
        ks_result = await database.keystrokes.aggregate(ks_pipeline).to_list(1)

        typing_score = 50
        if ks_result:
            kr = ks_result[0]
            typing_score = (kr.get("avg_consistency", 0.5)) * 100

        # Composite score
        productivity = (
            0.50 * focus_score +
            0.25 * typing_score -
            0.25 * stress_score
        )

        return round(max(0, min(100, productivity)), 1)

    async def get_trend(
        self, user_id: str, days: int = 7
    ) -> str:
        """Analyze productivity trend: improving, declining, or stable."""
        user_oid = ObjectId(user_id)
        now = datetime.now(timezone.utc)

        # Get average score for first half vs second half of the period
        midpoint = now - timedelta(days=days // 2)
        start = now - timedelta(days=days)

        async def avg_score(start_dt, end_dt):
            pipeline = [
                {"$match": {
                    "user_id": user_oid,
                    "start_time": {"$gte": start_dt, "$lt": end_dt},
                    "status": "completed",
                }},
                {"$group": {"_id": None, "avg": {"$avg": "$productivity_score"}}},
            ]
            result = await database.sessions.aggregate(pipeline).to_list(1)
            return result[0]["avg"] if result else 0

        first_half = await avg_score(start, midpoint)
        second_half = await avg_score(midpoint, now)

        if second_half > first_half * 1.1:
            return "improving"
        elif second_half < first_half * 0.9:
            return "declining"
        return "stable"


analytics_service = AnalyticsService()
