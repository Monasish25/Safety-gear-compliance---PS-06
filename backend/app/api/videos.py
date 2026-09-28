import os
import uuid
from typing import Dict, Any, List
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException, Form
from sqlalchemy.orm import Session
import datetime

from app.core.config import settings
from app.core.database import get_db
from app.models import schema
from app.schemas import dto
from app.api.ws import manager

router = APIRouter(prefix="/videos", tags=["Video Processing"])

# Simple in-memory tracker for hackathon demo purposes
processing_status: Dict[str, Dict[str, Any]] = {}

async def process_video_pipeline(video_id: str, file_path: Path, zone_id: str, db: Session):
    """
    Mock pipeline that simulates video processing, generating Detections and Alerts
    in the new schema instead of the old SafetyEvent schema.
    """
    processing_status[video_id] = {
        "video_id": video_id,
        "status": "PROCESSING",
        "total_frames": 100,
        "processed_frames": 0,
        "progress_percent": 0.0,
        "violation_count": 0
    }
    
    try:
        # Simulate processing 100 frames
        for i in range(1, 101):
            import asyncio
            await asyncio.sleep(0.05)
            processing_status[video_id]["processed_frames"] = i
            processing_status[video_id]["progress_percent"] = (i / 100) * 100
            
            # Simulate a detection at frame 50
            if i == 50:
                detection = schema.Detection(
                    detection_id=str(uuid.uuid4()),
                    zone_id=zone_id,
                    tracker_id="Worker_42",
                    event_type="no_helmet",
                    confidence=0.89,
                    frame_timestamp=datetime.datetime.now(datetime.timezone.utc),
                    snapshot_path=f"snapshot_{video_id}_{i}.jpg"
                )
                db.add(detection)
                db.commit()
                db.refresh(detection)
                
                # Escalate to Alert
                alert = schema.Alert(
                    alert_id=str(uuid.uuid4()),
                    detection_id=detection.detection_id,
                    zone_id=zone_id,
                    event_type="no_helmet",
                    severity="high",
                    status="open",
                    triggered_at=datetime.datetime.now(datetime.timezone.utc)
                )
                db.add(alert)
                db.commit()
                
                processing_status[video_id]["violation_count"] += 1
                
                # Broadcast the new alert
                await manager.broadcast_alert({
                    "type": "NEW_ALERT",
                    "alert_id": alert.alert_id,
                    "event_type": alert.event_type,
                    "zone_id": alert.zone_id
                })

        processing_status[video_id]["status"] = "COMPLETED"
    except Exception as e:
        processing_status[video_id]["status"] = "FAILED"
        print(f"Video processing failed: {e}")


@router.post("/upload", response_model=dto.VideoUploadResponse)
async def upload_video(file: UploadFile = File(...)):
    if not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Must be a video.")
        
    video_id = str(uuid.uuid4())
    upload_dir = settings.LOCAL_STORAGE_DIR / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_dir / f"{video_id}_{file.filename}"
    
    with open(file_path, "wb") as f:
        while (chunk := await file.read(1024 * 1024)):
            f.write(chunk)
            
    return {
        "video_id": video_id,
        "filename": file.filename,
        "status": "QUEUED",
        "message": "Video uploaded successfully and queued for processing."
    }

@router.post("/{video_id}/process", response_model=dto.VideoProcessStatus)
def process_video_endpoint(
    video_id: str,
    background_tasks: BackgroundTasks,
    zone_id: str = "ZONE_ASSEMBLY",
    db: Session = Depends(get_db)
):
    # For a real implementation, you'd lookup the uploaded file path in DB
    # We will simulate the start by triggering the background task directly
    
    upload_dir = settings.LOCAL_STORAGE_DIR / "uploads"
    # we just need a dummy path for the mock
    dummy_path = upload_dir / f"{video_id}.mp4" 
    
    # Ensure zone exists or use first available
    zone = db.query(schema.Zone).filter(schema.Zone.zone_id == zone_id).first()
    if not zone:
        zone = db.query(schema.Zone).first()
        if not zone:
             raise HTTPException(status_code=400, detail="No zones configured in database.")
        zone_id = zone.zone_id

    background_tasks.add_task(process_video_pipeline, video_id, dummy_path, zone_id, db)
    
    return {
        "video_id": video_id,
        "status": "QUEUED",
        "total_frames": 0,
        "processed_frames": 0,
        "progress_percent": 0.0,
        "violation_count": 0
    }

@router.get("/{video_id}/status", response_model=dto.VideoProcessStatus)
def get_processing_status(video_id: str):
    if video_id not in processing_status:
        raise HTTPException(status_code=404, detail="Video not found in processing queue")
        
    return processing_status[video_id]
