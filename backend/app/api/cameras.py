from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import schema
from app.schemas import dto

router = APIRouter(prefix="/cameras", tags=["Cameras"])

@router.get("", response_model=List[dto.CameraResponse])
def get_cameras(db: Session = Depends(get_db)):
    return db.query(schema.Camera).all()

@router.post("", response_model=dto.CameraResponse)
def create_camera(payload: dto.CameraCreate, db: Session = Depends(get_db)):
    existing = db.query(schema.Camera).filter(schema.Camera.id == payload.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Camera ID already exists")
    
    cam = schema.Camera(**payload.model_dump())
    db.add(cam)
    db.commit()
    db.refresh(cam)
    return cam

@router.get("/{camera_id}", response_model=dto.CameraResponse)
def get_camera(camera_id: str, db: Session = Depends(get_db)):
    cam = db.query(schema.Camera).filter(schema.Camera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    return cam

@router.get("/{camera_id}/zones", response_model=List[dto.ZoneResponse])
def get_camera_zones(camera_id: str, db: Session = Depends(get_db)):
    return db.query(schema.Zone).filter(schema.Zone.camera_id == camera_id).all()
