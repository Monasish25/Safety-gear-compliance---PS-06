import uuid
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Float,
    Integer,
    DateTime,
    ForeignKey,
    JSON,
    Text,
    Numeric,
    Date,
)
from sqlalchemy.orm import relationship, synonym
from sqlalchemy.sql import func
from app.core.database import Base


def gen_uuid() -> str:
    """Generate a string representation of a UUID4."""
    return str(uuid.uuid4())


class Camera(Base):
    """
    Camera Entity representing live RTSP feeds or video stream sources.
    """
    __tablename__ = "cameras"

    camera_id = Column(String(36), primary_key=True, default=gen_uuid)
    id = synonym("camera_id")  # Backward compatibility alias

    name = Column(String(100), nullable=False)
    location_label = Column(String(100), nullable=True)
    stream_url = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    zones = relationship("Zone", back_populates="camera", cascade="all, delete-orphan")
    detections = relationship("Detection", back_populates="camera")
    alerts = relationship("Alert", back_populates="camera")


class ComplianceRule(Base):
    """
    ComplianceRule Entity defining mandatory PPE gear requirements per zone.
    Supported gear: Helmet, Vest, Goggles, Gloves, Mask.
    """
    __tablename__ = "compliance_rules"

    rule_id = Column(String(36), primary_key=True, default=gen_uuid)
    id = synonym("rule_id")  # Backward compatibility alias

    zone_id = Column(
        String(36),
        ForeignKey("zones.zone_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    helmet_required = Column(Boolean, nullable=False, default=True)
    vest_required = Column(Boolean, nullable=False, default=True)
    goggles_required = Column(Boolean, nullable=False, default=False)
    gloves_required = Column(Boolean, nullable=False, default=False)
    mask_required = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship
    zone = relationship("Zone", back_populates="compliance_rule")


class Zone(Base):
    """
    Zone Entity representing designated factory sectors (e.g. Welding, Assembly).
    Holds polygon boundaries and links to compliance rules.
    """
    __tablename__ = "zones"

    zone_id = Column(String(36), primary_key=True, default=gen_uuid)
    id = synonym("zone_id")  # Backward compatibility alias

    camera_id = Column(
        String(36),
        ForeignKey("cameras.camera_id", ondelete="CASCADE"),
        nullable=True,
    )
    name = Column(String(100), nullable=False)
    risk_level = Column(String(20), nullable=False, default="Medium")  # Low, Medium, High, Critical
    polygon = Column(JSON, nullable=True)  # List of dicts or coords: [{"x": 0, "y": 0}, ...]
    camera_source = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="ok")  # ok, warning, alert
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    camera = relationship("Camera", back_populates="zones")
    compliance_rule = relationship(
        "ComplianceRule",
        back_populates="zone",
        uselist=False,
        cascade="all, delete-orphan",
    )
    detections = relationship("Detection", back_populates="zone", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="zone", cascade="all, delete-orphan")
    daily_summaries = relationship("DailyZoneSummary", back_populates="zone", cascade="all, delete-orphan")
    workers = relationship("Worker", back_populates="zone")


class Detection(Base):
    """
    Detection Entity representing raw bounding boxes and inferenced objects per frame.
    Includes performance benchmark metrics (inference_time_ms, precision, recall).
    """
    __tablename__ = "detections"

    detection_id = Column(String(36), primary_key=True, default=gen_uuid)
    id = synonym("detection_id")  # Backward compatibility alias

    zone_id = Column(String(36), ForeignKey("zones.zone_id", ondelete="SET NULL"), nullable=True)
    camera_id = Column(String(36), ForeignKey("cameras.camera_id", ondelete="SET NULL"), nullable=True)
    tracker_id = Column(String(50), nullable=True)  # Anonymous worker track ID (e.g. "CAM_01_W_017")
    event_type = Column(String(50), nullable=False, default="person")  # person, helmet, vest, goggles, smoke, fire
    confidence = Column(Numeric(4, 3), nullable=False, default=0.900)
    bbox = Column(JSON, nullable=True)  # [x_min, y_min, x_max, y_max]
    frame_timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    snapshot_path = Column(Text, nullable=True)

    # Demo Performance Metadata
    inference_time_ms = Column(Float, nullable=True, default=0.0)
    precision = Column(Float, nullable=True, default=1.0)
    recall = Column(Float, nullable=True, default=1.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    zone = relationship("Zone", back_populates="detections")
    camera = relationship("Camera", back_populates="detections")
    alerts = relationship("Alert", back_populates="detection", cascade="all, delete-orphan")


class Alert(Base):
    """
    Alert Entity representing confirmed safety violations requiring supervisor action.
    Must include violation_reason, tracker_id, and zone_id.
    Includes performance benchmark metrics (inference_time_ms, precision, recall).
    """
    __tablename__ = "alerts"

    alert_id = Column(String(36), primary_key=True, default=gen_uuid)
    id = synonym("alert_id")  # Backward compatibility alias

    detection_id = Column(String(36), ForeignKey("detections.detection_id", ondelete="SET NULL"), nullable=True)
    zone_id = Column(String(36), ForeignKey("zones.zone_id", ondelete="CASCADE"), nullable=False)
    camera_id = Column(String(36), ForeignKey("cameras.camera_id", ondelete="SET NULL"), nullable=True)
    tracker_id = Column(String(50), nullable=False)  # Anonymous worker tracking identifier
    worker_track_id = synonym("tracker_id")  # Backward compatibility alias

    event_type = Column(String(50), nullable=False)  # MISSING_HELMET, MISSING_VEST, MISSING_GOGGLES, FIRE, SMOKE
    violation_reason = Column(Text, nullable=False, default="Safety compliance policy violation detected")
    severity = Column(String(20), nullable=False, default="medium")  # low, medium, high, critical
    status = Column(String(20), nullable=False, default="open")  # open, NEW, acknowledged, resolved
    snapshot_path = Column(Text, nullable=True)
    
    # Demo Performance Metadata
    inference_time_ms = Column(Float, nullable=True, default=0.0)
    precision = Column(Float, nullable=True, default=1.0)
    recall = Column(Float, nullable=True, default=1.0)
    event_metadata = Column(JSON, nullable=True)

    triggered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    started_at = synonym("triggered_at")  # Backward compatibility alias

    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    detection = relationship("Detection", back_populates="alerts")
    zone = relationship("Zone", back_populates="alerts")
    camera = relationship("Camera", back_populates="alerts")
    notifications = relationship("Notification", back_populates="alert", cascade="all, delete-orphan")
    evidence_files = relationship("EvidenceFile", back_populates="alert", cascade="all, delete-orphan")


class EvidenceFile(Base):
    """
    Evidence file entity linking recorded snapshots/clips to safety alerts.
    """
    __tablename__ = "evidence_files"

    evidence_id = Column(String(36), primary_key=True, default=gen_uuid)
    id = synonym("evidence_id")

    alert_id = Column(String(36), ForeignKey("alerts.alert_id", ondelete="CASCADE"), nullable=True)
    safety_event_id = synonym("alert_id")

    evidence_type = Column(String(20), nullable=False, default="IMAGE")  # IMAGE, VIDEO
    object_path = Column(Text, nullable=False)
    is_annotated = Column(Boolean, nullable=False, default=True)
    captured_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    alert = relationship("Alert", back_populates="evidence_files")


class Notification(Base):
    """Notification dispatch record for external channels."""
    __tablename__ = "notifications"

    notification_id = Column(String(36), primary_key=True, default=gen_uuid)
    id = synonym("notification_id")

    alert_id = Column(String(36), ForeignKey("alerts.alert_id", ondelete="CASCADE"), nullable=False)
    channel = Column(String(20), nullable=False)  # telegram, email, dashboard, websocket
    sent_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    delivery_status = Column(String(10), nullable=False, default="sent")  # sent, failed

    alert = relationship("Alert", back_populates="notifications")


class DailyZoneSummary(Base):
    """Daily aggregated metrics for zone compliance and safety performance."""
    __tablename__ = "daily_zone_summary"

    summary_id = Column(String(36), primary_key=True, default=gen_uuid)
    id = synonym("summary_id")

    zone_id = Column(String(36), ForeignKey("zones.zone_id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    compliance_pct = Column(Numeric(5, 2), nullable=True)
    incident_count = Column(Integer, nullable=False, default=0)
    avg_detection_to_alert_latency_ms = Column(Integer, nullable=True)

    zone = relationship("Zone", back_populates="daily_summaries")


class Worker(Base):
    """Optional worker entity for shift assignments."""
    __tablename__ = "workers"

    worker_id = Column(String(36), primary_key=True, default=gen_uuid)
    id = synonym("worker_id")

    name = Column(String(100), nullable=False)
    assigned_zone = Column(String(36), ForeignKey("zones.zone_id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    zone = relationship("Zone", back_populates="workers")


class ModelRun(Base):
    """Model execution run log with performance diagnostics."""
    __tablename__ = "model_runs"

    run_id = Column(String(36), primary_key=True, default=gen_uuid)
    id = synonym("run_id")

    model_name = Column(String(50), nullable=False)
    model_version = Column(String(20), nullable=False)
    video_source = Column(Text, nullable=True)
    inference_time_ms = Column(Float, nullable=True, default=0.0)
    precision = Column(Float, nullable=True, default=1.0)
    recall = Column(Float, nullable=True, default=1.0)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)


class User(Base):
    """User entity for dashboard authentication and authorization."""
    __tablename__ = "users"

    user_id = Column(String(36), primary_key=True, default=gen_uuid)
    id = synonym("user_id")

    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False, default="supervisor")  # admin, supervisor, guard
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# Backward compatibility class aliases
PPERule = ComplianceRule
SafetyEvent = Alert
WorkerTrack = Detection
