"""
MindMirror AI — MongoDB Database Connection
Async connection via Motor with collection references and index setup.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings


class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

    # Collection references
    @property
    def users(self):
        return self.db["users"]

    @property
    def emotions(self):
        return self.db["emotions"]

    @property
    def keystrokes(self):
        return self.db["keystrokes"]

    @property
    def sessions(self):
        return self.db["sessions"]

    @property
    def insights(self):
        return self.db["insights"]

    @property
    def recommendations(self):
        return self.db["recommendations"]


database = Database()


async def connect_to_mongo():
    """Initialize MongoDB connection and create indexes."""
    database.client = AsyncIOMotorClient(settings.MONGODB_URI)
    database.db = database.client.get_default_database()

    # Create indexes for performance
    await database.users.create_index("email", unique=True)
    await database.emotions.create_index([("user_id", 1), ("timestamp", -1)])
    await database.emotions.create_index([("session_id", 1), ("timestamp", -1)])
    await database.keystrokes.create_index([("user_id", 1), ("timestamp", -1)])
    await database.keystrokes.create_index([("session_id", 1), ("timestamp", -1)])
    await database.sessions.create_index([("user_id", 1), ("start_time", -1)])
    await database.sessions.create_index([("user_id", 1), ("status", 1)])
    await database.insights.create_index([("user_id", 1), ("type", 1), ("date", -1)])
    await database.recommendations.create_index([("user_id", 1), ("status", 1), ("created_at", -1)])

    print(f"[MindMirror] Connected to MongoDB: {settings.MONGODB_URI}")


async def close_mongo_connection():
    """Close MongoDB connection."""
    if database.client:
        database.client.close()
        print("[MindMirror] MongoDB connection closed.")
