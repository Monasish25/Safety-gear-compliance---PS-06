"""
app.core.database
-----------------
In-memory data store for SafeGear Compliance.
Uses SQLite (via SQLAlchemy) so tests stay self-contained with no external DB.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import (
    Column, String, Boolean, Float, Integer, DateTime,
    create_engine, text,
)
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# ---------------------------------------------------------------------------
# Engine – SQLite in-memory for tests; can be overridden via env var
# ---------------------------------------------------------------------------
import os

_DB_URL = os.getenv("DATABASE_URL", "sqlite:///./safegear.db")
engine = create_engine(
    _DB_URL,
    connect_args={"check_same_thread": False} if _DB_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# ORM Models
# ---------------------------------------------------------------------------

class Camera(Base):
    __tablename__ = "cameras"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    zone_id = Column(String, nullable=False)
    status = Column(String, default="active")


class Zone(Base):
    __tablename__ = "zones"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, default="")
    risk_level = Column(String, default="medium")


class PPERule(Base):
    __tablename__ = "ppe_rules"
    zone_id = Column(String, primary_key=True)
    helmet_required = Column(Boolean, default=True)
    vest_required = Column(Boolean, default=True)
    gloves_required = Column(Boolean, default=False)
    mask_required = Column(Boolean, default=False)
    harness_required = Column(Boolean, default=False)


class ViolationEvent(Base):
    __tablename__ = "violation_events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    zone_id = Column(String, nullable=False)
    camera_id = Column(String, nullable=False)
    violation_type = Column(String, nullable=False)
    severity = Column(String, default="warning")
    timestamp = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Boolean, default=False)


# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

_CAMERAS = [
    {"id": "CAM_01", "name": "Welding Bay Cam 1", "location": "North-East", "zone_id": "ZONE_WELDING", "status": "active"},
    {"id": "CAM_02", "name": "Assembly Line Cam", "location": "West Wing",  "zone_id": "ZONE_ASSEMBLY", "status": "active"},
    {"id": "CAM_03", "name": "Loading Dock Cam",  "location": "South Gate", "zone_id": "ZONE_LOADING",  "status": "active"},
]

_ZONES = [
    {"id": "ZONE_WELDING",  "name": "Welding Bay",    "description": "High-heat welding operations",  "risk_level": "high"},
    {"id": "ZONE_ASSEMBLY", "name": "Assembly Line",  "description": "Component assembly area",        "risk_level": "medium"},
    {"id": "ZONE_LOADING",  "name": "Loading Dock",   "description": "Forklift and cargo operations", "risk_level": "medium"},
]

_PPE_RULES = [
    {"zone_id": "ZONE_WELDING",  "helmet_required": True,  "vest_required": True,  "gloves_required": True,  "mask_required": True,  "harness_required": False},
    {"zone_id": "ZONE_ASSEMBLY", "helmet_required": True,  "vest_required": True,  "gloves_required": False, "mask_required": False, "harness_required": False},
    {"zone_id": "ZONE_LOADING",  "helmet_required": True,  "vest_required": True,  "gloves_required": False, "mask_required": False, "harness_required": False},
]


def _seed(db: Session) -> None:
    if db.query(Camera).count() == 0:
        db.bulk_insert_mappings(Camera, _CAMERAS)
    if db.query(Zone).count() == 0:
        db.bulk_insert_mappings(Zone, _ZONES)
    if db.query(PPERule).count() == 0:
        db.bulk_insert_mappings(PPERule, _PPE_RULES)
    # Seed some historical violation events for analytics
    if db.query(ViolationEvent).count() == 0:
        now = datetime.utcnow()
        events: list[dict[str, Any]] = []
        for i in range(20):
            events.append({
                "zone_id": _ZONES[i % len(_ZONES)]["id"],
                "camera_id": _CAMERAS[i % len(_CAMERAS)]["id"],
                "violation_type": "no-helmet" if i % 3 == 0 else ("no-vest" if i % 3 == 1 else "no-gloves"),
                "severity": "critical" if i % 5 == 0 else "warning",
                "timestamp": now - timedelta(minutes=i * 15),
                "resolved": i % 4 != 0,
            })
        db.bulk_insert_mappings(ViolationEvent, events)
    db.commit()


def init_db() -> None:
    """Create all tables and seed initial data."""
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        _seed(db)


def get_db():
    """FastAPI dependency – yields a SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
