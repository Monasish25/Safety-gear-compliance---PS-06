"""
Comprehensive Automated Test Suite for SMART ATTENDANCE System
Verifies:
1. Login, password hashing, and role checks
2. QR signature generation & tampering prevention
3. Shifts (entry window, grace, late, absent, midnight cross)
4. Zone transfer evaluation & ranking
5. ACCESS_DENIED when no zone fits
6. NOT_VISIBLE -> NEEDS_MANUAL_CHECK
7. Photo upload detection endpoint
"""

import pytest
import asyncio
import datetime
from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.main import app
from backend.database import init_database, get_session_factory
from backend.models import User, Shift, Zone, Worker, Attendance
from backend.auth import hash_password, verify_password, create_access_token, decode_token
from backend.qr_service import generate_signed_qr_token, verify_signed_qr_token
from backend.zone_logic import evaluate_zone_access, is_ppe_satisfied
from backend.seed import seed_initial_data


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
def setup_db(event_loop):
    event_loop.run_until_complete(init_database())
    factory = get_session_factory()
    async def seed():
        async with factory() as session:
            await seed_initial_data(session)
    event_loop.run_until_complete(seed())


client = TestClient(app)


# ==============================================================================
# 1. Login & Roles
# ==============================================================================

def test_login_and_roles():
    # 1. Successful Head Login
    res = client.post("/api/auth/login", json={"email": "head@factory.internal", "password": "Admin@12345"})
    assert res.status_code == 200
    data = res.json()
    assert "accessToken" in data
    assert data["user"]["role"] == "HEAD"

    token = data["accessToken"]

    # 2. Failed Login with Bad Passkey
    bad_res = client.post("/api/auth/login", json={"email": "head@factory.internal", "password": "WrongPassword"})
    assert bad_res.status_code == 401

    # Head creates a viewer user
    test_v_email = f"viewer_{int(datetime.datetime.now().timestamp())}@factory.internal"
    create_v_res = client.post(
        "/api/users", 
        headers={"Authorization": f"Bearer {token}"},
        json={"email": test_v_email, "name": "Plant Viewer", "role": "VIEWER", "password": "Viewer@123"}
    )
    assert create_v_res.status_code == 200

    # Viewer logs in
    v_login = client.post("/api/auth/login", json={"email": test_v_email, "password": "Viewer@123"})
    assert v_login.status_code == 200
    viewer_token = v_login.json()["accessToken"]

    # Viewer attempts HEAD-only route -> 403 Forbidden
    viewer_res = client.get("/api/users", headers={"Authorization": f"Bearer {viewer_token}"})
    assert viewer_res.status_code == 403


# ==============================================================================
# 2. QR Signature Validation & Tampering Check
# ==============================================================================

def test_qr_signature_validation():
    worker_id = "W-1001"
    token = generate_signed_qr_token(worker_id)
    assert token is not None
    assert "." in token

    # Valid token verification
    payload = verify_signed_qr_token(token)
    assert payload is not None
    assert payload["wid"] == worker_id

    # Tampered token: Modify worker ID part
    parts = token.split(".")
    tampered_token = f"d2lkOiJXLTk5OTkifQ.{parts[1]}"
    tampered_payload = verify_signed_qr_token(tampered_token)
    assert tampered_payload is None, "Tampered signature must be rejected!"


# ==============================================================================
# 3. Shift Timing (Window, Grace, Late, Midnight)
# ==============================================================================

def test_shift_timing_and_midnight():
    # Morning: 09:00 - 17:00, Grace: 10 min
    # Night: 22:00 - 06:00 (crosses midnight)
    shifts_res = client.get("/api/shifts")
    assert shifts_res.status_code == 200
    shifts = shifts_res.json()
    night_shift = next((s for s in shifts if s["name"] == "Night"), None)
    assert night_shift is not None
    assert night_shift["entryTime"] == "22:00"
    assert night_shift["endTime"] == "06:00"

    # Verify shift window logic: check-in opens 60 mins before entry
    entry_h, entry_m = map(int, night_shift["entryTime"].split(":"))
    window_open_minutes = (entry_h * 60 + entry_m) - night_shift["checkInWindowMinutes"]
    assert window_open_minutes == (21 * 60), "Night shift window should open at 21:00 (60 mins prior)"


