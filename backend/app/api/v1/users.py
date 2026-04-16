"""
MindMirror AI — Users API Routes
Profile and preferences management.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from app.core.database import database
from app.core.security import get_current_user
from app.models.user import (
    UserProfile,
    UserProfileUpdate,
    UserPreferences,
    UserPreferencesUpdate,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/profile", response_model=UserProfile)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get the current user's profile."""
    return UserProfile(
        id=current_user["_id"],
        name=current_user["name"],
        email=current_user["email"],
        preferences=UserPreferences(**current_user.get("preferences", {})),
        onboarding_completed=current_user.get("onboarding_completed", False),
        created_at=current_user["created_at"],
    )


@router.put("/profile", response_model=UserProfile)
async def update_profile(
    data: UserProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update the current user's profile."""
    user_id = ObjectId(current_user["_id"])
    update_fields = {}

    if data.name is not None:
        update_fields["name"] = data.name
    if data.email is not None:
        existing = await database.users.find_one({"email": data.email, "_id": {"$ne": user_id}})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already in use",
            )
        update_fields["email"] = data.email

    if not update_fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    update_fields["updated_at"] = datetime.now(timezone.utc)
    await database.users.update_one({"_id": user_id}, {"$set": update_fields})

    updated_user = await database.users.find_one({"_id": user_id})
    return UserProfile(
        id=str(updated_user["_id"]),
        name=updated_user["name"],
        email=updated_user["email"],
        preferences=UserPreferences(**updated_user.get("preferences", {})),
        onboarding_completed=updated_user.get("onboarding_completed", False),
        created_at=updated_user["created_at"],
    )


@router.get("/preferences", response_model=UserPreferences)
async def get_preferences(current_user: dict = Depends(get_current_user)):
    """Get the current user's preferences."""
    return UserPreferences(**current_user.get("preferences", {}))


@router.put("/preferences", response_model=UserPreferences)
async def update_preferences(
    data: UserPreferencesUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update the current user's preferences."""
    user_id = ObjectId(current_user["_id"])
    current_prefs = current_user.get("preferences", {})

    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    current_prefs.update(update_data)
    await database.users.update_one(
        {"_id": user_id},
        {"$set": {"preferences": current_prefs, "updated_at": datetime.now(timezone.utc)}},
    )

    return UserPreferences(**current_prefs)


@router.post("/onboarding-complete")
async def complete_onboarding(current_user: dict = Depends(get_current_user)):
    """Mark the onboarding flow as completed."""
    user_id = ObjectId(current_user["_id"])
    await database.users.update_one(
        {"_id": user_id},
        {"$set": {"onboarding_completed": True, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"message": "Onboarding completed"}


@router.get("/export")
async def export_user_data(current_user: dict = Depends(get_current_user)):
    """Export all user data (GDPR compliance)."""
    user_id = ObjectId(current_user["_id"])

    # Gather all user data
    emotions = []
    async for doc in database.emotions.find({"user_id": user_id}):
        doc["_id"] = str(doc["_id"])
        doc["user_id"] = str(doc["user_id"])
        if doc.get("session_id"):
            doc["session_id"] = str(doc["session_id"])
        emotions.append(doc)

    keystrokes = []
    async for doc in database.keystrokes.find({"user_id": user_id}):
        doc["_id"] = str(doc["_id"])
        doc["user_id"] = str(doc["user_id"])
        if doc.get("session_id"):
            doc["session_id"] = str(doc["session_id"])
        keystrokes.append(doc)

    sessions = []
    async for doc in database.sessions.find({"user_id": user_id}):
        doc["_id"] = str(doc["_id"])
        doc["user_id"] = str(doc["user_id"])
        sessions.append(doc)

    recommendations_data = []
    async for doc in database.recommendations.find({"user_id": user_id}):
        doc["_id"] = str(doc["_id"])
        doc["user_id"] = str(doc["user_id"])
        if doc.get("session_id"):
            doc["session_id"] = str(doc["session_id"])
        recommendations_data.append(doc)

    return {
        "user": {
            "id": current_user["_id"],
            "name": current_user["name"],
            "email": current_user["email"],
            "preferences": current_user.get("preferences", {}),
            "created_at": str(current_user["created_at"]),
        },
        "emotions_count": len(emotions),
        "emotions": emotions,
        "keystrokes_count": len(keystrokes),
        "keystrokes": keystrokes,
        "sessions_count": len(sessions),
        "sessions": sessions,
        "recommendations_count": len(recommendations_data),
        "recommendations": recommendations_data,
    }
