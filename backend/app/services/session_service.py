"""
MindMirror AI — Session Management Service
Handles session lifecycle and scoring.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict
from collections import Counter

from bson import ObjectId
from app.core.database import database


class SessionService:
    """Manages work session lifecycle and calculates session scores."""

    async def get_active_session(self, user_id: str) -> Optional[Dict]:
        """Get the current active session for a user."""
        user_oid = ObjectId(user_id)
        session = await database.sessions.find_one(
            {"user_id": user_oid, "status": "active"},
            sort=[("start_time", -1)],
        )
        if session:
            session["_id"] = str(session["_id"])
            session["user_id"] = str(session["user_id"])
        return session

    async def update_session_stats(self, session_id: str) -> Dict:
        """Recalculate and update session statistics."""
        session_oid = ObjectId(session_id)
        now = datetime.now(timezone.utc)

        session = await database.sessions.find_one({"_id": session_oid})
        if not session:
            return {}

        duration = (now - session["start_time"]).total_seconds() / 60

        # Emotion stats
        emotion_pipeline = [
            {"$match": {"session_id": session_oid}},
            {"$group": {
                "_id": None,
                "emotions": {"$push": "$emotion"},
                "total": {"$sum": 1},
            }},
        ]
        emotion_result = await database.emotions.aggregate(emotion_pipeline).to_list(1)

        dominant = "neutral"
        focus_pct = 0
        stress_pct = 0

        if emotion_result:
            er = emotion_result[0]
            emotions = er["emotions"]
            total = max(er["total"], 1)
            counter = Counter(emotions)
            dominant = counter.most_common(1)[0][0]
            focus_pct = round(
                sum(1 for e in emotions if e in ["neutral", "happy"]) / total * 100, 1
            )
            stress_pct = round(
                sum(1 for e in emotions if e in ["angry", "fearful", "disgusted", "sad"]) / total * 100, 1
            )

        # Typing stats
        ks_pipeline = [
            {"$match": {"session_id": session_oid}},
            {"$group": {"_id": None, "avg_wpm": {"$avg": "$wpm"}}},
        ]
        ks_result = await database.keystrokes.aggregate(ks_pipeline).to_list(1)
        avg_wpm = round(ks_result[0]["avg_wpm"], 1) if ks_result else 0

        # Productivity score
        productivity = min(100, max(0,
            focus_pct * 0.6 +
            (100 - stress_pct) * 0.3 +
            min(avg_wpm, 80) / 80 * 10
        ))

        update = {
            "duration_minutes": round(duration, 1),
            "productivity_score": round(productivity, 1),
            "dominant_emotion": dominant,
            "focus_percentage": focus_pct,
            "stress_percentage": stress_pct,
            "typing_avg_wpm": avg_wpm,
        }

        await database.sessions.update_one({"_id": session_oid}, {"$set": update})
        return update


session_service = SessionService()