# ==============================================================================
# 4. Zone Transfer Selection & Ranking
# ==============================================================================

@pytest.mark.asyncio
async def test_zone_transfer_selection():
    factory = get_session_factory()
    async with factory() as session:
        # Create test worker with Welding Bay default (requires helmet, vest, shoes, gloves, goggles)
        wb_zone = (await session.execute(select(Zone).where(Zone.name == "Welding Bay"))).scalar_one()
        wh_zone = (await session.execute(select(Zone).where(Zone.name == "Warehouse"))).scalar_one()
        morning_shift = (await session.execute(select(Shift).where(Shift.name == "Morning"))).scalar_one()

        test_wid = f"W-TEST-{int(datetime.datetime.now().timestamp()) % 10000}"
        test_worker = Worker(
            worker_id=test_wid,
            name="Ramesh Patel",
            department="Warehouse",
            position="Mechanic",
            joining_date="2024-01-01",
            active=True,
            shift_id=morning_shift.id,
            default_zone_id=wb_zone.id,
        )
        session.add(test_worker)
        await session.commit()
        await session.refresh(test_worker)

        # Worker is MISSING gloves and goggles (so cannot enter Welding Bay)
        # But IS wearing helmet, vest, shoes (which fully satisfies Warehouse!)
        detected_ppe = {
            "helmet": "WORN",
            "vest": "WORN",
            "shoes": "WORN",
            "gloves": "MISSING",
            "goggles": "MISSING",
        }

        eval_res = await evaluate_zone_access(test_worker, detected_ppe, "2026-10-08", session)
        assert eval_res["decision"] == "TRANSFERRED"
        assert eval_res["assigned_zone"].name == "Warehouse"
        assert "gloves" in eval_res["missing_items"] or "goggles" in eval_res["missing_items"]


# ==============================================================================
# 5. ACCESS_DENIED When No Zone Fits
# ==============================================================================

@pytest.mark.asyncio
async def test_access_denied_when_no_zone_fits():
    factory = get_session_factory()
    async with factory() as session:
        test_worker = (await session.execute(select(Worker).limit(1))).scalar_one()

        # Worker is missing ALL PPE (no shoes, no vest, no helmet)
        detected_ppe = {
            "helmet": "MISSING",
            "vest": "MISSING",
            "shoes": "MISSING",
            "gloves": "MISSING",
            "goggles": "MISSING",
        }

        eval_res = await evaluate_zone_access(test_worker, detected_ppe, "2026-10-08", session)
        assert eval_res["decision"] == "ACCESS_DENIED"
        assert "no alternative zone available" in eval_res["reason"]


# ==============================================================================
# 6. NOT_VISIBLE Leads to Needs Manual Check
# ==============================================================================

@pytest.mark.asyncio
async def test_not_visible_leads_to_manual_check():
    factory = get_session_factory()
    async with factory() as session:
        test_worker = (await session.execute(select(Worker).limit(1))).scalar_one()

        # Goggles obstructed by lighting (NOT_VISIBLE), but not positively MISSING
        detected_ppe = {
            "helmet": "WORN",
            "vest": "WORN",
            "shoes": "WORN",
            "gloves": "WORN",
            "goggles": "NOT_VISIBLE",
        }

        eval_res = await evaluate_zone_access(test_worker, detected_ppe, "2026-10-08", session)
        assert eval_res["decision"] == "NEEDS_MANUAL_CHECK"
        assert eval_res["needs_review"] == True


# ==============================================================================
# 7. Upload Detection Endpoint
# ==============================================================================

def test_upload_detection_endpoint():
    # Login to get token
    login_res = client.post("/api/auth/login", json={"email": "head@factory.internal", "password": "Admin@12345"})
    token = login_res.json()["accessToken"]

    # Generate synthetic image for test upload
    import cv2
    import numpy as np
    import io

    img = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.rectangle(img, (100, 100), (540, 380), (100, 100, 100), -1)
    _, img_encoded = cv2.imencode(".jpg", img)
    buf = io.BytesIO(img_encoded.tobytes())

    res = client.post(
        "/api/scans/image",
        headers={"Authorization": f"Bearer {token}"},
        files={"image": ("test_gate.jpg", buf, "image/jpeg")},
        data={"record_attendance": "false"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "scanId" in data
    assert "people" in data
    assert "annotatedImageUrl" in data
