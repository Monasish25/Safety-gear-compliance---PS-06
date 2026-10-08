"""
Verification Suite for Phase 4: Persistent-Violation Logic & Temporal Confirmation Engine.
"""
import time
from app.cv.temporal_engine import TemporalConfirmationEngine
from app.core.cache import cache


def verify_phase4():
    print("======================================================================")
    print("        PHASE 4 VERIFICATION: TEMPORAL CONFIRMATION ENGINE & COOLDOWN ")
    print("======================================================================")

    # Initialize Temporal Engine with N=5 frames threshold and 300s cooldown
    engine = TemporalConfirmationEngine(
        consecutive_frames_required=5,
        cooldown_sec=300
    )

    cam_id = "CAM_TEST_01"
    zone = {"id": "ZONE_TEST_01", "name": "Test Bay", "risk_level": "High"}
    track_id = "WORKER_TEST_101"
    ppe_rules = {"helmet_required": True, "vest_required": True}
    base_time = time.time()

    # 1. Transient frames (1 to 4 frames missing helmet) -> 0 Alerts
    print("\n[TEST 1] Transient Violation Filtering (Frames 1..4 out of 5 required)...")
    for i in range(1, 5):
        alerts = engine.evaluate_frame_compliance(
            camera_id=cam_id,
            zone=zone,
            track_id=track_id,
            ppe_state={"helmet_state": "MISSING", "vest_state": "PRESENT"},
            ppe_rules=ppe_rules,
            current_time=base_time + i
        )
        assert len(alerts) == 0, f"Transient frame {i} triggered alert prematurely!"
        print(f"  - Frame {i}: 0 Alerts (Transient error filtered)")

    # 2. 5th consecutive frame missing helmet -> 1 Confirmed Alert
    print("\n[TEST 2] 5th Consecutive Frame Violation Trigger...")
    alerts = engine.evaluate_frame_compliance(
        camera_id=cam_id,
        zone=zone,
        track_id=track_id,
        ppe_state={"helmet_state": "MISSING", "vest_state": "PRESENT"},
        ppe_rules=ppe_rules,
        current_time=base_time + 5
    )
    assert len(alerts) == 1, f"Expected 1 alert on frame 5, got {len(alerts)}"
    alert = alerts[0]
    assert alert["event_type"] == "MISSING_HELMET"
    assert alert["worker_track_id"] == track_id
    assert alert["consecutive_frames"] == 5
    print(f"  - Frame 5: CONFIRMED ALERT GENERATED ({alert['event_type']} for {track_id})")

    # 3. 6th consecutive frame -> Cooldown active -> 0 Duplicate Alerts
    print("\n[TEST 3] Cooldown Window Suppression (Frames 6..10 within 5-min cooldown)...")
    for i in range(6, 11):
        alerts = engine.evaluate_frame_compliance(
            camera_id=cam_id,
            zone=zone,
            track_id=track_id,
            ppe_state={"helmet_state": "MISSING", "vest_state": "PRESENT"},
            ppe_rules=ppe_rules,
            current_time=base_time + i
        )
        assert len(alerts) == 0, f"Frame {i} generated duplicate alert during cooldown!"
    print("  - Frames 6..10: 0 Duplicate Alerts (Cooldown active - Alert fatigue prevented)")

    # 4. Reset counter when worker becomes compliant
    print("\n[TEST 4] Compliance Recovery Counter Reset...")
    # Frame 11: Worker puts on helmet (Compliant)
    alerts = engine.evaluate_frame_compliance(
        camera_id=cam_id,
        zone=zone,
        track_id=track_id,
        ppe_state={"helmet_state": "PRESENT", "vest_state": "PRESENT"},
        ppe_rules=ppe_rules,
        current_time=base_time + 11
    )
    assert len(alerts) == 0
    # Check that consecutive count was reset to 0
    counters = engine.track_counters[track_id]
    assert counters["helmet"]["consecutive_count"] == 0
    print("  - Frame 11 (Worker Compliant): Consecutive non-compliant frame counter reset to 0")

    print("\n======================================================================")
    print("   PHASE 4 VERIFICATION COMPLETE: ALL TEMPORAL & COOLDOWN TESTS PASSED   ")
    print("======================================================================")


if __name__ == "__main__":
    verify_phase4()
