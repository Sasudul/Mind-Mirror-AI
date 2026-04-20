"""
MindMirror AI — Pydantic Models: User
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserPreferences(BaseModel):
    work_start: str = "09:00"
    work_end: str = "17:00"
    break_frequency_minutes: int = 60
    notification_style: str = "gentle"  # gentle | direct | minimal
    data_retention_days: int = 90


class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6, max_length=128)


class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    preferences: UserPreferences
    onboarding_completed: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserPreferencesUpdate(BaseModel):
    work_start: Optional[str] = None
    work_end: Optional[str] = None
    break_frequency_minutes: Optional[int] = None
    notification_style: Optional[str] = None
    data_retention_days: Optional[int] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile
