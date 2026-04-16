"""
MindMirror AI — FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api.v1.auth import router as auth_router
from app.api.v1.emotions import router as emotions_router
from app.api.v1.keystrokes import router as keystrokes_router
from app.api.v1.sessions import router as sessions_router
from app.api.v1.insights import router as insights_router
from app.api.v1.recommendations import router as recommendations_router
from app.api.v1.users import router as users_router
from app.api.v1.chat import router as chat_router
from app.api.websocket import websocket_endpoint


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    await connect_to_mongo()
    print(f"[MindMirror] {settings.APP_NAME} v{settings.APP_VERSION} started")
    yield
    await close_mongo_connection()
    print(f"[MindMirror] {settings.APP_NAME} shut down")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Emotion-Aware Productivity Assistant — tracks facial expressions and typing behavior to detect stress, focus, and burnout.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 routes
app.include_router(auth_router, prefix="/api/v1")
app.include_router(emotions_router, prefix="/api/v1")
app.include_router(keystrokes_router, prefix="/api/v1")
app.include_router(sessions_router, prefix="/api/v1")
app.include_router(insights_router, prefix="/api/v1")
app.include_router(recommendations_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")

# WebSocket
app.websocket("/ws/{user_id}")(websocket_endpoint)


@app.get("/", tags=["Health"])
async def root():
    """Root health check endpoint."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    from app.core.database import database

    db_status = "connected"
    try:
        await database.client.admin.command("ping")
    except Exception:
        db_status = "disconnected"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
