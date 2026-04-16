"""
MindMirror AI — Recommendation Service
Rule-based + pattern-driven AI recommendation engine.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, List
from bson import ObjectId

from app.core.database import database
from app.core.config import settings


class RecommendationService:
    """Generates AI-driven productivity recommendations based on emotion and keystroke data."""

    # Recommendation templates
    TEMPLATES = {
        "stress_break": {
            "type": "break",
            "title": "Time for a Break",
            "message": "Your stress levels have been elevated for {duration} minutes. A 5-minute break with deep breathing can help reset your focus.",
            "emoji": "self_improvement",
            "urgency": "high",
        },
        "focus_declining": {
            "type": "task_switch",
            "title": "Focus Drifting",
            "message": "Your focus has been declining over the last 30 minutes. Consider switching to a different task to re-energize.",
            "emoji": "sync",
            "urgency": "medium",
        },
        "typing_fatigue": {
            "type": "break",
            "title": "Typing Fatigue Detected",
            "message": "Your typing speed has dropped {drop}% below your baseline. A short walk might help restore your energy.",
            "emoji": "directions_walk",
            "urgency": "medium",
        },
        "long_session": {
            "type": "break",
            "title": "Extended Work Session",
            "message": "You've been working for {duration} minutes straight. Time for a well-deserved break!",
            "emoji": "timer",
            "urgency": "high",
        },
        "peak_productivity": {
            "type": "insight",
            "title": "Peak Performance Window",
            "message": "You're most productive around {time}. Try scheduling your deep work during this window.",
            "emoji": "track_changes",
            "urgency": "low",
        },
        "post_stress_journal": {
            "type": "encouragement",
            "title": "Rough Session — Reflect",
            "message": "That was a high-stress session. Consider journaling your thoughts to decompress.",
            "emoji": "edit_document",
            "urgency": "low",
        },
        "distraction_detected": {
            "type": "task_switch",
            "title": "Distraction Alert",
            "message": "You seem distracted — long pauses detected. Would you like to start a focus timer?",
            "emoji": "track_changes",
            "urgency": "medium",
        },
        "burnout_warning": {
            "type": "warning",
            "title": "Burnout Risk Detected",
            "message": "You've had {days} consecutive high-stress days. Consider lightening your schedule or taking a day off.",
            "emoji": "warning",
            "urgency": "critical",
        },
        "great_focus": {
            "type": "encouragement",
            "title": "Excellent Focus!",
            "message": "You've maintained great focus for {duration} minutes. Keep up the momentum!",
            "emoji": "stars",
            "urgency": "low",
        },
        "consistency_improving": {
            "type": "encouragement",
            "title": "Productivity Improving",
            "message": "Your productivity score has improved {improvement}% this week compared to last week. Great progress!",
            "emoji": "stacked_line_chart",
            "urgency": "low",
        },
    }

    async def evaluate_emotion(
        self, user_id: str, session_id: Optional[str], emotion_data: dict
    ) -> List[dict]:
        """Evaluate emotion data and generate recommendations if needed."""
        recommendations = []
        user_oid = ObjectId(user_id)
        now = datetime.now(timezone.utc)

        # Check sustained stress
        stress_window = now - timedelta(minutes=settings.STRESS_DURATION_MINUTES)
        stress_pipeline = [
            {"$match": {
                "user_id": user_oid,
                "timestamp": {"$gte": stress_window},
                "emotion": {"$in": ["angry", "fearful", "disgusted", "sad"]},
            }},
            {"$count": "stress_count"},
        ]
        total_pipeline = [
            {"$match": {"user_id": user_oid, "timestamp": {"$gte": stress_window}}},
            {"$count": "total_count"},
        ]

        stress_result = await database.emotions.aggregate(stress_pipeline).to_list(1)
        total_result = await database.emotions.aggregate(total_pipeline).to_list(1)

        if stress_result and total_result:
            stress_count = stress_result[0]["stress_count"]
            total_count = total_result[0]["total_count"]
            stress_ratio = stress_count / max(total_count, 1)

            if stress_ratio >= settings.STRESS_THRESHOLD:
                # Avoid duplicate recommendations within 10 minutes
                recent = await database.recommendations.find_one({
                    "user_id": user_oid,
                    "type": "break",
                    "created_at": {"$gte": now - timedelta(minutes=10)},
                })
                if not recent:
                    template = self.TEMPLATES["stress_break"].copy()
                    template["message"] = template["message"].format(
                        duration=settings.STRESS_DURATION_MINUTES
                    )
                    rec = await self._create_recommendation(user_id, session_id, template)
                    recommendations.append(rec)

        # Check for great focus streak (30+ minutes of neutral/happy)
        focus_window = now - timedelta(minutes=30)
        focus_pipeline = [
            {"$match": {
                "user_id": user_oid,
                "timestamp": {"$gte": focus_window},
            }},
            {"$group": {
                "_id": None,
                "total": {"$sum": 1},
                "focus": {"$sum": {"$cond": [{"$in": ["$emotion", ["neutral", "happy"]]}, 1, 0]}},
            }},
        ]
        focus_result = await database.emotions.aggregate(focus_pipeline).to_list(1)
        if focus_result:
            fr = focus_result[0]
            if fr["total"] >= 20 and fr["focus"] / max(fr["total"], 1) > 0.85:
                recent_enc = await database.recommendations.find_one({
                    "user_id": user_oid,
                    "type": "encouragement",
                    "created_at": {"$gte": now - timedelta(minutes=30)},
                })
                if not recent_enc:
                    template = self.TEMPLATES["great_focus"].copy()
                    template["message"] = template["message"].format(duration=30)
                    rec = await self._create_recommendation(user_id, session_id, template)
                    recommendations.append(rec)

        return recommendations

    async def evaluate_keystrokes(
        self, user_id: str, session_id: Optional[str], keystroke_data: dict
    ) -> List[dict]:
        """Evaluate keystroke data and generate recommendations."""
        recommendations = []
        user_oid = ObjectId(user_id)
        now = datetime.now(timezone.utc)

        # Get baseline WPM (average from last 7 days)
        baseline_window = now - timedelta(days=7)
        baseline_pipeline = [
            {"$match": {"user_id": user_oid, "timestamp": {"$gte": baseline_window}}},
            {"$group": {"_id": None, "avg_wpm": {"$avg": "$wpm"}}},
        ]
        baseline_result = await database.keystrokes.aggregate(baseline_pipeline).to_list(1)
        baseline_wpm = baseline_result[0]["avg_wpm"] if baseline_result else 40

        current_wpm = keystroke_data.get("wpm", 0)

        # Check typing fatigue
        if baseline_wpm > 0 and current_wpm > 0:
            drop = (baseline_wpm - current_wpm) / baseline_wpm
            if drop >= settings.FATIGUE_TYPING_DROP:
                recent = await database.recommendations.find_one({
                    "user_id": user_oid,
                    "type": "break",
                    "created_at": {"$gte": now - timedelta(minutes=15)},
                })
                if not recent:
                    template = self.TEMPLATES["typing_fatigue"].copy()
                    template["message"] = template["message"].format(drop=round(drop * 100))
                    rec = await self._create_recommendation(user_id, session_id, template)
                    recommendations.append(rec)

        # Check for distraction (high pause count)
        if keystroke_data.get("pause_count", 0) >= 5:
            recent = await database.recommendations.find_one({
                "user_id": user_oid,
                "type": "task_switch",
                "created_at": {"$gte": now - timedelta(minutes=20)},
            })
            if not recent:
                rec = await self._create_recommendation(
                    user_id, session_id, self.TEMPLATES["distraction_detected"]
                )
                recommendations.append(rec)

        return recommendations

    async def check_session_duration(
        self, user_id: str, session_id: Optional[str]
    ) -> List[dict]:
        """Check if user has been working too long without a break."""
        recommendations = []
        user_oid = ObjectId(user_id)
        now = datetime.now(timezone.utc)

        active_session = await database.sessions.find_one(
            {"user_id": user_oid, "status": "active"},
            sort=[("start_time", -1)],
        )

        if active_session:
            duration = (now - active_session["start_time"]).total_seconds() / 60
            if duration >= settings.BREAK_INTERVAL_MINUTES:
                recent = await database.recommendations.find_one({
                    "user_id": user_oid,
                    "type": "break",
                    "title": "Extended Work Session",
                    "created_at": {"$gte": now - timedelta(minutes=30)},
                })
                if not recent:
                    template = self.TEMPLATES["long_session"].copy()
                    template["message"] = template["message"].format(duration=round(duration))
                    rec = await self._create_recommendation(user_id, session_id, template)
                    recommendations.append(rec)

        return recommendations

    async def _create_recommendation(
        self, user_id: str, session_id: Optional[str], template: dict
    ) -> dict:
        """Store a recommendation in the database and return it."""
        now = datetime.now(timezone.utc)
        doc = {
            "user_id": ObjectId(user_id),
            "session_id": ObjectId(session_id) if session_id else None,
            "type": template["type"],
            "title": template["title"],
            "message": template["message"],
            "emoji": template["emoji"],
            "urgency": template.get("urgency", "medium"),
            "status": "pending",
            "feedback": None,
            "created_at": now,
            "responded_at": None,
        }
        result = await database.recommendations.insert_one(doc)

        return {
            "id": str(result.inserted_id),
            "type": template["type"],
            "title": template["title"],
            "message": template["message"],
            "emoji": template["emoji"],
            "urgency": template.get("urgency", "medium"),
        }


recommendation_service = RecommendationService()
