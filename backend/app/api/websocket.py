"""
MindMirror AI — WebSocket Handler
Bidirectional real-time communication for emotion and keystroke streaming.
"""

import json
from datetime import datetime, timezone

from fastapi import WebSocket, WebSocketDisconnect
from bson import ObjectId

from app.core.database import database
from app.services.recommendation_service import recommendation_service


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"[WS] User {user_id} connected. Active: {len(self.active_connections)}")

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)
        print(f"[WS] User {user_id} disconnected. Active: {len(self.active_connections)}")

    async def send_message(self, user_id: str, message: dict):
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(user_id)

    async def broadcast(self, message: dict):
        disconnected = []
        for user_id, ws in self.active_connections.items():
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(user_id)
        for uid in disconnected:
            self.disconnect(uid)


manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """
    WebSocket endpoint for real-time emotion and keystroke data streaming.

    Incoming message types:
        - emotion_data: { emotion, confidence, all_emotions, timestamp }
        - keystroke_data: { wpm, avg_hold_time_ms, avg_flight_time_ms, pause_count, error_rate, consistency_score }
        - session_control: { action: start | pause | end }

    Outgoing message types:
        - recommendation: { id, type, title, message, emoji, urgency }
        - alert: { type, message }
        - session_update: { session_id, duration, productivity_score }
    """
    await manager.connect(user_id, websocket)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON"})
                continue

            msg_type = data.get("type")
            payload = data.get("payload", {})

            if msg_type == "emotion_data":
                await handle_emotion_data(user_id, payload)

            elif msg_type == "keystroke_data":
                await handle_keystroke_data(user_id, payload)

            elif msg_type == "session_control":
                await handle_session_control(user_id, payload)

            else:
                await websocket.send_json({"error": f"Unknown message type: {msg_type}"})

    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        print(f"[WS] Error for user {user_id}: {e}")
        manager.disconnect(user_id)


async def handle_emotion_data(user_id: str, payload: dict):
    """Process incoming emotion detection data."""
    now = datetime.now(timezone.utc)

    # Get active session
    user_oid = ObjectId(user_id)
    active_session = await database.sessions.find_one(
        {"user_id": user_oid, "status": "active"},
        sort=[("start_time", -1)],
    )
    session_id = active_session["_id"] if active_session else None

    # Store emotion log
    emotion_doc = {
        "user_id": user_oid,
        "session_id": session_id,
        "emotion": payload.get("emotion", "neutral"),
        "confidence": payload.get("confidence", 0),
        "all_emotions": payload.get("all_emotions", {}),
        "timestamp": now,
    }
    await database.emotions.insert_one(emotion_doc)

    # Evaluate for recommendations
    recs = await recommendation_service.evaluate_emotion(
        user_id, str(session_id) if session_id else None, payload
    )

    # Also check session duration
    duration_recs = await recommendation_service.check_session_duration(
        user_id, str(session_id) if session_id else None
    )
    recs.extend(duration_recs)

    # Send recommendations back to client
    for rec in recs:
        await manager.send_message(user_id, {
            "type": "recommendation",
            "payload": rec,
        })


async def handle_keystroke_data(user_id: str, payload: dict):
    """Process incoming keystroke metrics."""
    now = datetime.now(timezone.utc)

    user_oid = ObjectId(user_id)
    active_session = await database.sessions.find_one(
        {"user_id": user_oid, "status": "active"},
        sort=[("start_time", -1)],
    )
    session_id = active_session["_id"] if active_session else None

    window_seconds = payload.get("window_seconds", 60)

    # Store keystroke log
    keystroke_doc = {
        "user_id": user_oid,
        "session_id": session_id,
        "wpm": payload.get("wpm", 0),
        "avg_hold_time_ms": payload.get("avg_hold_time_ms", 0),
        "avg_flight_time_ms": payload.get("avg_flight_time_ms", 0),
        "pause_count": payload.get("pause_count", 0),
        "error_rate": payload.get("error_rate", 0),
        "consistency_score": payload.get("consistency_score", 0),
        "window_start": now - __import__("datetime").timedelta(seconds=window_seconds),
        "window_end": now,
        "timestamp": now,
    }
    await database.keystrokes.insert_one(keystroke_doc)

    # Evaluate for recommendations
    recs = await recommendation_service.evaluate_keystrokes(
        user_id, str(session_id) if session_id else None, payload
    )

    for rec in recs:
        await manager.send_message(user_id, {
            "type": "recommendation",
            "payload": rec,
        })


async def handle_session_control(user_id: str, payload: dict):
    """Handle session start/pause/end signals."""
    action = payload.get("action")
    user_oid = ObjectId(user_id)
    now = datetime.now(timezone.utc)

    if action == "start":
        # End any existing active session
        await database.sessions.update_many(
            {"user_id": user_oid, "status": "active"},
            {"$set": {"status": "completed", "end_time": now}},
        )
        # Create new session
        result = await database.sessions.insert_one({
            "user_id": user_oid,
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
            "notes": None,
        })
        await manager.send_message(user_id, {
            "type": "session_update",
            "payload": {"session_id": str(result.inserted_id), "action": "started"},
        })

    elif action == "end":
        session = await database.sessions.find_one(
            {"user_id": user_oid, "status": "active"},
            sort=[("start_time", -1)],
        )
        if session:
            duration = (now - session["start_time"]).total_seconds() / 60
            await database.sessions.update_one(
                {"_id": session["_id"]},
                {"$set": {
                    "status": "completed",
                    "end_time": now,
                    "duration_minutes": round(duration, 1),
                }},
            )
            await manager.send_message(user_id, {
                "type": "session_update",
                "payload": {
                    "session_id": str(session["_id"]),
                    "action": "ended",
                    "duration_minutes": round(duration, 1),
                },
            })

    elif action == "pause":
        await database.sessions.update_one(
            {"user_id": user_oid, "status": "active"},
            {"$set": {"status": "paused"}},
        )
        await manager.send_message(user_id, {
            "type": "session_update",
            "payload": {"action": "paused"},
        })
