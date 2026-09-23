import os
import uuid
import asyncio
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db, SessionLocal
from app.models import schema
from app.schemas import dto
from app.cv.pipeline import SafetyPipeline
from app.api.ws import manager

router = APIRouter(prefix="/videos", tags=["Videos"])

# Dictionary to track ongoing processing status
processing_status = {}

def run_pipeline_task(video_id: str, file_path: str, camera_id: str):
    db = SessionLocal()
    try:
        video_rec = db.query(schema.ProcessedVideo).filter(schema.ProcessedVideo.id == video_id).first()
        if video_rec:
            video_rec.status = "PROCESSING"
            db.commit()

        pipeline = SafetyPipeline(camera_id=camera_id)

        def on_alert(alert_data):
            # Broadcast live alert to WebSocket
            asyncio.run(manager.broadcast_alert({
                "type": "NEW_ALERT",
                "alert": alert_data
            }))

        def on_progress(progress, processed, violations):
            processing_status[video_id] = {
                "progress_percent": round(progress * 100, 1),
                "processed_frames": processed,
                "violation_count": violations,
                "status": "PROCESSING"
            }

        results = pipeline.process_video(
            video_path=file_path,
            video_id=video_id,
            on_alert_callback=on_alert,
            on_progress_callback=on_progress,
            save_annotated_video=True
        )

        video_rec = db.query(schema.ProcessedVideo).filter(schema.ProcessedVideo.id == video_id).first()
        if video_rec:
            video_rec.status = "COMPLETED"
            video_rec.total_frames = results["total_frames"]
            video_rec.processed_frames = results["processed_frames"]
            video_rec.violation_count = results["violation_count"]
            db.commit()

        processing_status[video_id] = {
            "progress_percent": 100.0,
            "processed_frames": results["processed_frames"],
            "total_frames": results["total_frames"],
            "violation_count": results["violation_count"],
            "status": "COMPLETED",
            "annotated_video": results.get("annotated_video_path")
        }

    except Exception as e:
        if video_rec:
            video_rec.status = "FAILED"
            db.commit()
        processing_status[video_id] = {
            "progress_percent": 0.0,
            "status": "FAILED",
            "error": str(e)
        }
    finally:
        db.close()

@router.post("/upload", response_model=dto.VideoUploadResponse)
async def upload_video(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith((".mp4", ".avi", ".mov", ".mkv")):
        raise HTTPException(status_code=400, detail="Only video files (.mp4, .avi, .mov) are supported")

    video_id = str(uuid.uuid4())
    upload_dir = settings.LOCAL_STORAGE_DIR / "videos"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_dir / f"{video_id}_{file.filename}"
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    video_rec = schema.ProcessedVideo(
        id=video_id,
        filename=file.filename,
        file_path=str(file_path),
        status="QUEUED"
    )
    db.add(video_rec)
    db.commit()

    return dto.VideoUploadResponse(
        video_id=video_id,
        filename=file.filename,
        status="QUEUED",
        message="Video uploaded successfully. Call POST /videos/{id}/process to start inference."
    )

@router.post("/{video_id}/process", response_model=dto.VideoProcessStatus)
def process_video_endpoint(
    video_id: str,
    camera_id: str = "CAM_01",
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    video_rec = db.query(schema.ProcessedVideo).filter(schema.ProcessedVideo.id == video_id).first()
    if not video_rec:
        raise HTTPException(status_code=404, detail="Video record not found")

    processing_status[video_id] = {
        "status": "PROCESSING",
        "progress_percent": 0.0,
        "processed_frames": 0,
        "total_frames": 0,
        "violation_count": 0
    }

    background_tasks.add_task(run_pipeline_task, video_id, video_rec.file_path, camera_id)

    return dto.VideoProcessStatus(
        video_id=video_id,
        status="PROCESSING",
        total_frames=0,
        processed_frames=0,
        progress_percent=0.0,
        violation_count=0
    )

@router.get("/{video_id}/results")
def get_video_results(video_id: str, db: Session = Depends(get_db)):
    if video_id in processing_status:
        return processing_status[video_id]

    video_rec = db.query(schema.ProcessedVideo).filter(schema.ProcessedVideo.id == video_id).first()
    if not video_rec:
        raise HTTPException(status_code=404, detail="Video not found")

    return {
        "video_id": video_rec.id,
        "status": video_rec.status,
        "total_frames": video_rec.total_frames,
        "processed_frames": video_rec.processed_frames,
        "violation_count": video_rec.violation_count
    }

@router.get("/{video_id}/stream")
def stream_video(video_id: str, db: Session = Depends(get_db)):
    out_dir = settings.LOCAL_STORAGE_DIR / "videos"
    annotated_path = out_dir / f"annotated_{video_id}.mp4"
    if annotated_path.exists():
        return FileResponse(annotated_path, media_type="video/mp4")

    video_rec = db.query(schema.ProcessedVideo).filter(schema.ProcessedVideo.id == video_id).first()
    if video_rec and Path(video_rec.file_path).exists():
        return FileResponse(video_rec.file_path, media_type="video/mp4")

    raise HTTPException(status_code=404, detail="Video file not found")
