"""
MindMirror AI — Sessions API Routes
Work session lifecycle management.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from bson import ObjectId

from app.core.database import database
from app.core.security import get_current_user
from app.models.session import SessionCreate, SessionEnd, Session, SessionSummary


def utcnow():
    """Return timezone-naive UTC datetime (compatible with MongoDB)."""
    return datetime.utcnow()

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.get("/", response_model=list[SessionSummary])
async def list_sessions(
    limit: int = Query(20, le=100),
    current_user: dict = Depends(get_current_user),
):
    """List all sessions for the current user."""
    user_id = ObjectId(current_user["_id"])
    cursor = database.sessions.find({"user_id": user_id}).sort("start_time", -1).limit(limit)

    sessions = []
    async for doc in cursor:
        sessions.append(SessionSummary(
            id=str(doc["_id"]),
            start_time=doc["start_time"],
            end_time=doc.get("end_time"),
            duration_minutes=doc.get("duration_minutes", 0),
            productivity_score=doc.get("productivity_score", 0),
            dominant_emotion=doc.get("dominant_emotion", "neutral"),
            status=doc.get("status", "completed"),
        ))
    return sessions


@router.get("/current", response_model=Session)
async def get_current_session(current_user: dict = Depends(get_current_user)):
    """Get the current active session."""
    user_id = ObjectId(current_user["_id"])
    doc = await database.sessions.find_one(
        {"user_id": user_id, "status": "active"},
        sort=[("start_time", -1)],
    )

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active session found",
        )

    return Session(
        id=str(doc["_id"]),
        user_id=str(doc["user_id"]),
        start_time=doc["start_time"],
        end_time=doc.get("end_time"),
        duration_minutes=doc.get("duration_minutes", 0),
        productivity_score=doc.get("productivity_score", 0),
        dominant_emotion=doc.get("dominant_emotion", "neutral"),
        focus_percentage=doc.get("focus_percentage", 0),
        stress_percentage=doc.get("stress_percentage", 0),
        breaks_taken=doc.get("breaks_taken", 0),
        typing_avg_wpm=doc.get("typing_avg_wpm", 0),
        status=doc["status"],
        notes=doc.get("notes"),
    )


@router.post("/start", response_model=Session, status_code=status.HTTP_201_CREATED)
async def start_session(
    data: SessionCreate = SessionCreate(),
    current_user: dict = Depends(get_current_user),
):
    """Start a new work session."""
    user_id = ObjectId(current_user["_id"])

    # End any existing active session
    await database.sessions.update_many(
        {"user_id": user_id, "status": "active"},
        {"$set": {"status": "completed", "end_time": utcnow()}},
    )

    now = utcnow()
    session_doc = {
        "user_id": user_id,
        "start_time": now,
        "end_time": None,
        "duration_minutes": 0,
        "productivity_score": 0,
        "dominant_emotion": "neutral",
        "focus_percentage": 0,
        "stress_percentage": 0,
        "breaks_taken": 0,
        "typing_avg_wpm": 0,
        "status": "active",
        "notes": data.notes,
    }

    result = await database.sessions.insert_one(session_doc)

    return Session(
        id=str(result.inserted_id),
        user_id=str(user_id),
        start_time=now,
        status="active",
        notes=data.notes,
    )


@router.post("/end", response_model=Session)
async def end_session(
    data: SessionEnd = SessionEnd(),
    current_user: dict = Depends(get_current_user),
):
    """End the current active session and calculate final stats."""
    user_id = ObjectId(current_user["_id"])
    session = await database.sessions.find_one(
        {"user_id": user_id, "status": "active"},
        sort=[("start_time", -1)],
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active session to end",
        )

    session_id = session["_id"]
    now = utcnow()
    duration = (now - session["start_time"]).total_seconds() / 60

    # Calculate session stats from emotion data
    emotion_pipeline = [
        {"$match": {"session_id": session_id}},
        {"$group": {
            "_id": None,
            "emotions": {"$push": "$emotion"},
            "total": {"$sum": 1},
        }},
    ]
    emotion_result = await database.emotions.aggregate(emotion_pipeline).to_list(1)

    dominant_emotion = "neutral"
    focus_pct = 0
    stress_pct = 0

    if emotion_result:
        emotions = emotion_result[0]["emotions"]
        total = emotion_result[0]["total"]
        if total > 0:
            # Find dominant
            from collections import Counter
            counter = Counter(emotions)
            dominant_emotion = counter.most_common(1)[0][0]
            focus_pct = round(
                sum(1 for e in emotions if e in ["neutral", "happy"]) / total * 100, 1
            )
            stress_pct = round(
                sum(1 for e in emotions if e in ["angry", "fearful", "disgusted", "sad"]) / total * 100, 1
            )

    # Calculate typing stats
    ks_pipeline = [
        {"$match": {"session_id": session_id}},
        {"$group": {"_id": None, "avg_wpm": {"$avg": "$wpm"}}},
    ]
    ks_result = await database.keystrokes.aggregate(ks_pipeline).to_list(1)
    avg_wpm = round(ks_result[0]["avg_wpm"], 1) if ks_result else 0

    # Composite productivity score
    productivity = min(100, max(0, focus_pct * 0.6 + (100 - stress_pct) * 0.3 + min(avg_wpm, 80) / 80 * 10))

    update_data = {
        "end_time": now,
        "duration_minutes": round(duration, 1),
        "productivity_score": round(productivity, 1),
        "dominant_emotion": dominant_emotion,
        "focus_percentage": focus_pct,
        "stress_percentage": stress_pct,
        "typing_avg_wpm": avg_wpm,
        "status": "completed",
    }
    if data.notes:
        update_data["notes"] = data.notes

    await database.sessions.update_one({"_id": session_id}, {"$set": update_data})

    return Session(
        id=str(session_id),
        user_id=str(user_id),
        start_time=session["start_time"],
        **update_data,
    )


@router.get("/{session_id}", response_model=Session)
async def get_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """Get detailed session information."""
    user_id = ObjectId(current_user["_id"])
    doc = await database.sessions.find_one(
        {"_id": ObjectId(session_id), "user_id": user_id}
    )

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    return Session(
        id=str(doc["_id"]),
        user_id=str(doc["user_id"]),
        start_time=doc["start_time"],
        end_time=doc.get("end_time"),
        duration_minutes=doc.get("duration_minutes", 0),
        productivity_score=doc.get("productivity_score", 0),
        dominant_emotion=doc.get("dominant_emotion", "neutral"),
        focus_percentage=doc.get("focus_percentage", 0),
        stress_percentage=doc.get("stress_percentage", 0),
        breaks_taken=doc.get("breaks_taken", 0),
        typing_avg_wpm=doc.get("typing_avg_wpm", 0),
        status=doc["status"],
        notes=doc.get("notes"),
    )
