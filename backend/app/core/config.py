"""
MindMirror AI — Application Configuration
Loads settings from environment variables via .env file.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017/mindmirror"

    # JWT Authentication
    JWT_SECRET: str = "mindmirror-dev-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 1440  # 24 hours

    # CORS
    CORS_ORIGINS: str = "http://localhost:4200"

    # App
    DEBUG: bool = True
    APP_NAME: str = "MindMirror AI"
    APP_VERSION: str = "1.0.0"

    # LLM Integrations
    GEMINI_API_KEY: str = ""

    # Recommendation Engine Thresholds
    STRESS_THRESHOLD: float = 0.70
    STRESS_DURATION_MINUTES: int = 15
    BREAK_INTERVAL_MINUTES: int = 90
    FATIGUE_TYPING_DROP: float = 0.50

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
