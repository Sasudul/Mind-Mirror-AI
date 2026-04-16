"""
MindMirror AI — Emotion Aggregation Service
Processes and aggregates raw emotion data into meaningful insights.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from collections import Counter

from bson import ObjectId
from app.core.database import database


class EmotionService:
    """Aggregates raw emotion frames into time-bucketed summaries."""

    STRESS_EMOTIONS = {"angry", "fearful", "disgusted", "sad"}
    FOCUS_EMOTIONS = {"neutral", "happy"}

    async def get_rolling_average(
        self, user_id: str, window_minutes: int = 5
    ) -> Dict:
        """Calculate rolling emotion averages over a time window."""
        since = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
        user_oid = ObjectId(user_id)

        pipeline = [
            {"$match": {"user_id": user_oid, "timestamp": {"$gte": since}}},
            {"$group": {
                "_id": None,
                "emotions": {"$push": "$emotion"},
                "avg_confidence": {"$avg": "$confidence"},
                "count": {"$sum": 1},
            }},
        ]

        result = await database.emotions.aggregate(pipeline).to_list(1)
        if not result:
            return {
                "dominant": "neutral",
                "stress_level": 0,
                "focus_level": 0,
                "confidence": 0,
                "sample_count": 0,
            }

        data = result[0]
        emotions = data["emotions"]
        total = data["count"]
        counter = Counter(emotions)

        stress = sum(counter.get(e, 0) for e in self.STRESS_EMOTIONS)
        focus = sum(counter.get(e, 0) for e in self.FOCUS_EMOTIONS)

        return {
            "dominant": counter.most_common(1)[0][0],
            "stress_level": round(stress / total * 100, 1),
            "focus_level": round(focus / total * 100, 1),
            "confidence": round(data["avg_confidence"], 3),
            "sample_count": total,
        }

    async def get_minute_buckets(
        self, user_id: str, hours: int = 2
    ) -> List[Dict]:
        """Aggregate emotions into 1-minute buckets for timeline charts."""
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        user_oid = ObjectId(user_id)

        pipeline = [
            {"$match": {"user_id": user_oid, "timestamp": {"$gte": since}}},
            {"$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%dT%H:%M",
                        "date": "$timestamp",
                    }
                },
                "dominant": {"$first": "$emotion"},
                "avg_confidence": {"$avg": "$confidence"},
                "count": {"$sum": 1},
            }},
            {"$sort": {"_id": 1}},
        ]

        result = await database.emotions.aggregate(pipeline).to_list(hours * 60)
        return [
            {
                "minute": r["_id"],
                "emotion": r["dominant"],
                "confidence": round(r["avg_confidence"], 3),
                "readings": r["count"],
            }
            for r in result
        ]

    async def detect_sustained_stress(
        self, user_id: str, threshold_minutes: int = 15, threshold_ratio: float = 0.7
    ) -> bool:
        """Detect if user has been stressed for an extended period."""
        avg = await self.get_rolling_average(user_id, threshold_minutes)
        return avg["stress_level"] >= threshold_ratio * 100


emotion_service = EmotionService()
