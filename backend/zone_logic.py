"""
Zone Access & Transfer Decision Engine
Evaluates PPE compliance against default and alternative work zones.
"""

from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Zone, ZoneAssignment, Attendance, Worker

PPE_ITEMS = ["helmet", "vest", "shoes", "gloves", "goggles"]


def is_ppe_satisfied(zone: Zone, detected_ppe: Dict[str, str]) -> Tuple[bool, List[str], List[str]]:
    """
    Checks if detected PPE satisfies zone requirements.
    Returns: (is_satisfied, missing_items, not_visible_items)
    """
    missing = []
    not_visible = []

    req_map = {
        "helmet": zone.req_helmet,
        "vest": zone.req_vest,
        "shoes": zone.req_shoes,
        "gloves": zone.req_gloves,
        "goggles": zone.req_goggles,
    }

    for item, required in req_map.items():
        if required:
            state = detected_ppe.get(item, "NOT_VISIBLE")
            if state == "MISSING":
                missing.append(item)
            elif state == "NOT_VISIBLE":
                not_visible.append(item)

    is_satisfied = (len(missing) == 0 and len(not_visible) == 0)
    return is_satisfied, missing, not_visible


async def evaluate_zone_access(
    worker: Worker,
    detected_ppe: Dict[str, str],
    work_date: str,
    db: AsyncSession,
    require_approval: bool = True
) -> Dict[str, Any]:
    """
    Core decision pipeline:
    1. Check default zone compliance.
    2. If all worn -> ALLOWED
    3. If any missing -> Check alternatives (rank by department match & lowest occupancy).
       If alt found -> TRANSFERRED
       If no alt -> ACCESS_DENIED
    4. If not_visible and none missing -> NEEDS_MANUAL_CHECK
    """
    # Load default zone explicitly to avoid lazy-load in async SQLAlchemy
    res = await db.execute(select(Zone).where(Zone.id == worker.default_zone_id))
    default_zone = res.scalar_one()

    is_sat, missing, not_visible = is_ppe_satisfied(default_zone, detected_ppe)

    # 1. Full compliance with default zone
    if is_sat:
        return {
            "decision": "ALLOWED",
            "assigned_zone": default_zone,
            "reason": f"All required PPE verified for {default_zone.name}",
            "missing_items": [],
            "needs_review": False,
            "transfer_status": None,
        }

    # 2. Ambiguity check: Items not visible but none definitively missing
    if len(not_visible) > 0 and len(missing) == 0:
        return {
            "decision": "NEEDS_MANUAL_CHECK",
            "assigned_zone": default_zone,
            "reason": f"Items not clearly visible ({', '.join(not_visible)}) – Supervisor confirmation required",
            "missing_items": not_visible,
            "needs_review": True,
            "transfer_status": None,
        }

    # 3. PPE Missing: Look for alternative zones
    # Fetch all active zones
    zones_res = await db.execute(select(Zone).where(and_(Zone.is_active == True, Zone.id != default_zone.id)))
    all_zones = zones_res.scalars().all()

    # Query current occupancy per zone today
    occupancy_res = await db.execute(
        select(Attendance.assigned_zone_id, func.count(Attendance.id))
        .where(and_(Attendance.date == work_date, Attendance.shift_id == worker.shift_id))
        .group_by(Attendance.assigned_zone_id)
    )
    occupancy_map = dict(occupancy_res.all())

    viable_alternatives = []
    for z in all_zones:
        # Check capacity
        current_occ = occupancy_map.get(z.id, 0)
        if current_occ >= z.capacity_per_shift:
            continue

        # Check if worker's detected PPE satisfies this alternative zone
        sat, alt_missing, alt_nv = is_ppe_satisfied(z, detected_ppe)
        if sat:
            # Rank score: prioritize same department name matching, then lowest occupancy
            dept_match = 1 if z.name.lower() in worker.department.lower() or worker.department.lower() in z.name.lower() else 0
            viable_alternatives.append({
                "zone": z,
                "current_occ": current_occ,
                "dept_match": dept_match,
                "remaining_cap": z.capacity_per_shift - current_occ
            })

    if viable_alternatives:
        # Sort by: dept_match DESC, remaining_cap DESC
        viable_alternatives.sort(key=lambda x: (x["dept_match"], x["remaining_cap"]), reverse=True)
        chosen_alt = viable_alternatives[0]["zone"]
        transfer_status = "PENDING" if require_approval else "AUTO"

        missing_names = ", ".join(missing)
        reason_text = f"{missing_names.capitalize()} missing – Reassigned from {default_zone.name} to {chosen_alt.name}"

        return {
            "decision": "TRANSFERRED",
            "assigned_zone": chosen_alt,
            "from_zone": default_zone,
            "reason": reason_text,
            "missing_items": missing,
            "needs_review": False,
            "transfer_status": transfer_status,
        }

    # 4. No alternative zone fits PPE equipment worn
    missing_names = ", ".join(missing)
    return {
        "decision": "ACCESS_DENIED",
        "assigned_zone": default_zone,
        "reason": f"Required PPE missing ({missing_names}) and no alternative zone available. Collect required PPE and scan again.",
        "missing_items": missing,
        "needs_review": False,
        "transfer_status": None,
    }
