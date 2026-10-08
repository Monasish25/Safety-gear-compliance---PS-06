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
from app.api import (
    cameras,
    zones,
    ppe_rules,
    rules,
    events,
    analytics,
    videos,
    copilot,
    ws,
)
from app.demo_generator import generate_demo_video
from app.models import schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifespan context manager."""
    # Initialize DB & Seed baseline data on startup
    init_db()

    # Ensure local storage directories exist
    settings.LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    (settings.LOCAL_STORAGE_DIR / "evidence").mkdir(parents=True, exist_ok=True)
    (settings.LOCAL_STORAGE_DIR / "videos").mkdir(parents=True, exist_ok=True)
    (settings.LOCAL_STORAGE_DIR / "uploads").mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Industrial Safety Vision AI for PPE compliance and hazard detection",
    lifespan=lifespan,
)

# CORS Middleware for React Supervisor Dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Page", "X-Page-Size"],
)

# Active API Routers
app.include_router(cameras.router, prefix=settings.API_V1_STR)
app.include_router(zones.router, prefix=settings.API_V1_STR)
app.include_router(ppe_rules.router, prefix=settings.API_V1_STR)
app.include_router(events.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(videos.router, prefix=settings.API_V1_STR)
app.include_router(copilot.router, prefix=settings.API_V1_STR)
app.include_router(ws.router, prefix=settings.API_V1_STR)



# Serve Evidence Snapshots
@app.get(f"{settings.API_V1_STR}/evidence/{{file_path:path}}")
def get_evidence_image(file_path: str):
    """Serve evidence snapshots from local storage or MinIO object store."""
    local_path = settings.LOCAL_STORAGE_DIR / "evidence" / file_path
    if local_path.exists():
        return FileResponse(local_path, media_type="image/jpeg")

    # Fallback to storage service (MinIO)
    data = storage.get_file_bytes(file_path)
    if data:
        from fastapi.responses import Response
        return Response(content=data, media_type="image/jpeg")

    raise HTTPException(status_code=404, detail="Evidence snapshot not found")


@app.post(f"{settings.API_V1_STR}/demo/generate-and-run")
async def generate_demo_simulation(background_tasks: BackgroundTasks):
    """1-Click Demo Launcher for realistic factory simulation."""
    video_id = "demo_sim_" + str(uuid.uuid4())[:8]
    output_path = str(settings.LOCAL_STORAGE_DIR / "videos" / f"{video_id}.mp4")

    # Generate video synchronously
    generate_demo_video(output_path, duration_sec=16, fps=25)

    # Trigger vision pipeline processing for live WebSocket telemetry, alerts & bounding box rendering
    from app.api.videos import execute_vision_pipeline_async
    background_tasks.add_task(execute_vision_pipeline_async, video_id, Path(output_path), "CAM_01")

    return {
        "status": "QUEUED",
        "video_id": video_id,
        "message": "Demo video generated and queued for vision pipeline execution.",
    }


@app.get("/")
def root_summary():
    """Root backend endpoint returning active service summary and API documentation link."""
    return {
        "service": settings.PROJECT_NAME,
        "status": "ONLINE",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "health_check": f"{settings.API_V1_STR}/health",
        "message": "Industrial Safety Vision AI Backend is fully operational.",
    }


@app.get("/health")
@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    """System health check endpoint."""
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "storage": "Local / MinIO",
        "cache": "Memory / Redis",
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
