"""
MindMirror AI — Insights API Routes
Daily, weekly, monthly analytics and heatmaps.
"""

from datetime import datetime, timezone, timedelta, date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from bson import ObjectId

from app.core.database import database
from app.core.security import get_current_user

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("/daily")
async def get_daily_insight(
    target_date: Optional[str] = Query(None, description="YYYY-MM-DD format"),
    current_user: dict = Depends(get_current_user),
):
    """Get daily productivity insights."""
    user_id = ObjectId(current_user["_id"])

    if target_date:
        day = datetime.strptime(target_date, "%Y-%m-%d").date()
    else:
        day = datetime.now(timezone.utc).date()

    day_start = datetime.combine(day, datetime.min.time()).replace(tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    # Session stats
    session_pipeline = [
        {"$match": {"user_id": user_id, "start_time": {"$gte": day_start, "$lt": day_end}}},
        {"$group": {
            "_id": None,
            "total_duration": {"$sum": "$duration_minutes"},
            "avg_productivity": {"$avg": "$productivity_score"},
            "avg_focus": {"$avg": "$focus_percentage"},
            "avg_stress": {"$avg": "$stress_percentage"},
            "sessions_count": {"$sum": 1},
            "total_breaks": {"$sum": "$breaks_taken"},
        }},
    ]
    session_result = await database.sessions.aggregate(session_pipeline).to_list(1)

    # Emotion distribution
    emotion_pipeline = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": day_start, "$lt": day_end}}},
        {"$group": {"_id": "$emotion", "count": {"$sum": 1}}},
    ]
    emotion_result = await database.emotions.aggregate(emotion_pipeline).to_list(20)
    total_emotions = sum(r["count"] for r in emotion_result)
    emotion_dist = {
        r["_id"]: round(r["count"] / total_emotions * 100, 1) if total_emotions > 0 else 0
        for r in emotion_result
    }

    # Keystroke summary
    ks_pipeline = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": day_start, "$lt": day_end}}},
        {"$group": {
            "_id": None,
            "avg_wpm": {"$avg": "$wpm"},
            "avg_consistency": {"$avg": "$consistency_score"},
        }},
    ]
    ks_result = await database.keystrokes.aggregate(ks_pipeline).to_list(1)

    # Peak hour
    peak_pipeline = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": day_start, "$lt": day_end}}},
        {"$group": {
            "_id": {"$hour": "$timestamp"},
            "focus_count": {
                "$sum": {"$cond": [{"$in": ["$emotion", ["neutral", "happy"]]}, 1, 0]}
            },
        }},
        {"$sort": {"focus_count": -1}},
        {"$limit": 1},
    ]
    peak_result = await database.emotions.aggregate(peak_pipeline).to_list(1)

    s = session_result[0] if session_result else {}
    k = ks_result[0] if ks_result else {}

    return {
        "date": day.isoformat(),
        "productivity_score": round(s.get("avg_productivity", 0), 1),
        "total_focus_hours": round(s.get("total_duration", 0) * s.get("avg_focus", 0) / 100 / 60, 1),
        "total_stress_hours": round(s.get("total_duration", 0) * s.get("avg_stress", 0) / 100 / 60, 1),
        "total_work_hours": round(s.get("total_duration", 0) / 60, 1),
        "peak_hour": peak_result[0]["_id"] if peak_result else 10,
        "emotion_distribution": emotion_dist,
        "typing_stats": {
            "avg_wpm": round(k.get("avg_wpm", 0), 1),
            "avg_consistency": round(k.get("avg_consistency", 0), 2),
        },
        "sessions_count": s.get("sessions_count", 0),
        "breaks_taken": s.get("total_breaks", 0),
    }


