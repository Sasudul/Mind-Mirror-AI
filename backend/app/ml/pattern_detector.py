"""
MindMirror AI — Pattern Detection Module
Detects burnout patterns, circadian rhythms, and behavioral anomalies.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional

from bson import ObjectId
from app.core.database import database


class PatternDetector:
    """Detects long-term productivity patterns and anomalies."""

    async def detect_burnout_risk(self, user_id: str, lookback_days: int = 7) -> Dict:
        """
        Detect burnout risk based on consecutive high-stress days.
        Returns risk level: none, low, moderate, high, critical.
        """
        user_oid = ObjectId(user_id)
        now = datetime.now(timezone.utc)

        high_stress_days = 0
        consecutive_streak = 0
        max_streak = 0

        for day_offset in range(lookback_days):
            day = now - timedelta(days=day_offset)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            pipeline = [
                {"$match": {
                    "user_id": user_oid,
                    "timestamp": {"$gte": day_start, "$lt": day_end},
                }},
                {"$group": {
                    "_id": None,
                    "total": {"$sum": 1},
                    "stress": {"$sum": {"$cond": [
                        {"$in": ["$emotion", ["angry", "fearful", "disgusted", "sad"]]},
                        1, 0,
                    ]}},
                }},
            ]

            result = await database.emotions.aggregate(pipeline).to_list(1)
            if result and result[0]["total"] > 0:
                stress_ratio = result[0]["stress"] / result[0]["total"]
                if stress_ratio > 0.4:
                    high_stress_days += 1
                    consecutive_streak += 1
                    max_streak = max(max_streak, consecutive_streak)
                else:
                    consecutive_streak = 0

        # Determine risk level
        if max_streak >= 5:
            risk = "critical"
        elif max_streak >= 3:
            risk = "high"
        elif high_stress_days >= 4:
            risk = "moderate"
        elif high_stress_days >= 2:
            risk = "low"
        else:
            risk = "none"

        return {
            "risk_level": risk,
            "high_stress_days": high_stress_days,
            "max_consecutive_streak": max_streak,
            "lookback_days": lookback_days,
        }

    async def get_circadian_pattern(self, user_id: str, days: int = 30) -> List[Dict]:
        """
        Analyze when user is most productive throughout the day.
        Returns hourly productivity profile.
        """
        user_oid = ObjectId(user_id)
        since = datetime.now(timezone.utc) - timedelta(days=days)

        pipeline = [
            {"$match": {"user_id": user_oid, "timestamp": {"$gte": since}}},
            {"$group": {
                "_id": {"$hour": "$timestamp"},
                "total": {"$sum": 1},
                "focus": {"$sum": {"$cond": [
                    {"$in": ["$emotion", ["neutral", "happy"]]}, 1, 0
                ]}},
                "stress": {"$sum": {"$cond": [
                    {"$in": ["$emotion", ["angry", "fearful", "disgusted", "sad"]]}, 1, 0
                ]}},
            }},
            {"$sort": {"_id": 1}},
        ]

        result = await database.emotions.aggregate(pipeline).to_list(24)

        pattern = []
        peak_hour = 0
        peak_focus = 0

        for r in result:
            total = max(r["total"], 1)
            focus_pct = round(r["focus"] / total * 100, 1)
            if focus_pct > peak_focus:
                peak_focus = focus_pct
                peak_hour = r["_id"]

            pattern.append({
                "hour": r["_id"],
                "focus_percentage": focus_pct,
                "stress_percentage": round(r["stress"] / total * 100, 1),
                "sample_count": r["total"],
            })

        return pattern

    async def find_peak_hours(self, user_id: str, days: int = 30, top_n: int = 3) -> List[int]:
        """Find the top N most productive hours for the user."""
        pattern = await self.get_circadian_pattern(user_id, days)
        sorted_hours = sorted(pattern, key=lambda x: x["focus_percentage"], reverse=True)
        return [h["hour"] for h in sorted_hours[:top_n]]


pattern_detector = PatternDetector()
