import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# Zone Schemas
class ZoneBase(BaseModel):
    name: str
    camera_source: Optional[str] = None
    status: str = "ok"

class ZoneCreate(ZoneBase):
    pass

class ZoneResponse(ZoneBase):
    zone_id: str
    created_at: datetime.datetime
    class Config:
        from_attributes = True

# Detection Schemas
class DetectionBase(BaseModel):
    zone_id: str
    tracker_id: Optional[str] = None
    event_type: str
    confidence: float
    frame_timestamp: datetime.datetime
    snapshot_path: Optional[str] = None

class DetectionCreate(DetectionBase):
    pass

class DetectionResponse(DetectionBase):
    detection_id: str
    created_at: datetime.datetime
    class Config:
        from_attributes = True

# Alert Schemas
class AlertBase(BaseModel):
    detection_id: str
    zone_id: str
    event_type: str
    severity: str
    status: str = "open"
    triggered_at: datetime.datetime
    resolved_at: Optional[datetime.datetime] = None

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    alert_id: str
    class Config:
        from_attributes = True

class AlertStatusUpdate(BaseModel):
    status: str = Field(..., description="acknowledged or resolved")

# Notification Schemas
class NotificationResponse(BaseModel):
    notification_id: str
    alert_id: str
    channel: str
    sent_at: datetime.datetime
    delivery_status: str
    class Config:
        from_attributes = True

# Daily Zone Summary
class DailyZoneSummaryResponse(BaseModel):
    summary_id: str
    zone_id: str
    date: datetime.date
    compliance_pct: Optional[float]
    incident_count: int
    avg_detection_to_alert_latency_ms: Optional[int]
    class Config:
        from_attributes = True

# Worker Schemas
class WorkerResponse(BaseModel):
    worker_id: str
    name: str
    assigned_zone: Optional[str]
    created_at: datetime.datetime
    class Config:
        from_attributes = True

# Model Run Schemas
class ModelRunResponse(BaseModel):
    run_id: str
    model_name: str
    model_version: str
    video_source: Optional[str]
    started_at: datetime.datetime
    ended_at: Optional[datetime.datetime]
    class Config:
        from_attributes = True

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

# Analytics
class AnalyticsSummary(BaseModel):
    compliance_rate: float
    total_alerts: int
    active_alerts: int
    acknowledged_alerts: int
    resolved_alerts: int
    false_alert_rate: float
    avg_ack_time_seconds: float
    by_zone: Dict[str, int]
    by_type: Dict[str, int]
    by_severity: Dict[str, int]
    zone_compliance: Dict[str, float]
