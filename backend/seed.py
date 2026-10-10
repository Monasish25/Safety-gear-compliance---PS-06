"""
Production Database Seeder for SMART ATTENDANCE System
Seeds ONLY:
1. The first Head/Admin account (from HEAD_EMAIL & HEAD_PASSWORD in .env).
2. The 3 canonical factory shifts (Morning, Afternoon, Night).
3. The 5 default work zones and their PPE compliance rules.
4. Default system configuration.
Does NOT create fake workers or simulated attendance.
"""

import os
import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import User, Shift, Zone, SystemSettings
from backend.auth import hash_password

HEAD_EMAIL = os.environ.get("HEAD_EMAIL", "head@factory.internal")
HEAD_PASSWORD = os.environ.get("HEAD_PASSWORD", "Admin@12345")
HEAD_NAME = os.environ.get("HEAD_NAME", "Chief Plant Safety Officer")

DEFAULT_SHIFTS = [
    {
        "name": "Morning",
        "entry_time": "09:00",
        "end_time": "17:00",
        "grace_period_minutes": 10,
        "check_in_window_minutes": 60,
    },
    {
        "name": "Afternoon",
        "entry_time": "14:00",
        "end_time": "22:00",
        "grace_period_minutes": 10,
        "check_in_window_minutes": 60,
    },
    {
        "name": "Night",
        "entry_time": "22:00",
        "end_time": "06:00",
        "grace_period_minutes": 10,
        "check_in_window_minutes": 60,
    },
]

DEFAULT_ZONES = [
    {
        "name": "Welding Bay",
        "req_helmet": True,
        "req_vest": True,
        "req_shoes": True,
        "req_gloves": True,
        "req_goggles": True,
        "capacity_per_shift": 40,
        "is_active": True,
    },
    {
        "name": "Assembly Line",
        "req_helmet": True,
        "req_vest": True,
        "req_shoes": True,
        "req_gloves": True,
        "req_goggles": False,
        "capacity_per_shift": 80,
        "is_active": True,
    },
    {
        "name": "Warehouse",
        "req_helmet": True,
        "req_vest": True,
        "req_shoes": True,
        "req_gloves": False,
        "req_goggles": False,
        "capacity_per_shift": 50,
        "is_active": True,
    },
    {
        "name": "Packaging",
        "req_helmet": False,
        "req_vest": True,
        "req_shoes": True,
        "req_gloves": False,
        "req_goggles": False,
        "capacity_per_shift": 45,
        "is_active": True,
    },
    {
        "name": "Quality Lab",
        "req_helmet": False,
        "req_vest": False,
        "req_shoes": False,
        "req_gloves": True,
        "req_goggles": True,
        "capacity_per_shift": 25,
        "is_active": True,
    },
]

DEFAULT_SETTINGS_JSON = {
    "shifts": [
        {"name": "Morning", "startTime": "09:00", "endTime": "17:00"},
        {"name": "Afternoon", "startTime": "14:00", "endTime": "22:00"},
        {"name": "Night", "startTime": "22:00", "endTime": "06:00"},
    ],
    "rules": {
        "lateAfterMinutes": 10,
        "gracePeriodMinutes": 10,
        "minFullDayHours": 8,
        "allowManualOverride": True,
        "treatNotVisibleAsReview": True,
        "requireTransferApproval": True,
        "faceBlurring": True,
        "retentionDays": 30,
    },
    "requiredPPE": {
        "helmet": True,
        "vest": True,
        "shoes": True,
        "gloves": True,
        "goggles": True,
    },
    "camera": {
        "useRtsp": False,
        "rtspUrl": "rtsp://192.168.1.100:554/live/gate1",
        "fps": 5,
    },
    "notifications": {
        "lateArrivalAlerts": True,
        "absenceAlerts": True,
        "accessDeniedAlerts": True,
    },
    "general": {
        "companyName": "Bharat Precision Dynamics Ltd.",
        "gates": ["Main Turnstile – Camera 1", "North Entrance – Gate 2"],
        "timezone": "Asia/Kolkata",
    },
}


async def seed_initial_data(db: AsyncSession):
    """Executes initial seed on first boot."""
    # 1. Seed Head User
    head_query = await db.execute(select(User).where(User.email == HEAD_EMAIL))
    existing_head = head_query.scalar_one_or_none()
    if not existing_head:
        head_user = User(
            email=HEAD_EMAIL,
            name=HEAD_NAME,
            hashed_password=hash_password(HEAD_PASSWORD),
            role="HEAD",
            is_active=True,
            force_password_change=True, # Force change on first login
        )
        db.add(head_user)
        print(f"[SEED] Created initial HEAD user: {HEAD_EMAIL}")

    # 2. Seed Shifts
    for s in DEFAULT_SHIFTS:
        shift_q = await db.execute(select(Shift).where(Shift.name == s["name"]))
        if not shift_q.scalar_one_or_none():
            db.add(Shift(**s))
            print(f"[SEED] Created Shift: {s['name']} ({s['entry_time']} - {s['end_time']})")

    # 3. Seed Zones
    for z in DEFAULT_ZONES:
        zone_q = await db.execute(select(Zone).where(Zone.name == z["name"]))
        if not zone_q.scalar_one_or_none():
            db.add(Zone(**z))
            print(f"[SEED] Created Zone: {z['name']}")

    # 4. Seed Settings
    settings_q = await db.execute(select(SystemSettings).where(SystemSettings.id == 1))
    if not settings_q.scalar_one_or_none():
        db.add(SystemSettings(id=1, settings_json=DEFAULT_SETTINGS_JSON))
        print("[SEED] Created initial System Settings")

    await db.commit()
    print("[SEED-OK] Core system baseline seed complete.")
