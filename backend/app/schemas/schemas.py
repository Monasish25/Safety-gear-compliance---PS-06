import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict


# ==========================================
# Camera Schemas
# ==========================================
class CameraBase(BaseModel):
    name: str = Field(..., description="Name of the camera stream")
    location_label: Optional[str] = Field(None, description="Location description/label")
    stream_url: Optional[str] = Field(None, description="RTSP or HTTP video stream URL")
    is_active: bool = Field(True, description="Camera status flag")


class CameraCreate(CameraBase):
    pass


class CameraResponse(CameraBase):
    camera_id: str
    created_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Compliance Rule / PPE Rule Schemas
# ==========================================
class ComplianceRuleBase(BaseModel):
    helmet_required: Optional[bool] = Field(True, description="Is helmet mandatory in this zone?")
    vest_required: Optional[bool] = Field(True, description="Is safety vest mandatory in this zone?")
    goggles_required: Optional[bool] = Field(False, description="Are protective goggles mandatory in this zone?")
    gloves_required: Optional[bool] = Field(False, description="Are work gloves mandatory in this zone?")
    mask_required: Optional[bool] = Field(False, description="Is protective mask mandatory in this zone?")


class ComplianceRuleCreate(ComplianceRuleBase):
    zone_id: str = Field(..., description="Target Zone ID")


class ComplianceRuleUpdate(ComplianceRuleBase):
    pass


class ComplianceRuleResponse(ComplianceRuleBase):
    rule_id: str
    zone_id: str
    created_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)


# Schema aliases for legacy routers (e.g. ppe_rules.py)
PPERuleBase = ComplianceRuleBase
PPERuleCreate = ComplianceRuleCreate
PPERuleUpdate = ComplianceRuleUpdate
PPERuleResponse = ComplianceRuleResponse


# ==========================================
# Zone Schemas
# ==========================================
class ZoneBase(BaseModel):
    name: str = Field(..., description="Zone identifier/name")
    camera_id: Optional[str] = Field(None, description="Associated camera ID")
    risk_level: str = Field("Medium", description="Low, Medium, High, Critical")
    polygon: Optional[Union[List[Dict[str, float]], List[List[float]], Dict[str, Any]]] = Field(
        None, description="Bounding polygon vertex coordinates"
    )
    camera_source: Optional[str] = Field(None, description="Optional stream source override")
    status: str = Field("ok", description="Zone health status: ok, warning, alert")


class ZoneCreate(ZoneBase):
    compliance_rule: Optional[ComplianceRuleBase] = None


class ZoneResponse(ZoneBase):
    zone_id: str
    created_at: datetime.datetime
    compliance_rule: Optional[ComplianceRuleResponse] = None
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Detection Schemas (Raw Bounding Boxes)
# ==========================================
class DetectionBase(BaseModel):
    zone_id: Optional[str] = Field(None, description="Associated Zone ID")
    camera_id: Optional[str] = Field(None, description="Associated Camera ID")
    tracker_id: Optional[str] = Field(None, description="Anonymous worker tracker ID (e.g. CAM_01_W_017)")
    event_type: str = Field(..., description="Detected class (person, helmet, vest, goggles, smoke, fire, no_helmet)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence score")
    bbox: Optional[List[float]] = Field(None, description="Bounding box coordinates [x_min, y_min, x_max, y_max]")
    frame_timestamp: datetime.datetime = Field(..., description="Timestamp of the processed frame")
    snapshot_path: Optional[str] = Field(None, description="Relative path to captured frame snapshot")
    
    # Demo Performance Metadata
    inference_time_ms: Optional[float] = Field(0.0, description="Frame inference latency in milliseconds")
    precision: Optional[float] = Field(1.0, description="Model precision benchmark score")
    recall: Optional[float] = Field(1.0, description="Model recall benchmark score")


class DetectionCreate(DetectionBase):
    pass


class DetectionResponse(DetectionBase):
    detection_id: str
    created_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)


WorkerTrackResponse = DetectionResponse


# ==========================================
# Alert Schemas (Confirmed Violations)
# ==========================================
class AlertBase(BaseModel):
    detection_id: Optional[str] = Field(None, description="Originating detection ID")
    zone_id: str = Field(..., description="Zone ID where violation occurred")
    camera_id: Optional[str] = Field(None, description="Camera ID capturing the incident")
    tracker_id: str = Field(..., description="Anonymous worker tracker ID (e.g. CAM_01_W_017)")
    event_type: str = Field(..., description="Violation type: MISSING_HELMET, MISSING_VEST, MISSING_GOGGLES, FIRE, SMOKE")
    violation_reason: Optional[str] = Field("Safety compliance policy violation detected", description="Detailed description of rule non-compliance")
    severity: str = Field("medium", description="Alert severity: low, medium, high, critical")
    status: str = Field("open", description="Alert lifecycle status: open, acknowledged, resolved")
    snapshot_path: Optional[str] = Field(None, description="Relative URL or object storage path for evidence snapshot")
    
    # Demo Performance Metadata
    inference_time_ms: Optional[float] = Field(0.0, description="Total pipeline detection-to-alert latency in ms")
    precision: Optional[float] = Field(1.0, description="Precision rating of temporal confirmation")
    recall: Optional[float] = Field(1.0, description="Recall rating of temporal confirmation")


class AlertCreate(AlertBase):
    triggered_at: Optional[datetime.datetime] = None


class AlertResponse(AlertBase):
    alert_id: str
    triggered_at: datetime.datetime
    acknowledged_at: Optional[datetime.datetime] = None
    resolved_at: Optional[datetime.datetime] = None
    model_config = ConfigDict(from_attributes=True)


class AlertStatusUpdate(BaseModel):
    status: str = Field(..., description="Target status: acknowledged or resolved")
    note: Optional[str] = Field(None, description="Supervisor audit note for resolution")


SafetyEventResponse = AlertResponse


# ==========================================
# Notification Schemas
# ==========================================
class NotificationResponse(BaseModel):
    notification_id: str
    alert_id: str
    channel: str
    sent_at: datetime.datetime
    delivery_status: str
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Aggregated Metrics & Summaries
# ==========================================
class DailyZoneSummaryResponse(BaseModel):
    summary_id: str
    zone_id: str
    date: datetime.date
    compliance_pct: Optional[float]
    incident_count: int
    avg_detection_to_alert_latency_ms: Optional[int]
    model_config = ConfigDict(from_attributes=True)


class WorkerResponse(BaseModel):
    worker_id: str
    name: str
    assigned_zone: Optional[str]
    created_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)


class ModelRunResponse(BaseModel):
    run_id: str
    model_name: str
    model_version: str
    video_source: Optional[str]
    inference_time_ms: Optional[float] = 0.0
    precision: Optional[float] = 1.0
    recall: Optional[float] = 1.0
    started_at: datetime.datetime
    ended_at: Optional[datetime.datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Video & Demo Endpoints Schemas
# ==========================================
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
    inference_time_ms: Optional[float] = 0.0
    precision: Optional[float] = 1.0
    recall: Optional[float] = 1.0


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
