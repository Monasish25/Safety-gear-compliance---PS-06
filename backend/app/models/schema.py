import uuid
import datetime
from sqlalchemy import Column, String, Boolean, Float, Integer, DateTime, ForeignKey, JSON, Text, Numeric, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class Zone(Base):
    __tablename__ = "zones"
    zone_id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(100), nullable=False)
    camera_source = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="ok")  # ok, warning, alert
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    detections = relationship("Detection", back_populates="zone", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="zone", cascade="all, delete-orphan")
    daily_summaries = relationship("DailyZoneSummary", back_populates="zone", cascade="all, delete-orphan")
    workers = relationship("Worker", back_populates="zone")

class Detection(Base):
    __tablename__ = "detections"
    detection_id = Column(String(36), primary_key=True, default=gen_uuid)
    zone_id = Column(String(36), ForeignKey("zones.zone_id", ondelete="CASCADE"), nullable=False)
    tracker_id = Column(String(50), nullable=True)
    event_type = Column(String(30), nullable=False)  # fire, smoke, no_helmet, no_vest, no_gloves, compliant
    confidence = Column(Numeric(4, 3), nullable=False)
    frame_timestamp = Column(DateTime(timezone=True), nullable=False)
    snapshot_path = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    zone = relationship("Zone", back_populates="detections")
    alerts = relationship("Alert", back_populates="detection", cascade="all, delete-orphan")

class Alert(Base):
    __tablename__ = "alerts"
    alert_id = Column(String(36), primary_key=True, default=gen_uuid)
    detection_id = Column(String(36), ForeignKey("detections.detection_id", ondelete="CASCADE"), nullable=False)
    zone_id = Column(String(36), ForeignKey("zones.zone_id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(30), nullable=False)
    severity = Column(String(10), nullable=False)  # critical, high, medium
    status = Column(String(20), nullable=False, default="open")  # open, acknowledged, resolved
    triggered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    detection = relationship("Detection", back_populates="alerts")
    zone = relationship("Zone", back_populates="alerts")
    notifications = relationship("Notification", back_populates="alert", cascade="all, delete-orphan")

class Notification(Base):
    __tablename__ = "notifications"
    notification_id = Column(String(36), primary_key=True, default=gen_uuid)
    alert_id = Column(String(36), ForeignKey("alerts.alert_id", ondelete="CASCADE"), nullable=False)
    channel = Column(String(20), nullable=False)  # telegram, email, dashboard
    sent_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    delivery_status = Column(String(10), nullable=False, default="sent")  # sent, failed

    alert = relationship("Alert", back_populates="notifications")

class DailyZoneSummary(Base):
    __tablename__ = "daily_zone_summary"
    summary_id = Column(String(36), primary_key=True, default=gen_uuid)
    zone_id = Column(String(36), ForeignKey("zones.zone_id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    compliance_pct = Column(Numeric(5, 2), nullable=True)
    incident_count = Column(Integer, nullable=False, default=0)
    avg_detection_to_alert_latency_ms = Column(Integer, nullable=True)

    zone = relationship("Zone", back_populates="daily_summaries")

class Worker(Base):
    __tablename__ = "workers"
    worker_id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(100), nullable=False)
    assigned_zone = Column(String(36), ForeignKey("zones.zone_id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    zone = relationship("Zone", back_populates="workers")

class ModelRun(Base):
    __tablename__ = "model_runs"
    run_id = Column(String(36), primary_key=True, default=gen_uuid)
    model_name = Column(String(50), nullable=False)
    model_version = Column(String(20), nullable=False)
    video_source = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
