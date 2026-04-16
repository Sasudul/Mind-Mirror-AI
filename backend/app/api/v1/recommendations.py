"""
MindMirror AI — Recommendations API Routes
AI-generated suggestions management.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from bson import ObjectId

from app.core.database import database
from app.core.security import get_current_user
from app.models.recommendation import Recommendation, RecommendationFeedback

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("/", response_model=list[Recommendation])
async def get_recommendations(
    status_filter: str = Query("pending", description="Filter by status"),
    limit: int = Query(20, le=100),
    current_user: dict = Depends(get_current_user),
):
    """Get recommendations for the current user."""
    user_id = ObjectId(current_user["_id"])
    query = {"user_id": user_id}
    if status_filter != "all":
        query["status"] = status_filter

    cursor = (
        database.recommendations
        .find(query)
        .sort("created_at", -1)
        .limit(limit)
    )

    recs = []
    async for doc in cursor:
        recs.append(Recommendation(
            id=str(doc["_id"]),
            user_id=str(doc["user_id"]),
            session_id=str(doc["session_id"]) if doc.get("session_id") else None,
            type=doc["type"],
            title=doc["title"],
            message=doc["message"],
            emoji=doc["emoji"],
            urgency=doc.get("urgency", "medium"),
            status=doc.get("status", "pending"),
            feedback=doc.get("feedback"),
            created_at=doc["created_at"],
            responded_at=doc.get("responded_at"),
        ))
    return recs


@router.post("/{recommendation_id}/dismiss")
async def dismiss_recommendation(
    recommendation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Dismiss a recommendation."""
    user_id = ObjectId(current_user["_id"])
    result = await database.recommendations.update_one(
        {"_id": ObjectId(recommendation_id), "user_id": user_id},
        {"$set": {"status": "dismissed", "responded_at": datetime.now(timezone.utc)}},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found",
        )

    return {"message": "Recommendation dismissed"}


@router.post("/{recommendation_id}/feedback")
async def submit_feedback(
    recommendation_id: str,
    feedback: RecommendationFeedback,
    current_user: dict = Depends(get_current_user),
):
    """Submit feedback on a recommendation."""
    user_id = ObjectId(current_user["_id"])
    result = await database.recommendations.update_one(
        {"_id": ObjectId(recommendation_id), "user_id": user_id},
        {"$set": {
            "feedback": feedback.feedback,
            "status": "accepted",
            "responded_at": datetime.now(timezone.utc),
        }},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found",
        )

    return {"message": "Feedback submitted", "feedback": feedback.feedback}
