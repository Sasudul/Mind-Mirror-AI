"""
MindMirror AI — Keystrokes API Routes
Keystroke metrics, summaries, and trends.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from bson import ObjectId

from app.core.database import database
from app.core.security import get_current_user

router = APIRouter(prefix="/keystrokes", tags=["Keystrokes"])


@router.get("/")
async def get_keystroke_logs(
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    limit: int = Query(100, le=1000),
    current_user: dict = Depends(get_current_user),
):
    """Get keystroke metrics with optional date range filter."""
    query = {"user_id": ObjectId(current_user["_id"])}
    if start or end:
        query["timestamp"] = {}
        if start:
            query["timestamp"]["$gte"] = start
        if end:
            query["timestamp"]["$lte"] = end

    cursor = database.keystrokes.find(query).sort("timestamp", -1).limit(limit)
    logs = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["user_id"] = str(doc["user_id"])
        if doc.get("session_id"):
            doc["session_id"] = str(doc["session_id"])
        logs.append(doc)
    return logs


@router.get("/summary")
async def get_keystroke_summary(
    hours: int = Query(24),
    current_user: dict = Depends(get_current_user),
):
    """Get aggregated typing speed/rhythm summary."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    user_id = ObjectId(current_user["_id"])

    pipeline = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": since}}},
        {"$group": {
            "_id": None,
            "avg_wpm": {"$avg": "$wpm"},
            "max_wpm": {"$max": "$wpm"},
            "min_wpm": {"$min": "$wpm"},
            "avg_error_rate": {"$avg": "$error_rate"},
            "avg_consistency": {"$avg": "$consistency_score"},
            "total_pauses": {"$sum": "$pause_count"},
            "total_measurements": {"$sum": 1},
        }},
    ]

    result = await database.keystrokes.aggregate(pipeline).to_list(1)

    if not result:
        return {
            "avg_wpm": 0, "max_wpm": 0, "min_wpm": 0,
            "avg_error_rate": 0, "avg_consistency": 0,
            "total_pauses": 0, "total_measurements": 0,
        }

    data = result[0]
    data.pop("_id", None)
    for key in ["avg_wpm", "max_wpm", "min_wpm", "avg_error_rate", "avg_consistency"]:
        if data.get(key) is not None:
            data[key] = round(data[key], 2)
    return data


@router.get("/trends")
async def get_keystroke_trends(
    days: int = Query(7),
    current_user: dict = Depends(get_current_user),
):
    """Get typing behavior trends over days."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    user_id = ObjectId(current_user["_id"])

    pipeline = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": since}}},
        {"$group": {
            "_id": {
                "$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}
            },
            "avg_wpm": {"$avg": "$wpm"},
            "avg_error_rate": {"$avg": "$error_rate"},
            "avg_consistency": {"$avg": "$consistency_score"},
            "measurements": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]

    result = await database.keystrokes.aggregate(pipeline).to_list(days)
    return [
        {
            "date": r["_id"],
            "avg_wpm": round(r["avg_wpm"], 1),
            "avg_error_rate": round(r["avg_error_rate"], 3),
            "avg_consistency": round(r["avg_consistency"], 3),
            "measurements": r["measurements"],
        }
        for r in result
    ]
