from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
from config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()


class Database:
    client: AsyncIOMotorClient = None
    db = None


db = Database()


async def connect_to_mongo():
    """Connect to MongoDB"""
    try:
        db.client = AsyncIOMotorClient(settings.MONGODB_URL)
        db.db = db.client[settings.DATABASE_NAME]
        
        # Create indexes
        await create_indexes()
        
        logger.info("Connected to MongoDB successfully")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """Close MongoDB connection"""
    if db.client:
        db.client.close()
        logger.info("Closed MongoDB connection")


async def create_indexes():
    """Create database indexes for performance"""
    try:
        # Students collection indexes
        await db.db.students.create_index([("student_id", ASCENDING)], unique=True)
        await db.db.students.create_index([("classroom_id", ASCENDING)])
        await db.db.students.create_index([("department", ASCENDING)])
        
        # Embeddings collection indexes
        await db.db.embeddings.create_index([("student_id", ASCENDING)])
        await db.db.embeddings.create_index([("classroom_id", ASCENDING)])
        
        # Attendance sessions indexes
        await db.db.attendance_sessions.create_index([("session_id", ASCENDING)], unique=True)
        await db.db.attendance_sessions.create_index([("classroom_id", ASCENDING)])
        await db.db.attendance_sessions.create_index([("started_at", DESCENDING)])
        
        # Attendance records indexes
        await db.db.attendance_records.create_index([("session_id", ASCENDING)])
        await db.db.attendance_records.create_index([("student_id", ASCENDING)])
        await db.db.attendance_records.create_index([("timestamp", DESCENDING)])
        await db.db.attendance_records.create_index([
            ("session_id", ASCENDING),
            ("student_id", ASCENDING)
        ])
        
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Failed to create indexes: {e}")


def get_database():
    """Get database instance"""
    return db.db
