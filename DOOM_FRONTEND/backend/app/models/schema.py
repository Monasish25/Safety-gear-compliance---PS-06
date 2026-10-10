import uuid
import datetime
from sqlalchemy import Column, String, Boolean, Float, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False, default="Safety Supervisor")
    email = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    actions = relationship("AlertAction", back_populates="user")
    events_acknowledged = relationship("SafetyEvent", back_populates="acknowledger")

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String(50), primary_key=True)  # e.g., CAM_01
    name = Column(String(100), nullable=False)
    location_label = Column(String(150), nullable=False)
    stream_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    zones = relationship("Zone", back_populates="camera", cascade="all, delete-orphan")
    events = relationship("SafetyEvent", back_populates="camera")
    tracks = relationship("WorkerTrack", back_populates="camera")
    health_logs = relationship("CameraHealthLog", back_populates="camera")

class Zone(Base):
    __tablename__ = "zones"

    id = Column(String(50), primary_key=True)  # e.g., ZONE_WELDING
    camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=False)
    name = Column(String(100), nullable=False)
    risk_level = Column(String(20), nullable=False, default="Medium")  # Low, Medium, High, Critical
    polygon = Column(JSON, nullable=False)  # JSON points / rect
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    camera = relationship("Camera", back_populates="zones")
    ppe_rule = relationship("PPERule", back_populates="zone", uselist=False, cascade="all, delete-orphan")
    events = relationship("SafetyEvent", back_populates="zone")

class PPERule(Base):
    __tablename__ = "ppe_rules"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    zone_id = Column(String(50), ForeignKey("zones.id"), unique=True, nullable=False)
    helmet_required = Column(Boolean, default=True)
    vest_required = Column(Boolean, default=True)
    gloves_required = Column(Boolean, default=False)
    mask_required = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc))

    zone = relationship("Zone", back_populates="ppe_rule")

class WorkerTrack(Base):
    __tablename__ = "worker_tracks"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=False)
    tracker_id = Column(String(50), nullable=False)  # Anonymous ID, e.g., CAM_01_W_017
    first_seen_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    last_seen_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    status = Column(String(30), default="ACTIVE")

    camera = relationship("Camera", back_populates="tracks")
    events = relationship("SafetyEvent", back_populates="worker_track")

class SafetyEvent(Base):
    __tablename__ = "safety_events"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=False)
    zone_id = Column(String(50), ForeignKey("zones.id"), nullable=True)
    worker_track_id = Column(String(36), ForeignKey("worker_tracks.id"), nullable=True)
    event_type = Column(String(50), nullable=False)  # MISSING_HELMET, MISSING_VEST, SMOKE_DETECTED, FIRE_DETECTED
    severity = Column(String(20), nullable=False)    # LOW, MEDIUM, HIGH, CRITICAL
    confidence = Column(Float, nullable=False, default=0.0)
    status = Column(String(30), nullable=False, default="NEW")  # NEW, ACKNOWLEDGED, RESOLVED
    started_at = Column(DateTime, nullable=False, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    ended_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    event_metadata = Column(JSON, nullable=True)

    camera = relationship("Camera", back_populates="events")
    zone = relationship("Zone", back_populates="events")
    worker_track = relationship("WorkerTrack", back_populates="events")
    acknowledger = relationship("User", back_populates="events_acknowledged")
    evidence_files = relationship("EvidenceFile", back_populates="safety_event", cascade="all, delete-orphan")
    actions = relationship("AlertAction", back_populates="safety_event", cascade="all, delete-orphan")

class EvidenceFile(Base):
    __tablename__ = "evidence_files"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    safety_event_id = Column(String(36), ForeignKey("safety_events.id"), nullable=False)
    evidence_type = Column(String(30), default="IMAGE")  # IMAGE, CLIP
    object_path = Column(String(255), nullable=False)
    captured_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    is_annotated = Column(Boolean, default=True)

    safety_event = relationship("SafetyEvent", back_populates="evidence_files")

class AlertAction(Base):
    __tablename__ = "alert_actions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    safety_event_id = Column(String(36), ForeignKey("safety_events.id"), nullable=False)
    action = Column(String(30), nullable=False)  # ACKNOWLEDGE, RESOLVE, NOTE
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    note = Column(Text, nullable=True)

    safety_event = relationship("SafetyEvent", back_populates="actions")
    user = relationship("User", back_populates="actions")

class CameraHealthLog(Base):
    __tablename__ = "camera_health_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=False)
    status = Column(String(30), nullable=False)  # HEALTHY, DEGRADED, OFFLINE
    checked_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    detail = Column(String(255), nullable=True)

    camera = relationship("Camera", back_populates="health_logs")

class ProcessedVideo(Base):
    __tablename__ = "processed_videos"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(255), nullable=False)
    status = Column(String(30), default="QUEUED")  # QUEUED, PROCESSING, COMPLETED, FAILED
    total_frames = Column(Integer, default=0)
    processed_frames = Column(Integer, default=0)
    violation_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    finished_at = Column(DateTime, nullable=True)
