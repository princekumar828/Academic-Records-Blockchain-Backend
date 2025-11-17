from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    
    # Database Configuration
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "attendance_system"
    
    # MQTT Broker Configuration
    MQTT_BROKER_HOST: str = "10.42.0.1"
    MQTT_BROKER_PORT: int = 1883
    MQTT_USERNAME: str = ""
    MQTT_PASSWORD: str = ""
    
    # Storage Configuration
    UPLOAD_DIR: str = "./uploads"
    EMBEDDINGS_DIR: str = "./embeddings"
    RESULTS_DIR: str = "./results"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Face Recognition Settings
    FACE_DETECTION_MODEL: str = "hog"
    FACE_RECOGNITION_TOLERANCE: float = 0.6
    NUM_JITTERS: int = 1
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings():
    return Settings()
