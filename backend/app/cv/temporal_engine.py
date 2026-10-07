"""
app.cv.temporal_engine
----------------------
Temporal confirmation engine: suppresses transient false-positive PPE
violations by requiring a violation to persist for N seconds before
generating an alert. Also enforces a per-worker cooldown to prevent
duplicate alerts.

PPE state keys expected in ``ppe_state``:
    helmet_state, vest_state, gloves_state, mask_state, harness_state
    Values: "PRESENT" | "MISSING"

PPE rule keys expected in ``ppe_rules``:
    helmet_required, vest_required, gloves_required,
    mask_required, harness_required
    Values: bool
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


# ---------------------------------------------------------------------------
# Internal state per (track_id, ppe_item)
# ---------------------------------------------------------------------------

@dataclass
class _ViolationTrack:
    first_seen: float           # monotonic time when violation first observed
    last_alerted: float = -1e9  # monotonic time of last issued alert (-inf initially)


# ---------------------------------------------------------------------------
# TemporalConfirmationEngine
# ---------------------------------------------------------------------------

# Mapping from PPE rule key → (state_key, event_type, severity)
_PPE_ITEMS: list[tuple[str, str, str, str]] = [
    ("helmet_required",  "helmet_state",  "MISSING_HELMET",  "HIGH"),
    ("vest_required",    "vest_state",    "MISSING_VEST",    "HIGH"),
    ("gloves_required",  "gloves_state",  "MISSING_GLOVES",  "MEDIUM"),
    ("mask_required",    "mask_state",    "MISSING_MASK",    "MEDIUM"),
    ("harness_required", "harness_state", "MISSING_HARNESS", "HIGH"),
]


class TemporalConfirmationEngine:
    """
    Evaluate worker PPE state over time and emit confirmed alerts.

    Parameters
    ----------
    helmet_confirm_sec : float
        Seconds a violation must persist before an alert fires (default 2.0).
    cooldown_sec : float
        Minimum seconds between repeated alerts for the same worker/item (default 30).
    """

    def __init__(
        self,
        helmet_confirm_sec: float = 2.0,
        cooldown_sec: float = 30.0,
    ) -> None:
        self._confirm_sec = helmet_confirm_sec
        self._cooldown_sec = cooldown_sec
        # key: (track_id, event_type) → _ViolationTrack
        self._tracks: dict[tuple[str, str], _ViolationTrack] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def evaluate_worker_ppe(
        self,
        camera_id: str,
        zone: dict[str, Any],
        track_id: str,
        ppe_state: dict[str, str],
        ppe_rules: dict[str, bool],
        current_time: float,
    ) -> list[dict[str, Any]]:
        """
        Evaluate a single worker's PPE state at *current_time* and return
        any newly confirmed alerts (empty list if none).

        Parameters
        ----------
        camera_id    : camera identifier string
        zone         : zone dict (must have ``id``, ``name``, ``risk_level``)
        track_id     : unique worker track identifier
        ppe_state    : PPE detection results (keys: ``*_state``, values: PRESENT/MISSING)
        ppe_rules    : active PPE requirements for the zone
        current_time : monotonic timestamp in seconds (float)

        Returns
        -------
        list of alert dicts, each with:
            event_type, severity, camera_id, zone_id, track_id, timestamp
        """
        alerts: list[dict[str, Any]] = []

        for rule_key, state_key, event_type, severity in _PPE_ITEMS:
            if not ppe_rules.get(rule_key, False):
                # This PPE item is not required in this zone
                continue

            key = (track_id, event_type)
            state = ppe_state.get(state_key, "MISSING")

            if state != "MISSING":
                # Violation cleared – remove tracking entry
                self._tracks.pop(key, None)
                continue

            # Violation is active
            if key not in self._tracks:
                self._tracks[key] = _ViolationTrack(first_seen=current_time)

            track = self._tracks[key]
            duration = current_time - track.first_seen
            time_since_alert = current_time - track.last_alerted

            if duration >= self._confirm_sec and time_since_alert >= self._cooldown_sec:
                # Confirmed – emit alert
                track.last_alerted = current_time
                alerts.append({
                    "event_type": event_type,
                    "severity":   severity,
                    "camera_id":  camera_id,
                    "zone_id":    zone.get("id", ""),
                    "zone_name":  zone.get("name", ""),
                    "track_id":   track_id,
                    "timestamp":  current_time,
                    "duration_sec": round(duration, 3),
                })

        return alerts

    def reset(self) -> None:
        """Clear all internal tracking state."""
        self._tracks.clear()
