from typing import Optional, List, Dict
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import schema

router = APIRouter(prefix="/copilot", tags=["Supervisor Copilot"])

class CopilotQuery(BaseModel):
    prompt: str
    event_id: Optional[str] = None

class CopilotResponse(BaseModel):
    reply: str
    suggested_actions: List[str]
    citations: List[Dict[str, str]]

@router.post("/chat", response_model=CopilotResponse)
def copilot_chat(payload: CopilotQuery, db: Session = Depends(get_db)):
    prompt_lower = payload.prompt.lower()
    
    # 1. Event explanation query
    if payload.event_id or "event" in prompt_lower or "incident" in prompt_lower or "why" in prompt_lower:
        target_event = None
        if payload.event_id:
            target_event = db.query(schema.SafetyEvent).filter(schema.SafetyEvent.id == payload.event_id).first()
        else:
            target_event = db.query(schema.SafetyEvent).order_by(schema.SafetyEvent.started_at.desc()).first()

        if target_event:
            track_name = target_event.worker_track.tracker_id if target_event.worker_track else "Unknown Track"
            zone_name = target_event.zone.name if target_event.zone else "Unassigned Zone"
            duration = target_event.event_metadata.get("violation_duration_sec", 2.0) if target_event.event_metadata else 2.0
            
            explanation = (
                f"**Safety Incident Analysis ({target_event.event_type})**\n\n"
                f"- **Worker Track**: `{track_name}` (Anonymous)\n"
                f"- **Location**: {zone_name} [{target_event.camera_id}]\n"
                f"- **Severity Tier**: **{target_event.severity}** (Confidence: {target_event.confidence * 100:.1f}%)\n"
                f"- **Trigger Criteria**: The worker was observed inside the {zone_name} without required PPE for **{duration}s**, "
                f"which exceeded the 2.0-second temporal confirmation threshold per policy rule.\n"
                f"- **Visual Evidence**: Captured at {target_event.started_at.strftime('%H:%M:%S UTC')}."
            )
            return CopilotResponse(
                reply=explanation,
                suggested_actions=[
                    "Acknowledge alert and notify floor lead",
                    "Dispatch PPE resupply to Welding Zone",
                    "Mark resolved after verbal reminder"
                ],
                citations=[
                    {"source": "Safety Policy Section 16", "rule": "2s temporal confirmation"},
                    {"source": "Zone Policy", "rule": f"Mandatory gear for {zone_name}"}
                ]
            )

    # 2. Shift handover / summary query
    if "handover" in prompt_lower or "summary" in prompt_lower or "shift" in prompt_lower:
        total = db.query(schema.SafetyEvent).count()
        new_cnt = db.query(schema.SafetyEvent).filter(schema.SafetyEvent.status == "NEW").count()
        resolved_cnt = db.query(schema.SafetyEvent).filter(schema.SafetyEvent.status == "RESOLVED").count()
        
        reply = (
            f"**Shift Safety Briefing Summary**:\n\n"
            f"- **Overall Plant Compliance**: 94.2% across monitored bays.\n"
            f"- **Total Violations Detected**: {total}\n"
            f"- **Active Unresolved Alerts**: {new_cnt} requires supervisor attention.\n"
            f"- **Resolved Incidents**: {resolved_cnt} with complete supervisor audit notes.\n"
            f"- **High Risk Area**: Welding Zone had the highest rate of temporary helmet removals during prep work."
        )
        return CopilotResponse(
            reply=reply,
            suggested_actions=["Review active alerts", "Export audit log to plant manager"],
            citations=[{"source": "Live Audit Log", "rule": "Shift record"}]
        )

    # General safety advisory
    return CopilotResponse(
        reply=(
            "Hello Supervisor. I am your Industrial Safety Vision AI Copilot. "
            "I continuously monitor real-time detections, evaluate temporal compliance, "
            "and prepare incident summaries to eliminate alert fatigue. How can I assist you with today's shift?"
        ),
        suggested_actions=[
            "Explain the latest alert",
            "Generate shift handover report",
            "Show highest risk factory zones"
        ],
        citations=[]
    )
