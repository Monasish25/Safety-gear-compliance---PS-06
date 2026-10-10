import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent
# Main project root (two levels up from DOOM_FRONTEND/backend)
MAIN_PROJECT_DIR = BASE_DIR.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Industrial Safety Vision AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{BASE_DIR / 'storage' / 'safety_compliance.db'}"
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
    # Library of pre-uploaded videos from the main backend
    UPLOADS_LIBRARY_DIR: Path = MAIN_PROJECT_DIR / "backend" / "storage" / "uploads"
    # Custom trained YOLO models from the main backend
    PPE_MODEL_PATH: Path = MAIN_PROJECT_DIR / "backend" / "models" / "PPE.pt"
    FIRESMOKE_MODEL_PATH: Path = MAIN_PROJECT_DIR / "backend" / "models" / "FireSmoke.pt"
    
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
