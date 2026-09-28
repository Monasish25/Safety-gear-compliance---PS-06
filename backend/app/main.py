import os
import uuid
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.database import init_db, SessionLocal
from app.core.storage import storage
from app.api import events, videos, ws, zones, analytics
from app.demo_generator import generate_demo_video
from app.models import schema

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB & Seed data on startup
    init_db()
    # Ensure evidence & video directories exist
    settings.LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    (settings.LOCAL_STORAGE_DIR / "evidence").mkdir(parents=True, exist_ok=True)
    (settings.LOCAL_STORAGE_DIR / "videos").mkdir(parents=True, exist_ok=True)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Industrial Safety Vision AI for PPE compliance and hazard detection",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# app.include_router(cameras.router, prefix=settings.API_V1_STR)
app.include_router(zones.router, prefix=settings.API_V1_STR)
# app.include_router(ppe_rules.router, prefix=settings.API_V1_STR)
app.include_router(events.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(videos.router, prefix=settings.API_V1_STR)
# app.include_router(copilot.router, prefix=settings.API_V1_STR)
app.include_router(ws.router, prefix=settings.API_V1_STR)

# Serve Evidence Images
@app.get(f"{settings.API_V1_STR}/evidence/{{file_path:path}}")
def get_evidence_image(file_path: str):
    # Check MinIO or local filesystem
    local_path = settings.LOCAL_STORAGE_DIR / "evidence" / file_path
    if local_path.exists():
        return FileResponse(local_path, media_type="image/jpeg")
    
    # Try fetching bytes from storage service
    data = storage.get_file_bytes(file_path)
    if data:
        from fastapi.responses import Response
        return Response(content=data, media_type="image/jpeg")

    raise HTTPException(status_code=404, detail="Evidence snapshot not found")

@app.post(f"{settings.API_V1_STR}/demo/generate-and-run")
async def generate_demo_simulation(background_tasks: BackgroundTasks):
    """
    1-Click Demo Launcher:
    Generates realistic factory demo video and triggers the end-to-end pipeline.
    """
    video_id = "demo_sim_" + str(uuid.uuid4())[:8]
    output_path = str(settings.LOCAL_STORAGE_DIR / "videos" / f"{video_id}.mp4")
    
    # Generate video synchronously
    generate_demo_video(output_path, duration_sec=16, fps=25)

    # Demo generator is temporarily disabled during schema migration
    return {
        "status": "DISABLED",
        "message": "Demo generator disabled during schema migration."
    }

@app.get("/health")
@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "storage": "Local / MinIO",
        "cache": "Memory / Redis"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
