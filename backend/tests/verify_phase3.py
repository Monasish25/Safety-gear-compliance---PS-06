"""
Phase 3 Core Computer Vision & Rule Engine Verification Script
"""
import time
import numpy as np
import cv2
from fastapi.testclient import TestClient

from app.main import app
from app.cv.pipeline import SafetyPipeline
from app.cv.association import PPEAssociationEngine

client = TestClient(app)


def run_phase3_verification():
    print("=" * 70)
    print("      INDUSTRIAL SAFETY VISION AI - PHASE 3 VERIFICATION      ")
    print("=" * 70)

    # 1. Test PPE Association Engine & Bounding Box IoU
    print("\n[1/4] Testing IoU Spatial Association & Head/Torso ROI Calculation ...")
    assoc_engine = PPEAssociationEngine(head_ratio=0.30, torso_start=0.25, torso_end=0.70)
    person_box = [100.0, 100.0, 300.0, 500.0]  # [x1, y1, x2, y2]
    regions = assoc_engine.get_person_regions(person_box)
    
    assert regions["head"] == [100.0, 100.0, 300.0, 220.0], f"Head box calculation error: {regions['head']}"
    assert regions["torso"] == [100.0, 200.0, 300.0, 380.0], f"Torso box calculation error: {regions['torso']}"
    print(f"  - Calculated Head ROI: {regions['head']}")
    print(f"  - Calculated Torso ROI: {regions['torso']}")

    # 2. Test Compliance Engine Logic Flow
    print("\n[2/4] Testing Compliance Engine Rule Evaluation & Reason Generation ...")
    pipeline = SafetyPipeline(camera_id="CAM_TEST_01")
    
    # Case A: Non-Compliant (Missing Helmet & Vest)
    is_comp_a, label_a, reason_a = pipeline.evaluate_compliance(
        tracker_id="CAM_01_W_007",
        ppe_state={"helmet_state": "MISSING", "vest_state": "MISSING"},
        compliance_rule={"helmet_required": True, "vest_required": True},
        zone_name="Assembly Zone"
    )
    assert is_comp_a is False
    assert label_a == "Non-Compliant"
    assert "Missing Hard Hat" in reason_a and "Missing High-Vis Vest" in reason_a
    print(f"  - Non-Compliant Reason Output:\n    {reason_a}")

    # Case B: Compliant (All PPE Present)
    is_comp_b, label_b, reason_b = pipeline.evaluate_compliance(
        tracker_id="CAM_01_W_007",
        ppe_state={"helmet_state": "PRESENT", "vest_state": "PRESENT"},
        compliance_rule={"helmet_required": True, "vest_required": True},
        zone_name="Assembly Zone"
    )
    assert is_comp_b is True
    assert label_b == "Compliant"
    print(f"  - Compliant Reason Output:\n    {reason_b}")

    # 3. Test Frame Processing Pipeline
    print("\n[3/4] Running Single Frame Pipeline (YOLO + ByteTrack + IoU + Temporal DB) ...")
    dummy_frame = np.zeros((720, 1280, 3), dtype=np.uint8)
    cv2.rectangle(dummy_frame, (200, 150), (320, 480), (200, 200, 200), -1)  # Draw human shape
    
    annotated_frame, confirmed_alerts = pipeline.process_frame(
        dummy_frame,
        timestamp=time.time(),
        persist_db=True
    )
    assert annotated_frame is not None
    assert annotated_frame.shape == (720, 1280, 3)
    print("  - Single Frame Processed Cleanly (Annotated Frame Shape: 720x1280x3)")

    # 4. Test Async Non-Blocking Video Process Endpoint
    print("\n[4/4] Testing Async Non-Blocking Video Pipeline Trigger (/api/v1/videos/demo_sim/process) ...")
    proc_res = client.post("/api/v1/videos/demo_sim_test123/process?camera_id=CAM_TEST_01")
    assert proc_res.status_code == 200, f"Process video failed: {proc_res.text}"
    proc_data = proc_res.json()
    assert proc_data["status"] == "QUEUED"
    print(f"  - Pipeline Offloaded to ThreadPool & Queued Asynchronously:\n   ", proc_data)

    print("\n" + "=" * 70)
    print("   RESULT: ALL PHASE 3 COMPUTER VISION & RULE ENGINE CHECKS PASSED (100% OK)   ")
    print("=" * 70)


if __name__ == "__main__":
    run_phase3_verification()
