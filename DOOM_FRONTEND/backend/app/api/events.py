import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import schema
from app.schemas import dto
from app.api.ws import manager

router = APIRouter(prefix="/events", tags=["Safety Events"])

def format_event_response(event: schema.SafetyEvent) -> dict:
    snapshot_url = None
    if event.evidence_files:
        snapshot_url = f"/api/v1/evidence/{event.evidence_files[0].object_path}"

    actions_list = [
        dto.AlertActionResponse(
            id=a.id,
            action=a.action,
            note=a.note,
            timestamp=a.timestamp,
            user_id=a.user_id
        ) for a in event.actions
    ]

    return {
        "id": event.id,
        "camera_id": event.camera_id,
        "zone_id": event.zone_id,
        "worker_track_id": event.worker_track.tracker_id if event.worker_track else None,
        "event_type": event.event_type,
        "severity": event.severity,
        "confidence": event.confidence,
        "status": event.status,
        "started_at": event.started_at,
        "ended_at": event.ended_at,
        "acknowledged_at": event.acknowledged_at,
        "resolved_at": event.resolved_at,
        "snapshot_url": snapshot_url,
        "event_metadata": event.event_metadata,
        "actions": actions_list
    }

@router.get("", response_model=List[dto.SafetyEventResponse])
def get_events(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    camera_id: Optional[str] = Query(None),
    zone_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(schema.SafetyEvent)
    if status:
        query = query.filter(schema.SafetyEvent.status == status.upper())
    if severity:
        query = query.filter(schema.SafetyEvent.severity == severity.upper())
    if camera_id:
        query = query.filter(schema.SafetyEvent.camera_id == camera_id)
    if zone_id:
        query = query.filter(schema.SafetyEvent.zone_id == zone_id)

    events = query.order_by(schema.SafetyEvent.started_at.desc()).limit(limit).all()
    return [format_event_response(e) for e in events]

@router.get("/{event_id}", response_model=dto.SafetyEventResponse)
def get_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(schema.SafetyEvent).filter(schema.SafetyEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return format_event_response(event)

@router.patch("/{event_id}/status", response_model=dto.SafetyEventResponse)
async def update_event_status(
    event_id: str,
    payload: dto.EventStatusUpdate,
    db: Session = Depends(get_db)
):
    event = db.query(schema.SafetyEvent).filter(schema.SafetyEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    new_status = payload.status.upper()
    if new_status not in ["ACKNOWLEDGED", "RESOLVED"]:
        raise HTTPException(status_code=400, detail="Status must be ACKNOWLEDGED or RESOLVED")

    now = datetime.datetime.now(datetime.timezone.utc)
    event.status = new_status

    if new_status == "ACKNOWLEDGED":
        event.acknowledged_at = now
        event.acknowledged_by = payload.user_id
    elif new_status == "RESOLVED":
        event.resolved_at = now
        event.ended_at = now

    # Record action audit log (PRD Section 20 & 23)
    action_log = schema.AlertAction(
        id=str(uuid.uuid4()),
        safety_event_id=event.id,
        action=new_status,
        user_id=payload.user_id,
        timestamp=now,
        note=payload.note
    )
    db.add(action_log)
    db.commit()
    db.refresh(event)

    formatted = format_event_response(event)
    # Broadcast status change via WebSocket
    await manager.broadcast_alert({
        "type": "STATUS_UPDATE",
        "event": formatted
    })

    return formatted

@router.post("/{event_id}/notes", response_model=dto.AlertActionResponse)
def add_event_note(
    event_id: str,
    payload: dto.AlertActionCreate,
    db: Session = Depends(get_db)
):
    event = db.query(schema.SafetyEvent).filter(schema.SafetyEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    action_log = schema.AlertAction(
        id=str(uuid.uuid4()),
        safety_event_id=event.id,
        action="NOTE",
        user_id=payload.user_id,
        timestamp=datetime.datetime.now(datetime.timezone.utc),
        note=payload.note
    )
    db.add(action_log)
    db.commit()
    db.refresh(action_log)

    return dto.AlertActionResponse(
        id=action_log.id,
        action=action_log.action,
        note=action_log.note,
        timestamp=action_log.timestamp,
        user_id=action_log.user_id
    )
