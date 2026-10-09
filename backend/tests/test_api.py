import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_db():
    init_db()

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"

def test_get_cameras():
    res = client.get("/api/v1/cameras")
    assert res.status_code == 200
    cams = res.json()
    assert len(cams) >= 1
    assert "camera_id" in cams[0]

def test_get_zones():
    res = client.get("/api/v1/zones")
    assert res.status_code == 200
    zones = res.json()
    assert len(zones) >= 1
    assert "zone_id" in zones[0]

def test_get_and_update_ppe_rules():
    res = client.get("/api/v1/ppe-rules")
    assert res.status_code == 200
    rules = res.json()
    assert len(rules) >= 1

    zone_id = rules[0]["zone_id"]
    # Update welding rule
    update_res = client.put(
        f"/api/v1/ppe-rules/{zone_id}",
        json={"gloves_required": True, "mask_required": True}
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["mask_required"] is True

def test_analytics_summary():
    res = client.get("/api/v1/analytics/summary")
    assert res.status_code == 200
    data = res.json()
    assert "compliance_rate" in data
    assert "by_zone" in data
    assert "false_alert_rate" in data

def test_copilot_chat():
    res = client.post("/api/v1/copilot/chat", json={"prompt": "Give me a shift safety briefing summary"})
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert len(data["suggested_actions"]) > 0
