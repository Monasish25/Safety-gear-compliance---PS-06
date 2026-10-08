"""
Phase 2 Comprehensive Verification Test Suite
Executes end-to-end HTTP API tests against FastAPI app using TestClient.
"""
import uuid
import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models import schema

client = TestClient(app)


def run_phase2_comprehensive_verification():
    print("=" * 70)
    print("      INDUSTRIAL SAFETY VISION AI - PHASE 2 COMPREHENSIVE VERIFICATION      ")
    print("=" * 70)

    # 1. System Health Check
    print("\n[1/6] GET /api/v1/health & /health ...")
    res1 = client.get("/api/v1/health")
    assert res1.status_code == 200, f"Health check failed: {res1.text}"
    assert res1.json()["status"] == "HEALTHY"
    print("  - Response:", res1.json())

    # 2. Camera CRUD
    print("\n[2/6] Camera Async CRUD Endpoints (/api/v1/cameras) ...")
    cam_id = f"CAM_TEST_{uuid.uuid4().hex[:6]}"
    create_cam_res = client.post(
        "/api/v1/cameras",
        json={
            "name": "Robotic Welding Bay Cam 1",
            "location_label": "Building C - Bay 3",
            "stream_url": "rtsp://192.168.1.150:554/live",
            "is_active": True
        }
    )
    assert create_cam_res.status_code == 201, f"Failed to create camera: {create_cam_res.text}"
    created_cam = create_cam_res.json()
    generated_cam_id = created_cam["camera_id"]
    print(f"  - POST /api/v1/cameras SUCCESS (ID: {generated_cam_id})")

    # GET camera
    get_cam_res = client.get(f"/api/v1/cameras/{generated_cam_id}")
    assert get_cam_res.status_code == 200
    assert get_cam_res.json()["name"] == "Robotic Welding Bay Cam 1"
    print(f"  - GET /api/v1/cameras/{generated_cam_id} SUCCESS")

    # PUT camera
    put_cam_res = client.put(
        f"/api/v1/cameras/{generated_cam_id}",
        json={
            "name": "Robotic Welding Bay Cam 1 (Primary)",
            "location_label": "Building C - Bay 3 - South Wall",
            "stream_url": "rtsp://192.168.1.150:554/high",
            "is_active": True
        }
    )
    assert put_cam_res.status_code == 200
    assert put_cam_res.json()["name"] == "Robotic Welding Bay Cam 1 (Primary)"
    print("  - PUT /api/v1/cameras/{id} SUCCESS")

    # GET all cameras
    all_cams = client.get("/api/v1/cameras?is_active=true")
    assert all_cams.status_code == 200
    assert len(all_cams.json()) >= 1
    print(f"  - GET /api/v1/cameras SUCCESS (Total active cameras: {len(all_cams.json())})")

    # 3. Zone & PPE Compliance Rules CRUD
    print("\n[3/6] Zone & PPE Rules CRUD Endpoints (/api/v1/ppe-rules) ...")
    test_zone_id = f"ZONE_TEST_{uuid.uuid4().hex[:6]}"
    rule_put_res = client.put(
        f"/api/v1/ppe-rules/{test_zone_id}",
        json={
            "helmet_required": True,
            "vest_required": True,
            "goggles_required": True,
            "gloves_required": True,
            "mask_required": False
        }
    )
    assert rule_put_res.status_code == 200, f"Failed to upsert rule: {rule_put_res.text}"
    rule_data = rule_put_res.json()
    assert rule_data["goggles_required"] is True
    print(f"  - PUT /api/v1/ppe-rules/{test_zone_id} SUCCESS (Goggles & Gloves required)")

    rule_get_res = client.get(f"/api/v1/ppe-rules/{test_zone_id}")
    assert rule_get_res.status_code == 200
    assert rule_get_res.json()["helmet_required"] is True
    print(f"  - GET /api/v1/ppe-rules/{test_zone_id} SUCCESS")

    # 4. Populate Test Alerts for Incident Page Verification
    print("\n[4/6] Seeding Test Incident Alerts into Database ...")
    db = SessionLocal()
    now = datetime.datetime.now(datetime.timezone.utc)
    alert1 = schema.Alert(
        alert_id=f"ALT_TEST_{uuid.uuid4().hex[:6]}",
        zone_id=test_zone_id,
        camera_id=generated_cam_id,
        tracker_id="WORKER_TRACK_099",
        event_type="MISSING_HELMET",
        violation_reason="Worker WORKER_TRACK_099 missing mandatory helmet for >= 2.5s",
        severity="high",
        status="open",
        snapshot_path="evidence/alerts/test_snapshot_01.jpg",
        inference_time_ms=16.2,
        precision=0.97,
        recall=0.99,
        triggered_at=now
    )
    alert2 = schema.Alert(
        alert_id=f"ALT_TEST_{uuid.uuid4().hex[:6]}",
        zone_id=test_zone_id,
        camera_id=generated_cam_id,
        tracker_id="WORKER_TRACK_102",
        event_type="MISSING_VEST",
        violation_reason="Worker WORKER_TRACK_102 missing mandatory vest in Welding Zone",
        severity="medium",
        status="open",
        snapshot_path="evidence/alerts/test_snapshot_02.jpg",
        inference_time_ms=14.8,
        precision=0.95,
        recall=0.98,
        triggered_at=now
    )
    db.add_all([alert1, alert2])
    db.commit()
    target_alert_id = alert1.alert_id
    db.close()
    print(f"  - Inserted 2 sample alerts (Target Alert ID: {target_alert_id})")

    # 5. Incident Alerts Filter, Search, Pagination & Status Updates
    print("\n[5/6] Incident Alerts Endpoint & Lifecycle Status Updates ...")
    
    # GET alerts (open/unresolved)
    alerts_get = client.get("/api/v1/events/alerts?status=unresolved&limit=5&page=1")
    assert alerts_get.status_code == 200, f"Get alerts failed: {alerts_get.text}"
    alerts_list = alerts_get.json()
    assert len(alerts_list) >= 2
    assert "X-Total-Count" in alerts_get.headers
    print(f"  - GET /api/v1/events/alerts?status=unresolved SUCCESS (Count: {len(alerts_list)}, Header X-Total-Count: {alerts_get.headers['X-Total-Count']})")

    # Search filter
    search_res = client.get("/api/v1/events/alerts?query=WORKER_TRACK_099")
    assert search_res.status_code == 200
    assert len(search_res.json()) >= 1
    assert search_res.json()[0]["tracker_id"] == "WORKER_TRACK_099"
    print("  - GET /api/v1/events/alerts?query=WORKER_TRACK_099 SUCCESS (Search filter matched)")

    # PATCH alert status to Acknowledged
    patch_ack = client.patch(
        f"/api/v1/events/alerts/{target_alert_id}/status",
        json={"status": "acknowledged", "note": "Supervisor inspecting zone"}
    )
    assert patch_ack.status_code == 200, f"PATCH acknowledged failed: {patch_ack.text}"
    assert patch_ack.json()["status"] == "acknowledged"
    assert patch_ack.json()["acknowledged_at"] is not None
    print("  - PATCH /api/v1/events/alerts/{id}/status (status=acknowledged) SUCCESS")

    # PATCH alert status to Resolved
    patch_res = client.patch(
        f"/api/v1/events/alerts/{target_alert_id}/status",
        json={"status": "resolved", "note": "Worker put helmet back on. Incident closed."}
    )
    assert patch_res.status_code == 200, f"PATCH resolved failed: {patch_res.text}"
    assert patch_res.json()["status"] == "resolved"
    assert patch_res.json()["resolved_at"] is not None
    print("  - PATCH /api/v1/events/alerts/{id}/status (status=resolved) SUCCESS")

    # 6. Cleanup & Delete Test Resources
    print("\n[6/6] Cleanup & Resource Deletion Test ...")
    del_rule = client.delete(f"/api/v1/ppe-rules/{test_zone_id}")
    assert del_rule.status_code == 204
    print(f"  - DELETE /api/v1/ppe-rules/{test_zone_id} SUCCESS")

    del_cam = client.delete(f"/api/v1/cameras/{generated_cam_id}")
    assert del_cam.status_code == 204
    print(f"  - DELETE /api/v1/cameras/{generated_cam_id} SUCCESS")

    print("\n" + "=" * 70)
    print("   RESULT: ALL PHASE 2 API CONTROLLER VERIFICATION CHECKS PASSED (100% OK)   ")
    print("=" * 70)


if __name__ == "__main__":
    run_phase2_comprehensive_verification()
