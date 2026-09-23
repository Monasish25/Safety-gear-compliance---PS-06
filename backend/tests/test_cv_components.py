import pytest
import numpy as np
from app.cv.zone_engine import ZoneEngine, point_in_polygon
from app.cv.association import PPEAssociationEngine, calculate_box_overlap
from app.cv.temporal_engine import TemporalConfirmationEngine

def test_point_in_polygon():
    polygon = [[0, 0], [10, 0], [10, 10], [0, 10]]
    assert point_in_polygon(5, 5, polygon) is True
    assert point_in_polygon(15, 15, polygon) is False

def test_zone_engine_mapping():
    zones = [
        {
            "id": "ZONE_ASSEMBLY",
            "name": "Assembly",
            "risk_level": "Medium",
            "polygon": {"points": [[0, 0], [500, 0], [500, 500], [0, 500]]}
        },
        {
            "id": "ZONE_WELDING",
            "name": "Welding",
            "risk_level": "High",
            "polygon": {"points": [[500, 0], [1000, 0], [1000, 500], [500, 500]]}
        }
    ]
    engine = ZoneEngine(zones)
    # Person bbox [100, 100, 200, 300] -> center (150, 200) -> inside Assembly
    z = engine.find_zone_for_bbox([100, 100, 200, 300])
    assert z is not None
    assert z["id"] == "ZONE_ASSEMBLY"

    # Person bbox [600, 100, 700, 300] -> center (650, 200) -> inside Welding
    z2 = engine.find_zone_for_bbox([600, 100, 700, 300])
    assert z2 is not None
    assert z2["id"] == "ZONE_WELDING"

def test_ppe_association_head_torso():
    assoc = PPEAssociationEngine()
    person_box = [100, 100, 200, 400]  # height = 300
    regions = assoc.get_person_regions(person_box)
    
    # Head should be top 30% -> [100, 100, 200, 190]
    assert regions["head"] == [100, 100, 200, 190]
    # Torso should start at 25% -> 175
    assert regions["torso"][1] == 175

    # Test with helmet detected overlapping head
    detected_ppe = [
        {"label": "helmet", "bbox": [110, 100, 190, 160], "confidence": 0.92}
    ]
    res = assoc.assess_person_ppe(person_box, detected_ppe)
    assert res["helmet_state"] == "PRESENT"
    assert res["vest_state"] == "MISSING"  # No vest provided

def test_temporal_confirmation_rules():
    temporal = TemporalConfirmationEngine(helmet_confirm_sec=2.0, cooldown_sec=10)
    zone = {"id": "ZONE_WELDING", "name": "Welding", "risk_level": "High"}
    rules = {"helmet_required": True, "vest_required": True}
    
    # Frame 1: at t=0s -> missing helmet, but NOT confirmed yet (duration < 2s)
    alerts = temporal.evaluate_worker_ppe(
        camera_id="CAM_01",
        zone=zone,
        track_id="CAM_01_W_001",
        ppe_state={"helmet_state": "MISSING", "vest_state": "PRESENT"},
        ppe_rules=rules,
        current_time=0.0
    )
    assert len(alerts) == 0

    # Frame 2: at t=1.0s -> still duration = 1.0s < 2.0s -> no alert
    alerts = temporal.evaluate_worker_ppe(
        camera_id="CAM_01",
        zone=zone,
        track_id="CAM_01_W_001",
        ppe_state={"helmet_state": "MISSING", "vest_state": "PRESENT"},
        ppe_rules=rules,
        current_time=1.0
    )
    assert len(alerts) == 0

    # Frame 3: at t=2.1s -> duration = 2.1s >= 2.0s -> confirmed alert!
    alerts = temporal.evaluate_worker_ppe(
        camera_id="CAM_01",
        zone=zone,
        track_id="CAM_01_W_001",
        ppe_state={"helmet_state": "MISSING", "vest_state": "PRESENT"},
        ppe_rules=rules,
        current_time=2.1
    )
    assert len(alerts) == 1
    assert alerts[0]["event_type"] == "MISSING_HELMET"
    assert alerts[0]["severity"] == "HIGH"

    # Frame 4: at t=3.0s -> within cooldown window (10s) -> NO duplicate alert!
    alerts = temporal.evaluate_worker_ppe(
        camera_id="CAM_01",
        zone=zone,
        track_id="CAM_01_W_001",
        ppe_state={"helmet_state": "MISSING", "vest_state": "PRESENT"},
        ppe_rules=rules,
        current_time=3.0
    )
    assert len(alerts) == 0
