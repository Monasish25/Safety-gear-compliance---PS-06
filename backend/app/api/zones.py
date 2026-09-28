import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import schema
from app.schemas import dto

router = APIRouter(prefix="/zones", tags=["Zones"])

@router.get("", response_model=List[dto.ZoneResponse])
def get_zones(db: Session = Depends(get_db)):
    return db.query(schema.Zone).all()

@router.post("", response_model=dto.ZoneResponse)
def create_zone(payload: dto.ZoneCreate, db: Session = Depends(get_db)):
    zone = schema.Zone(
        zone_id=str(uuid.uuid4()),
        name=payload.name,
        camera_source=payload.camera_source,
        status=payload.status
    )
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone

@router.get("/{zone_id}", response_model=dto.ZoneResponse)
def get_zone(zone_id: str, db: Session = Depends(get_db)):
    zone = db.query(schema.Zone).filter(schema.Zone.zone_id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone
