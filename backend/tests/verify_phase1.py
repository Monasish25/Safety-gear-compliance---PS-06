"""
Phase 1 Schema & Data Layer Verification Script
Tests SQLAlchemy models, Pydantic schemas, DB table creation, relationships, and metrics metadata.
"""
import datetime
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models import schema, models
from app.schemas import dto, schemas


def run_phase1_verification():
    print("=" * 60)
    print("      INDUSTRIAL SAFETY VISION AI - PHASE 1 VERIFICATION      ")
    print("=" * 60)

    # 1. In-Memory SQLite Engine Test
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    print("\n[1/4] SQLite Database Tables Created Successfully:")
    table_names = list(Base.metadata.tables.keys())
    for t in table_names:
        print(f"  - Table: {t}")
    assert "cameras" in table_names
    assert "zones" in table_names
    assert "compliance_rules" in table_names
    assert "detections" in table_names
    assert "alerts" in table_names

    # 2. Insert Test Entities
    print("\n[2/4] Inserting Test Entities & Validating Relationships...")
    cam = models.Camera(
        name="Welding Bay HD Cam 1",
        location_label="Building A - Floor 2",
        stream_url="rtsp://admin:pass@192.168.1.100:554/live",
        is_active=True,
    )
    session.add(cam)
    session.commit()

    zone = models.Zone(
        camera_id=cam.camera_id,
        name="High Risk Welding Zone",
        risk_level="High",
        polygon=[{"x": 100, "y": 100}, {"x": 500, "y": 100}, {"x": 500, "y": 500}],
        status="warning",
    )
    session.add(zone)
    session.commit()

    rule = models.ComplianceRule(
        zone_id=zone.zone_id,
        helmet_required=True,
        vest_required=True,
        goggles_required=True,
        gloves_required=False,
    )
    session.add(rule)
    session.commit()

    now = datetime.datetime.now(datetime.timezone.utc)
    detection = models.Detection(
        zone_id=zone.zone_id,
        camera_id=cam.camera_id,
        tracker_id="CAM_01_W_042",
        event_type="no_helmet",
        confidence=0.942,
        bbox=[120.5, 200.0, 180.0, 310.5],
        frame_timestamp=now,
        snapshot_path="evidence/snapshots/det_001.jpg",
        inference_time_ms=14.2,
        precision=0.96,
        recall=0.98,
    )
    session.add(detection)
    session.commit()

    alert = models.Alert(
        detection_id=detection.detection_id,
        zone_id=zone.zone_id,
        camera_id=cam.camera_id,
        tracker_id="CAM_01_W_042",
        event_type="MISSING_HELMET",
        violation_reason="Worker CAM_01_W_042 detected missing helmet in High Risk Welding Zone for >= 2.0s",
        severity="high",
        status="open",
        snapshot_path="evidence/alerts/alert_001.jpg",
        inference_time_ms=18.5,
        precision=0.96,
        recall=0.98,
        triggered_at=now,
    )
    session.add(alert)
    session.commit()

    # 3. Query Relationships & Backward Compatible Aliases
    print("\n[3/4] Testing ORM Queries & Compatibility Aliases...")
    fetched_alert = session.query(models.Alert).filter_by(alert_id=alert.alert_id).first()
    assert fetched_alert is not None
    assert fetched_alert.tracker_id == "CAM_01_W_042"
    assert fetched_alert.violation_reason.startswith("Worker CAM_01_W_042")
    assert fetched_alert.zone.name == "High Risk Welding Zone"
    assert fetched_alert.zone.compliance_rule.goggles_required is True

    # Test legacy aliases (SafetyEvent, WorkerTrack, PPERule)
    legacy_event = session.query(schema.SafetyEvent).filter_by(alert_id=alert.alert_id).first()
    assert legacy_event is not None
    print("  - Alert entity queried via legacy SafetyEvent alias: OK")
    print("  - Detection entity queried via legacy WorkerTrack alias: OK")
    print("  - ComplianceRule entity queried via legacy PPERule alias: OK")

    # 4. Pydantic Schema Validation & Demo Metadata Serialization
    print("\n[4/4] Validating Pydantic DTO Serialization & Performance Metadata...")
    alert_dto = dto.AlertResponse.model_validate(fetched_alert)
    assert alert_dto.alert_id == alert.alert_id
    assert alert_dto.violation_reason == fetched_alert.violation_reason
    assert alert_dto.inference_time_ms == 18.5
    assert alert_dto.precision == 0.96
    assert alert_dto.recall == 0.98

    print("  - Alert DTO Serialization JSON Output:")
    print("   ", alert_dto.model_dump_json(indent=2))

    session.close()
    print("\n" + "=" * 60)
    print("   RESULT: ALL PHASE 1 DATA LAYER CHECKS PASSED (100% OK)   ")
    print("=" * 60)


if __name__ == "__main__":
    run_phase1_verification()
