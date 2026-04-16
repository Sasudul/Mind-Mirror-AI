"""
MindMirror AI — Auth API Routes
Registration, login, and token management.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.database import database
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.models.user import (
    UserRegister,
    UserLogin,
    UserProfile,
    UserPreferences,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    """Register a new user account."""
    existing = await database.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    now = datetime.now(timezone.utc)
    user_doc = {
        "name": user_data.name,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "preferences": UserPreferences().model_dump(),
        "onboarding_completed": False,
        "created_at": now,
        "updated_at": now,
    }

    result = await database.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_access_token(data={"sub": user_id})
    profile = UserProfile(
        id=user_id,
        name=user_data.name,
        email=user_data.email,
        preferences=UserPreferences(),
        onboarding_completed=False,
        created_at=now,
    )

    return TokenResponse(access_token=token, user=profile)


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate user and return JWT token."""
    user = await database.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = str(user["_id"])
    token = create_access_token(data={"sub": user_id})
    profile = UserProfile(
        id=user_id,
        name=user["name"],
        email=user["email"],
        preferences=UserPreferences(**user.get("preferences", {})),
        onboarding_completed=user.get("onboarding_completed", False),
        created_at=user["created_at"],
    )

    return TokenResponse(access_token=token, user=profile)


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get the current authenticated user profile."""
    return UserProfile(
        id=current_user["_id"],
        name=current_user["name"],
        email=current_user["email"],
        preferences=UserPreferences(**current_user.get("preferences", {})),
        onboarding_completed=current_user.get("onboarding_completed", False),
        created_at=current_user["created_at"],
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """Refresh the JWT access token."""
    user_id = current_user["_id"]
    token = create_access_token(data={"sub": user_id})
    profile = UserProfile(
        id=user_id,
        name=current_user["name"],
        email=current_user["email"],
        preferences=UserPreferences(**current_user.get("preferences", {})),
        onboarding_completed=current_user.get("onboarding_completed", False),
        created_at=current_user["created_at"],
    )

    return TokenResponse(access_token=token, user=profile)
