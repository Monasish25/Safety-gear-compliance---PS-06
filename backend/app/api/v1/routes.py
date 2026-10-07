"""
API v1 router – cameras, zones, PPE rules, analytics, copilot
"""
from __future__ import annotations

import random
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import (
    Camera, PPERule, ViolationEvent, Zone, get_db,
)

router = APIRouter(prefix="/api/v1")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CameraOut(BaseModel):
    id: str
    name: str
    location: str
    zone_id: str
    status: str

    model_config = {"from_attributes": True}


class ZoneOut(BaseModel):
    id: str
    name: str
    description: str
    risk_level: str

    model_config = {"from_attributes": True}


class PPERuleOut(BaseModel):
    zone_id: str
    helmet_required: bool
    vest_required: bool
    gloves_required: bool
    mask_required: bool
    harness_required: bool

    model_config = {"from_attributes": True}


class PPERuleUpdate(BaseModel):
    helmet_required: bool | None = None
    vest_required: bool | None = None
    gloves_required: bool | None = None
    mask_required: bool | None = None
    harness_required: bool | None = None


class CopilotRequest(BaseModel):
    prompt: str


class CopilotResponse(BaseModel):
    reply: str
    suggested_actions: list[str]


# ---------------------------------------------------------------------------
# Cameras
# ---------------------------------------------------------------------------

@router.get("/cameras", response_model=list[CameraOut])
def list_cameras(db: Session = Depends(get_db)):
    return db.query(Camera).all()


@router.get("/cameras/{camera_id}", response_model=CameraOut)
def get_camera(camera_id: str, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter(Camera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    return cam


# ---------------------------------------------------------------------------
# Zones
# ---------------------------------------------------------------------------

@router.get("/zones", response_model=list[ZoneOut])
def list_zones(db: Session = Depends(get_db)):
    return db.query(Zone).all()


@router.get("/zones/{zone_id}", response_model=ZoneOut)
def get_zone(zone_id: str, db: Session = Depends(get_db)):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone


# ---------------------------------------------------------------------------
# PPE Rules
# ---------------------------------------------------------------------------

@router.get("/ppe-rules", response_model=list[PPERuleOut])
def list_ppe_rules(db: Session = Depends(get_db)):
    return db.query(PPERule).all()


@router.get("/ppe-rules/{zone_id}", response_model=PPERuleOut)
def get_ppe_rule(zone_id: str, db: Session = Depends(get_db)):
    rule = db.query(PPERule).filter(PPERule.zone_id == zone_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="PPE rule not found")
    return rule


@router.put("/ppe-rules/{zone_id}", response_model=PPERuleOut)
def update_ppe_rule(
    zone_id: str,
    body: PPERuleUpdate,
    db: Session = Depends(get_db),
):
    rule = db.query(PPERule).filter(PPERule.zone_id == zone_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="PPE rule not found")
    updates = body.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(rule, field, value)
    db.commit()
    db.refresh(rule)
    return rule


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

@router.get("/analytics/summary")
def analytics_summary(db: Session = Depends(get_db)) -> dict[str, Any]:
    events = db.query(ViolationEvent).all()
    total = len(events)
    resolved = sum(1 for e in events if e.resolved)
    compliance_rate = round((resolved / total * 100) if total else 100.0, 1)

    by_zone: dict[str, dict[str, Any]] = {}
    for e in events:
        zs = by_zone.setdefault(e.zone_id, {"total": 0, "resolved": 0, "violations": []})
        zs["total"] += 1
        if e.resolved:
            zs["resolved"] += 1
        zs["violations"].append(e.violation_type)

    false_alert_rate = round(random.uniform(1.5, 4.5), 2)  # placeholder

    return {
        "compliance_rate": compliance_rate,
        "total_events": total,
        "resolved_events": resolved,
        "by_zone": by_zone,
        "false_alert_rate": false_alert_rate,
    }


# ---------------------------------------------------------------------------
# Copilot Chat
# ---------------------------------------------------------------------------

_COPILOT_CANNED: dict[str, dict[str, Any]] = {
    "briefing": {
        "reply": (
            "Good morning! Here is your shift safety briefing:\n"
            "• Welding Bay: All personnel must wear full PPE (helmet, vest, gloves, mask).\n"
            "• Assembly Line: Helmets and vests are mandatory.\n"
            "• Loading Dock: Helmets and vests required; forklift operators must maintain 3-metre clearance.\n"
            "Stay safe and report any violations immediately."
        ),
        "suggested_actions": [
            "View live cameras",
            "Check today's violation log",
            "Update PPE rules for Welding Bay",
        ],
    },
    "default": {
        "reply": (
            "SafeGear Copilot is here to help! "
            "You can ask me about zone compliance, PPE requirements, or recent violations."
        ),
        "suggested_actions": [
            "Show compliance summary",
            "List active cameras",
            "Show PPE rules",
        ],
    },
}


@router.post("/copilot/chat", response_model=CopilotResponse)
def copilot_chat(body: CopilotRequest):
    prompt_lower = body.prompt.lower()
    if any(kw in prompt_lower for kw in ("brief", "summary", "shift")):
        data = _COPILOT_CANNED["briefing"]
    else:
        data = _COPILOT_CANNED["default"]
    return CopilotResponse(**data)
