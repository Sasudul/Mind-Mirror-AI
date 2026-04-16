"""
MindMirror AI — Keystroke Analysis Service
Processes typing metrics to infer cognitive state.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Optional

from bson import ObjectId
from app.core.database import database


class KeystrokeService:
    """Analyzes keystroke dynamics to detect focus, fatigue, and distraction."""

    async def get_baseline(self, user_id: str, days: int = 7) -> Dict:
        """Calculate user's baseline typing metrics from historical data."""
        since = datetime.now(timezone.utc) - timedelta(days=days)
        user_oid = ObjectId(user_id)

        pipeline = [
            {"$match": {"user_id": user_oid, "timestamp": {"$gte": since}}},
            {"$group": {
                "_id": None,
                "avg_wpm": {"$avg": "$wpm"},
                "avg_hold": {"$avg": "$avg_hold_time_ms"},
                "avg_flight": {"$avg": "$avg_flight_time_ms"},
                "avg_error": {"$avg": "$error_rate"},
                "avg_consistency": {"$avg": "$consistency_score"},
                "count": {"$sum": 1},
            }},
        ]

        result = await database.keystrokes.aggregate(pipeline).to_list(1)
        if not result:
            return {
                "avg_wpm": 40, "avg_hold_ms": 100, "avg_flight_ms": 150,
                "avg_error_rate": 0.05, "avg_consistency": 0.7, "sample_count": 0,
            }

        data = result[0]
        return {
            "avg_wpm": round(data["avg_wpm"], 1),
            "avg_hold_ms": round(data["avg_hold"], 1),
            "avg_flight_ms": round(data["avg_flight"], 1),
            "avg_error_rate": round(data["avg_error"], 3),
            "avg_consistency": round(data["avg_consistency"], 3),
            "sample_count": data["count"],
        }

    async def analyze_current_state(
        self, user_id: str, current_data: Dict
    ) -> Dict:
        """Compare current metrics against baseline to infer cognitive state."""
        baseline = await self.get_baseline(user_id)

        current_wpm = current_data.get("wpm", 0)
        baseline_wpm = baseline["avg_wpm"]
        current_error = current_data.get("error_rate", 0)
        baseline_error = baseline["avg_error_rate"]
        consistency = current_data.get("consistency_score", 0)
        pause_count = current_data.get("pause_count", 0)

        # Infer state
        state = "normal"
        confidence = 0.5

        if baseline_wpm > 0:
            wpm_ratio = current_wpm / baseline_wpm

            # High speed + high errors = stress
            if wpm_ratio > 1.1 and current_error > baseline_error * 1.5:
                state = "stressed"
                confidence = min(0.9, 0.5 + (current_error - baseline_error) * 2)

            # Consistent speed + low errors = focused
            elif 0.85 <= wpm_ratio <= 1.15 and consistency > 0.7 and pause_count <= 2:
                state = "focused"
                confidence = min(0.9, consistency)

            # Low speed + many pauses = fatigued/distracted
            elif wpm_ratio < 0.6 or pause_count >= 5:
                state = "fatigued"
                confidence = min(0.9, 0.5 + (1 - wpm_ratio) * 0.5)

            # Low speed + high errors = struggling
            elif wpm_ratio < 0.7 and current_error > baseline_error * 1.3:
                state = "struggling"
                confidence = 0.7

        return {
            "state": state,
            "confidence": round(confidence, 2),
            "wpm_vs_baseline": round(current_wpm / max(baseline_wpm, 1) * 100, 1),
            "error_vs_baseline": round(current_error / max(baseline_error, 0.01) * 100, 1),
            "baseline": baseline,
        }


keystroke_service = KeystrokeService()