@router.get("/weekly")
async def get_weekly_insight(
    current_user: dict = Depends(get_current_user),
):
    """Get weekly trend analysis."""
    user_id = ObjectId(current_user["_id"])
    today = datetime.now(timezone.utc).date()
    week_start = today - timedelta(days=today.weekday())  # Monday
    week_end = week_start + timedelta(days=7)

    start_dt = datetime.combine(week_start, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(week_end, datetime.min.time()).replace(tzinfo=timezone.utc)

    pipeline = [
        {"$match": {"user_id": user_id, "start_time": {"$gte": start_dt, "$lt": end_dt}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$start_time"}},
            "avg_score": {"$avg": "$productivity_score"},
            "total_duration": {"$sum": "$duration_minutes"},
            "avg_focus": {"$avg": "$focus_percentage"},
        }},
        {"$sort": {"_id": 1}},
    ]

    result = await database.sessions.aggregate(pipeline).to_list(7)

    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    daily_scores = []
    best_day = {"name": "N/A", "score": 0}
    worst_day = {"name": "N/A", "score": 100}

    for i in range(7):
        d = week_start + timedelta(days=i)
        d_str = d.isoformat()
        matched = next((r for r in result if r["_id"] == d_str), None)
        score = round(matched["avg_score"], 1) if matched else 0
        daily_scores.append(score)
        if matched and score >= best_day["score"]:
            best_day = {"name": day_names[i], "score": score}
        if matched and score <= worst_day["score"]:
            worst_day = {"name": day_names[i], "score": score}

    total_work = sum(r.get("total_duration", 0) for r in result)
    total_focus = sum(
        r.get("total_duration", 0) * r.get("avg_focus", 0) / 100 for r in result
    )

    return {
        "week_start": week_start.isoformat(),
        "week_end": (week_end - timedelta(days=1)).isoformat(),
        "daily_scores": daily_scores,
        "avg_productivity": round(sum(daily_scores) / max(len([s for s in daily_scores if s > 0]), 1), 1),
        "best_day": best_day["name"],
        "worst_day": worst_day["name"],
        "total_focus_hours": round(total_focus / 60, 1),
        "total_work_hours": round(total_work / 60, 1),
    }


@router.get("/monthly")
async def get_monthly_insight(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Get monthly report data for calendar heatmap."""
    user_id = ObjectId(current_user["_id"])
    now = datetime.now(timezone.utc)
    m = month or now.month
    y = year or now.year

    month_start = datetime(y, m, 1, tzinfo=timezone.utc)
    if m == 12:
        month_end = datetime(y + 1, 1, 1, tzinfo=timezone.utc)
    else:
        month_end = datetime(y, m + 1, 1, tzinfo=timezone.utc)

    pipeline = [
        {"$match": {"user_id": user_id, "start_time": {"$gte": month_start, "$lt": month_end}}},
        {"$group": {
            "_id": {"$dayOfMonth": "$start_time"},
            "avg_score": {"$avg": "$productivity_score"},
            "total_duration": {"$sum": "$duration_minutes"},
        }},
        {"$sort": {"_id": 1}},
    ]

    result = await database.sessions.aggregate(pipeline).to_list(31)
    days_in_month = (month_end - month_start).days
    daily_scores = []
    for d in range(1, days_in_month + 1):
        matched = next((r for r in result if r["_id"] == d), None)
        daily_scores.append(round(matched["avg_score"], 1) if matched else None)

    active_scores = [s for s in daily_scores if s is not None]

    return {
        "month": m,
        "year": y,
        "daily_scores": daily_scores,
        "avg_productivity": round(sum(active_scores) / max(len(active_scores), 1), 1),
        "total_work_hours": round(sum(r.get("total_duration", 0) for r in result) / 60, 1),
        "days_active": len(active_scores),
    }


@router.get("/peak-hours")
async def get_peak_hours(
    days: int = Query(30),
    current_user: dict = Depends(get_current_user),
):
    """Get optimal productivity hours analysis."""
    user_id = ObjectId(current_user["_id"])
    since = datetime.now(timezone.utc) - timedelta(days=days)

    pipeline = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": since}}},
        {"$group": {
            "_id": {"$hour": "$timestamp"},
            "total": {"$sum": 1},
            "focus_count": {
                "$sum": {"$cond": [{"$in": ["$emotion", ["neutral", "happy"]]}, 1, 0]}
            },
            "stress_count": {
                "$sum": {"$cond": [{"$in": ["$emotion", ["angry", "fearful", "disgusted", "sad"]]}, 1, 0]}
            },
        }},
        {"$sort": {"_id": 1}},
    ]

    result = await database.emotions.aggregate(pipeline).to_list(24)
    return [
        {
            "hour": r["_id"],
            "avg_focus": round(r["focus_count"] / max(r["total"], 1) * 100, 1),
            "avg_stress": round(r["stress_count"] / max(r["total"], 1) * 100, 1),
            "sample_count": r["total"],
        }
        for r in result
    ]


@router.get("/heatmap")
async def get_heatmap(
    target_date: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Get hour-by-hour productivity heatmap data."""
    user_id = ObjectId(current_user["_id"])

    if target_date:
        day = datetime.strptime(target_date, "%Y-%m-%d").date()
    else:
        day = datetime.now(timezone.utc).date()

    day_start = datetime.combine(day, datetime.min.time()).replace(tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    pipeline = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": day_start, "$lt": day_end}}},
        {"$group": {
            "_id": {"$hour": "$timestamp"},
            "total": {"$sum": 1},
            "focus_count": {
                "$sum": {"$cond": [{"$in": ["$emotion", ["neutral", "happy"]]}, 1, 0]}
            },
            "dominant": {"$first": "$emotion"},
        }},
        {"$sort": {"_id": 1}},
    ]

    result = await database.emotions.aggregate(pipeline).to_list(24)

    hours = {}
    dominant_emotions = {}
    for r in result:
        h = str(r["_id"])
        hours[h] = round(r["focus_count"] / max(r["total"], 1) * 100, 1)
        dominant_emotions[h] = r["dominant"]

    return {
        "date": day.isoformat(),
        "hours": hours,
        "dominant_emotions": dominant_emotions,
    }
