"""
MindMirror AI — Emotions API Routes
Emotion logs, summaries, distributions, and timelines.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from bson import ObjectId

from app.core.database import database
from app.core.security import get_current_user
from app.models.emotion import EmotionLog, EmotionSummary, EmotionTimelinePoint

router = APIRouter(prefix="/emotions", tags=["Emotions"])


@router.get("/", response_model=list[EmotionLog])
async def get_emotion_logs(
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    limit: int = Query(100, le=1000),
    current_user: dict = Depends(get_current_user),
):
    """Get emotion logs with optional date range filter."""
    query = {"user_id": ObjectId(current_user["_id"])}
    if start or end:
        query["timestamp"] = {}
        if start:
            query["timestamp"]["$gte"] = start
        if end:
            query["timestamp"]["$lte"] = end

    cursor = database.emotions.find(query).sort("timestamp", -1).limit(limit)
    logs = []
    async for doc in cursor:
        logs.append(EmotionLog(
            id=str(doc["_id"]),
            user_id=str(doc["user_id"]),
            session_id=str(doc["session_id"]) if doc.get("session_id") else None,
            emotion=doc["emotion"],
            confidence=doc["confidence"],
            all_emotions=doc["all_emotions"],
            timestamp=doc["timestamp"],
        ))
    return logs


@router.get("/summary", response_model=EmotionSummary)
async def get_emotion_summary(
    hours: int = Query(24, description="Summary for last N hours"),
    current_user: dict = Depends(get_current_user),
):
    """Get aggregated emotion summary for a time period."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    user_id = ObjectId(current_user["_id"])

    pipeline = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": since}}},
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "avg_confidence": {"$avg": "$confidence"},
            "emotions": {"$push": "$emotion"},
            "all_emotions_list": {"$push": "$all_emotions"},
        }},
    ]

    result = await database.emotions.aggregate(pipeline).to_list(1)

    if not result:
        return EmotionSummary(
            period_start=since,
            period_end=datetime.now(timezone.utc),
            dominant_emotion="neutral",
            emotion_distribution={},
            avg_confidence=0,
            total_readings=0,
            stress_percentage=0,
            focus_percentage=0,
        )

    data = result[0]
    emotions = data["emotions"]
    total = data["total"]

    # Calculate distribution
    distribution = {}
    for e in emotions:
        distribution[e] = distribution.get(e, 0) + 1
    for key in distribution:
        distribution[key] = round(distribution[key] / total, 3)

    dominant = max(distribution, key=distribution.get) if distribution else "neutral"

    # Stress: angry + fearful + disgusted
    stress_count = sum(1 for e in emotions if e in ["angry", "fearful", "disgusted", "sad"])
    # Focus: neutral + happy (calm, engaged)
    focus_count = sum(1 for e in emotions if e in ["neutral", "happy"])

    return EmotionSummary(
        period_start=since,
        period_end=datetime.now(timezone.utc),
        dominant_emotion=dominant,
        emotion_distribution=distribution,
        avg_confidence=round(data["avg_confidence"], 3),
        total_readings=total,
        stress_percentage=round(stress_count / total * 100, 1) if total > 0 else 0,
        focus_percentage=round(focus_count / total * 100, 1) if total > 0 else 0,
    )


@router.get("/distribution")
async def get_emotion_distribution(
    hours: int = Query(24),
    current_user: dict = Depends(get_current_user),
):
    """Get emotion distribution for pie chart data."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    user_id = ObjectId(current_user["_id"])

    pipeline = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": since}}},
        {"$group": {"_id": "$emotion", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]

    result = await database.emotions.aggregate(pipeline).to_list(20)
    total = sum(r["count"] for r in result)

    return [
        {
            "emotion": r["_id"],
            "count": r["count"],
            "percentage": round(r["count"] / total * 100, 1) if total > 0 else 0,
        }
        for r in result
    ]


@router.get("/timeline", response_model=list[EmotionTimelinePoint])
async def get_emotion_timeline(
    hours: int = Query(2, description="Timeline for last N hours"),
    current_user: dict = Depends(get_current_user),
):
    """Get emotion timeline data for line chart."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    user_id = ObjectId(current_user["_id"])

    cursor = (
        database.emotions
        .find({"user_id": user_id, "timestamp": {"$gte": since}})
        .sort("timestamp", 1)
    )

    points = []
    async for doc in cursor:
        points.append(EmotionTimelinePoint(
            timestamp=doc["timestamp"],
            emotion=doc["emotion"],
            confidence=doc["confidence"],
            all_emotions=doc["all_emotions"],
        ))
    return points


@router.get("/current")
async def get_current_emotion(current_user: dict = Depends(get_current_user)):
    """Get the latest detected emotion."""
    user_id = ObjectId(current_user["_id"])
    doc = await database.emotions.find_one(
        {"user_id": user_id},
        sort=[("timestamp", -1)],
    )

    if not doc:
        return {"emotion": "neutral", "confidence": 0, "timestamp": None}

    return {
        "emotion": doc["emotion"],
        "confidence": doc["confidence"],
        "all_emotions": doc["all_emotions"],
        "timestamp": doc["timestamp"],
    }
