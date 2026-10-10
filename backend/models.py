"""
SQLAlchemy 2.0 Domain Models for SMART ATTENDANCE System
"""

import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    String, Boolean, Integer, Float, DateTime, Date, ForeignKey, 
    UniqueConstraint, Text, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


# ==============================================================================
# Auth & User Models
# ==============================================================================

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="VIEWER")  # HEAD, SUPERVISOR, VIEWER
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    force_password_change: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )

    refresh_tokens: Mapped[List["RefreshToken"]] = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")


class LoginAudit(Base):
    __tablename__ = "login_audit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )


# ==============================================================================
# Shifts & Zones Models
# ==============================================================================

class Shift(Base):
    __tablename__ = "shifts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # Morning, Afternoon, Night
    entry_time: Mapped[str] = mapped_column(String(10), nullable=False)         # "09:00", "14:00", "22:00"
    end_time: Mapped[str] = mapped_column(String(10), nullable=False)           # "17:00", "22:00", "06:00"
    grace_period_minutes: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    check_in_window_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)

    workers: Mapped[List["Worker"]] = relationship("Worker", back_populates="shift")


class Zone(Base):
    __tablename__ = "zones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    req_helmet: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    req_vest: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    req_shoes: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    req_gloves: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    req_goggles: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    capacity_per_shift: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    workers: Mapped[List["Worker"]] = relationship("Worker", back_populates="default_zone")


# ==============================================================================
# Workers & Identification
# ==============================================================================

class Worker(Base):
    __tablename__ = "workers"

    worker_id: Mapped[str] = mapped_column(String(50), primary_key=True)  # e.g. W-1001
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    position: Mapped[str] = mapped_column(String(100), nullable=False)
    badge_type: Mapped[str] = mapped_column(String(20), default="QR", nullable=False)
    joining_date: Mapped[str] = mapped_column(String(20), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attendance_rate: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)

    shift_id: Mapped[int] = mapped_column(Integer, ForeignKey("shifts.id"), nullable=False)
    default_zone_id: Mapped[int] = mapped_column(Integer, ForeignKey("zones.id"), nullable=False)

    qr_token_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    qr_issued_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    qr_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    shift: Mapped["Shift"] = relationship("Shift", back_populates="workers")
    default_zone: Mapped["Zone"] = relationship("Zone", back_populates="workers")
    attendance_records: Mapped[List["Attendance"]] = relationship("Attendance", back_populates="worker", cascade="all, delete-orphan")


# ==============================================================================
# Attendance & Zone Assignments
# ==============================================================================

class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("worker_id", "date", name="uq_worker_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    worker_id: Mapped[str] = mapped_column(String(50), ForeignKey("workers.worker_id", ondelete="CASCADE"), nullable=False)
    date: Mapped[str] = mapped_column(String(20), index=True, nullable=False)  # YYYY-MM-DD
    shift_id: Mapped[int] = mapped_column(Integer, ForeignKey("shifts.id"), nullable=False)

    check_in: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    check_out: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    working_hours: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="not_scanned", nullable=False)  # present, late, absent, access_denied, not_scanned

    # PPE States
    helmet: Mapped[str] = mapped_column(String(20), default="NOT_VISIBLE", nullable=False)
    vest: Mapped[str] = mapped_column(String(20), default="NOT_VISIBLE", nullable=False)
    shoes: Mapped[str] = mapped_column(String(20), default="NOT_VISIBLE", nullable=False)
    gloves: Mapped[str] = mapped_column(String(20), default="NOT_VISIBLE", nullable=False)
    goggles: Mapped[str] = mapped_column(String(20), default="NOT_VISIBLE", nullable=False)

    # Zone Assignments
    default_zone_id: Mapped[int] = mapped_column(Integer, ForeignKey("zones.id"), nullable=False)
    assigned_zone_id: Mapped[int] = mapped_column(Integer, ForeignKey("zones.id"), nullable=False)
    decision: Mapped[str] = mapped_column(String(50), default="ALLOWED", nullable=False) # ALLOWED, TRANSFERRED, ACCESS_DENIED, NEEDS_MANUAL_CHECK
    transfer_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    manual_override: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )

    worker: Mapped["Worker"] = relationship("Worker", back_populates="attendance_records")
    shift: Mapped["Shift"] = relationship("Shift")
    default_zone: Mapped["Zone"] = relationship("Zone", foreign_keys=[default_zone_id])
    assigned_zone: Mapped["Zone"] = relationship("Zone", foreign_keys=[assigned_zone_id])


class ZoneAssignment(Base):
    __tablename__ = "zone_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    attendance_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("attendance.id", ondelete="SET NULL"), nullable=True)
    worker_id: Mapped[str] = mapped_column(String(50), ForeignKey("workers.worker_id", ondelete="CASCADE"), nullable=False)
    work_date: Mapped[str] = mapped_column(String(20), nullable=False)
    shift_id: Mapped[int] = mapped_column(Integer, ForeignKey("shifts.id"), nullable=False)
    from_zone_id: Mapped[int] = mapped_column(Integer, ForeignKey("zones.id"), nullable=False)
    to_zone_id: Mapped[int] = mapped_column(Integer, ForeignKey("zones.id"), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    missing_items: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="AUTO", nullable=False)  # AUTO, PENDING, APPROVED, REJECTED
    approved_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )

    from_zone: Mapped["Zone"] = relationship("Zone", foreign_keys=[from_zone_id])
    to_zone: Mapped["Zone"] = relationship("Zone", foreign_keys=[to_zone_id])


# ==============================================================================
# Scan Events & Audit
# ==============================================================================

class ScanEvent(Base):
    __tablename__ = "scan_events"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # SCN-XXXX
    timestamp: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False, index=True
    )
    time: Mapped[str] = mapped_column(String(20), nullable=False)
    gate: Mapped[str] = mapped_column(String(100), default="Main Turnstile – Camera 1", nullable=False)
    source: Mapped[str] = mapped_column(String(20), default="CAMERA", nullable=False)  # CAMERA, UPLOAD

    worker_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    worker_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    shift_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    default_zone_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    assigned_zone_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    helmet: Mapped[str] = mapped_column(String(20), default="NOT_VISIBLE", nullable=False)
    vest: Mapped[str] = mapped_column(String(20), default="NOT_VISIBLE", nullable=False)
    shoes: Mapped[str] = mapped_column(String(20), default="NOT_VISIBLE", nullable=False)
    gloves: Mapped[str] = mapped_column(String(20), default="NOT_VISIBLE", nullable=False)
    goggles: Mapped[str] = mapped_column(String(20), default="NOT_VISIBLE", nullable=False)

    result: Mapped[str] = mapped_column(String(50), nullable=False)  # ALLOWED, TRANSFERRED, ACCESS_DENIED, NEEDS_MANUAL_CHECK, ID_NOT_VISIBLE
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    annotated_image_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    detections: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    confidence: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    zone_decision: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    needs_review: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class DetectionFeedback(Base):
    __tablename__ = "detection_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scan_event_id: Mapped[str] = mapped_column(String(50), nullable=False)
    corrected_by: Mapped[str] = mapped_column(String(255), nullable=False)
    corrected_states: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    settings_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )
