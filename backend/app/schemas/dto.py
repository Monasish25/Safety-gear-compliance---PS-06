import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# Camera Schemas
class CameraBase(BaseModel):
    id: str
    name: str
    location_label: str
    stream_url: Optional[str] = None
    is_active: bool = True

class CameraCreate(CameraBase):
    pass

class CameraResponse(CameraBase):
    created_at: datetime.datetime
    class Config:
        from_attributes = True

# Zone Schemas
class ZoneBase(BaseModel):
    id: str
    camera_id: str
    name: str
    risk_level: str = "Medium"
    polygon: Dict[str, Any]

class ZoneCreate(ZoneBase):
    pass

class ZoneResponse(ZoneBase):
    created_at: datetime.datetime
    class Config:
        from_attributes = True

# PPE Rule Schemas
class PPERuleBase(BaseModel):
    zone_id: str
    helmet_required: bool = True
    vest_required: bool = True
    gloves_required: bool = False
    mask_required: bool = False

class PPERuleUpdate(BaseModel):
    helmet_required: Optional[bool] = None
    vest_required: Optional[bool] = None
    gloves_required: Optional[bool] = None
    mask_required: Optional[bool] = None

class PPERuleResponse(PPERuleBase):
    id: str
    updated_at: datetime.datetime
    class Config:
        from_attributes = True

# Alert Actions
class AlertActionCreate(BaseModel):
    action: str = Field(..., description="ACKNOWLEDGE or RESOLVE")
    note: Optional[str] = None
    user_id: Optional[str] = None

class AlertActionResponse(BaseModel):
    id: str
    action: str
    note: Optional[str]
    timestamp: datetime.datetime
    user_id: Optional[str]
    class Config:
        from_attributes = True

# Evidence
class EvidenceResponse(BaseModel):
    id: str
    evidence_type: str
    object_path: str
    captured_at: datetime.datetime
    is_annotated: bool
    url: Optional[str] = None
    class Config:
        from_attributes = True

# Safety Event Schemas
class SafetyEventResponse(BaseModel):
    id: str
    camera_id: str
    zone_id: Optional[str]
    worker_track_id: Optional[str]
    event_type: str
    severity: str
    confidence: float
    status: str
    started_at: datetime.datetime
    ended_at: Optional[datetime.datetime] = None
    acknowledged_at: Optional[datetime.datetime] = None
    resolved_at: Optional[datetime.datetime] = None
    snapshot_url: Optional[str] = None
    event_metadata: Optional[Dict[str, Any]] = None
    actions: List[AlertActionResponse] = []
    class Config:
        from_attributes = True

class EventStatusUpdate(BaseModel):
    status: str = Field(..., description="ACKNOWLEDGED or RESOLVED")
    note: Optional[str] = None
    user_id: Optional[str] = None

# Analytics
class AnalyticsSummary(BaseModel):
    compliance_rate: float
    total_events: int
    active_alerts: int
    acknowledged_alerts: int
    resolved_alerts: int
    false_alert_rate: float
    avg_ack_time_seconds: float
    by_zone: Dict[str, int]
    by_type: Dict[str, int]
    by_severity: Dict[str, int]
    zone_compliance: Dict[str, float]

# Video Upload & Processing
class VideoUploadResponse(BaseModel):
    video_id: str
    filename: str
    status: str
    message: str

class VideoProcessStatus(BaseModel):
    video_id: str
    status: str
    total_frames: int
    processed_frames: int
    progress_percent: float
    violation_count: int
