from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import sys
from pathlib import Path

from config import get_settings
from models.database import connect_to_mongo, close_mongo_connection
from mqtt.client import mqtt_client
from api import students, embeddings, attendance, auth, courses, teachers, classrooms, statistics

# Configure logging
# Store logs in a separate directory to avoid triggering auto-reload
log_dir = Path(__file__).parent / "logs"
log_dir.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(log_dir / 'backend.log')
    ]
)

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for FastAPI application
    Handles startup and shutdown events
    """
    # Startup
    logger.info("Starting Smart Attendance System Backend...")
    
    # Create necessary directories
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.EMBEDDINGS_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.RESULTS_DIR).mkdir(parents=True, exist_ok=True)
    
    # Connect to MongoDB
    await connect_to_mongo()
    
    # Connect to MQTT broker
    mqtt_client.connect()
    
    logger.info("Backend started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down backend...")
    await close_mongo_connection()
    mqtt_client.disconnect()
    logger.info("Backend shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="Smart Attendance System API",
    description="Backend API for IoT-based attendance system with Raspberry Pi edge devices",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")  # /api/auth
app.include_router(students.router)  # Already has /api/students prefix
app.include_router(embeddings.router)  # Already has /api/embeddings prefix
app.include_router(attendance.router)  # Already has /api/attendance prefix
app.include_router(courses.router, prefix="/api")  # /api/courses
app.include_router(teachers.router)  # Already has /api/teachers prefix
app.include_router(classrooms.router)  # Already has /api/classrooms prefix
app.include_router(statistics.router, prefix="/api")  # /api/statistics


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Smart Attendance System API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "mqtt_connected": mqtt_client.connected,
        "timestamp": None  # Will be set by JSON encoder
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,  # Disable auto-reload to prevent constant reloading
        log_level="info",
       
    )
