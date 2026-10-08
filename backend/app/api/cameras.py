import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import schema
from app.schemas import dto

router = APIRouter(prefix="/cameras", tags=["Cameras"])


@router.get("", response_model=List[dto.CameraResponse])
async def get_cameras(
    is_active: Optional[bool] = Query(None, description="Filter cameras by active status"),
    db: Session = Depends(get_db)
):
    """Retrieve all configured camera feeds with optional active status filtering."""
    query = db.query(schema.Camera)
    if is_active is not None:
        query = query.filter(schema.Camera.is_active == is_active)
    return query.order_by(schema.Camera.created_at.desc()).all()


@router.post("", response_model=dto.CameraResponse, status_code=status.HTTP_201_CREATED)
async def create_camera(payload: dto.CameraCreate, db: Session = Depends(get_db)):
    """Register a new camera source in the system."""
    cam = schema.Camera(
        camera_id=str(uuid.uuid4()),
        name=payload.name,
        location_label=payload.location_label,
        stream_url=payload.stream_url,
        is_active=payload.is_active,
    )
    db.add(cam)
    db.commit()
    db.refresh(cam)
    return cam


@router.get("/{camera_id}", response_model=dto.CameraResponse)
async def get_camera(camera_id: str, db: Session = Depends(get_db)):
    """Fetch details of a single camera by ID."""
    cam = db.query(schema.Camera).filter(
        (schema.Camera.camera_id == camera_id) | (schema.Camera.id == camera_id)
    ).first()
    if not cam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Camera with ID {camera_id} not found")
    return cam


@router.put("/{camera_id}", response_model=dto.CameraResponse)
async def update_camera(
    camera_id: str,
    payload: dto.CameraCreate,
    db: Session = Depends(get_db)
):
    """Update camera configuration properties."""
    cam = db.query(schema.Camera).filter(
        (schema.Camera.camera_id == camera_id) | (schema.Camera.id == camera_id)
    ).first()
    if not cam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Camera with ID {camera_id} not found")

    cam.name = payload.name
    if payload.location_label is not None:
        cam.location_label = payload.location_label
    if payload.stream_url is not None:
        cam.stream_url = payload.stream_url
    cam.is_active = payload.is_active

    db.commit()
    db.refresh(cam)
    return cam


@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_camera(camera_id: str, db: Session = Depends(get_db)):
    """Remove a camera feed configuration and its associated resources."""
    cam = db.query(schema.Camera).filter(
        (schema.Camera.camera_id == camera_id) | (schema.Camera.id == camera_id)
    ).first()
    if not cam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Camera with ID {camera_id} not found")

    db.delete(cam)
    db.commit()
    return None


@router.get("/{camera_id}/zones", response_model=List[dto.ZoneResponse])
async def get_camera_zones(camera_id: str, db: Session = Depends(get_db)):
    """Get all zones associated with a given camera."""
    return db.query(schema.Zone).filter(schema.Zone.camera_id == camera_id).all()
