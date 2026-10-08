import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.models import schema
from app.schemas import dto
from app.api.ws import manager

router = APIRouter(prefix="/events", tags=["Safety Events & Incidents"])


@router.get("", response_model=List[dto.AlertResponse])
@router.get("/", response_model=List[dto.AlertResponse])
@router.get("/alerts", response_model=List[dto.AlertResponse])
async def get_alerts(
    response: Response,
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: open, unresolved, acknowledged, resolved, all"),
    severity: Optional[str] = Query(None, description="Filter by severity: low, medium, high, critical"),
    zone_id: Optional[str] = Query(None, description="Filter by zone ID"),
    search: Optional[str] = Query(None, alias="query", description="Search term for tracker_id, violation_reason, or event_type"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(10, ge=1, le=500, alias="limit", description="Items per page"),
    db: Session = Depends(get_db)
):
    """
    Retrieve safety incident alerts for the Supervisor Incident Dashboard.
    Supports pagination, full-text search, and multi-field filtering.
    """
    query_builder = db.query(schema.Alert)

    # Status Filtering
    if status_filter and status_filter.lower() != "all":
        st = status_filter.lower()
        if st in ["unresolved", "open", "new"]:
            query_builder = query_builder.filter(
                or_(schema.Alert.status == "open", schema.Alert.status == "new", schema.Alert.status == "unresolved")
            )
        else:
            query_builder = query_builder.filter(schema.Alert.status == st)

    # Severity Filtering
    if severity and severity.lower() != "all":
        query_builder = query_builder.filter(schema.Alert.severity == severity.lower())

    # Zone Filtering
    if zone_id and zone_id.lower() != "all":
        query_builder = query_builder.filter(schema.Alert.zone_id == zone_id)

    # Free-text Search
    if search and search.strip():
        term = f"%{search.strip()}%"
        query_builder = query_builder.filter(
            or_(
                schema.Alert.tracker_id.ilike(term),
                schema.Alert.violation_reason.ilike(term),
                schema.Alert.event_type.ilike(term),
                schema.Alert.alert_id.ilike(term),
            )
        )

    # Total Count for Pagination Header
    total_count = query_builder.count()
    offset = (page - 1) * page_size

    # Execute Paginated Query
    alerts = query_builder.order_by(schema.Alert.triggered_at.desc()).offset(offset).limit(page_size).all()

    # Expose pagination headers
    response.headers["X-Total-Count"] = str(total_count)
    response.headers["X-Page"] = str(page)
    response.headers["X-Page-Size"] = str(page_size)

    return alerts


@router.get("/{alert_id}", response_model=dto.AlertResponse)
@router.get("/alerts/{alert_id}", response_model=dto.AlertResponse)
async def get_alert_by_id(alert_id: str, db: Session = Depends(get_db)):
    """Fetch details for a specific safety alert by ID."""
    alert = db.query(schema.Alert).filter(
        (schema.Alert.alert_id == alert_id) | (schema.Alert.id == alert_id)
    ).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Safety alert with ID {alert_id} not found"
        )
    return alert


@router.patch("/{alert_id}/status", response_model=dto.AlertResponse)
@router.patch("/alerts/{alert_id}/status", response_model=dto.AlertResponse)
async def update_alert_status(
    alert_id: str,
    payload: dto.AlertStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Update lifecycle status of an alert (Acknowledged / Resolved) with supervisor notes.
    Broadcasts state change in real-time via WebSockets.
    """
    alert = db.query(schema.Alert).filter(
        (schema.Alert.alert_id == alert_id) | (schema.Alert.id == alert_id)
    ).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Safety alert with ID {alert_id} not found"
        )

    target_status = payload.status.lower()
    if target_status not in ["open", "acknowledged", "resolved"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be one of: open, acknowledged, resolved"
        )

    now = datetime.datetime.now(datetime.timezone.utc)
    alert.status = target_status

    if target_status == "acknowledged":
        alert.acknowledged_at = now
    elif target_status == "resolved":
        if not alert.acknowledged_at:
            alert.acknowledged_at = now
        alert.resolved_at = now

    db.commit()
    db.refresh(alert)

    # Broadcast updated alert status to all connected frontend clients
    await manager.broadcast_alert({
        "type": "STATUS_UPDATE",
        "alert": {
            "id": alert.alert_id,
            "status": alert.status,
            "note": payload.note,
            "updated_at": now.isoformat(),
        }
    })

    return alert



@router.get("/detections", response_model=List[dto.DetectionResponse])
async def get_detections(
    zone_id: Optional[str] = Query(None, description="Filter by zone ID"),
    event_type: Optional[str] = Query(None, description="Filter by detected object class"),
    limit: int = Query(100, ge=1, le=500, description="Max detection records to return"),
    db: Session = Depends(get_db)
):
    """Retrieve raw frame-level detections for debugging and model audit trails."""
    query = db.query(schema.Detection)
    if zone_id:
        query = query.filter(schema.Detection.zone_id == zone_id)
    if event_type:
        query = query.filter(schema.Detection.event_type == event_type.lower())

    return query.order_by(schema.Detection.frame_timestamp.desc()).limit(limit).all()
