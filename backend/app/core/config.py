import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Industrial Safety Vision AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:66627474@localhost:5432/Safegear"
    )
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_REDIS_FALLBACK: bool = True
    
    # MinIO / Evidence Storage
    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    MINIO_ACCESS_KEY: str = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    MINIO_SECRET_KEY: str = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    MINIO_BUCKET: str = os.getenv("MINIO_BUCKET", "factory-safety-evidence")
    MINIO_SECURE: bool = os.getenv("MINIO_SECURE", "false").lower() == "true"
    LOCAL_STORAGE_DIR: Path = BASE_DIR / "storage"
    
    # Vision & Temporal Confirmation Parameters (PRD Section 16)
    INFERENCE_FPS: float = 5.0
    CONFIRMATION_TIME_HELMET_SEC: float = 2.0
    CONFIRMATION_TIME_VEST_SEC: float = 2.0
    SMOKE_OBSERVATION_RATIO: tuple = (3, 5)  # 3 of last 5
    FIRE_OBSERVATION_RATIO: tuple = (2, 3)   # 2 of last 3
    ALERT_COOLDOWN_SEC: int = 30             # 30s duplicate cooldown
    
    # Occlusion-aware track window (PRD Section 14)
    TRACK_MAX_AGE_SEC: float = 3.0
    
    # Head / Torso division (PRD Section 13)
    HEAD_RATIO: float = 0.30  # top 30%
    TORSO_START_RATIO: float = 0.25
    TORSO_END_RATIO: float = 0.70
    
    class Config:
        case_sensitive = True

settings = Settings()
