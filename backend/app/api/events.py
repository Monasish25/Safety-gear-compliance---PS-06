import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import schema
from app.schemas import dto
from app.api.ws import manager

router = APIRouter(prefix="/events", tags=["Safety Events & Alerts"])

@router.get("/alerts", response_model=List[dto.AlertResponse])
def get_alerts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    zone_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(schema.Alert)
    if status:
        query = query.filter(schema.Alert.status == status.lower())
    if severity:
        query = query.filter(schema.Alert.severity == severity.lower())
    if zone_id:
        query = query.filter(schema.Alert.zone_id == zone_id)

    alerts = query.order_by(schema.Alert.triggered_at.desc()).limit(limit).all()
    return alerts

@router.patch("/alerts/{alert_id}/status", response_model=dto.AlertResponse)
async def update_alert_status(
    alert_id: str,
    payload: dto.AlertStatusUpdate,
    db: Session = Depends(get_db)
):
    alert = db.query(schema.Alert).filter(schema.Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    new_status = payload.status.lower()
    if new_status not in ["acknowledged", "resolved"]:
        raise HTTPException(status_code=400, detail="Status must be acknowledged or resolved")

    now = datetime.datetime.now(datetime.timezone.utc)
    alert.status = new_status

    if new_status == "resolved":
        alert.resolved_at = now

    db.commit()
    db.refresh(alert)

    # Broadcast status change via WebSocket
    await manager.broadcast_alert({
        "type": "STATUS_UPDATE",
        "alert_id": alert.alert_id,
        "status": alert.status
    })

    return alert

@router.get("/detections", response_model=List[dto.DetectionResponse])
def get_detections(
    zone_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(schema.Detection)
    if zone_id:
        query = query.filter(schema.Detection.zone_id == zone_id)
    if event_type:
        query = query.filter(schema.Detection.event_type == event_type.lower())

    detections = query.order_by(schema.Detection.frame_timestamp.desc()).limit(limit).all()
    return detections
