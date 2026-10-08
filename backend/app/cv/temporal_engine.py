import time
import logging
from typing import Dict, List, Optional, Tuple, Any
from app.core.config import settings
from app.core.cache import cache

logger = logging.getLogger("safegear.temporal_engine")


class TemporalConfirmationEngine:
    """
    Temporal Confirmation & Cooldown Engine.
    Filters out transient computer vision errors (occlusions, bad angles, lighting glitches).
    Requires N consecutive non-compliant frames before confirming an official alert,
    and enforces a cooldown window (e.g. 5 minutes / 300s) to prevent duplicate alert fatigue.
    """

    def __init__(
        self,
        consecutive_frames_required: int = 5,  # N=5 consecutive frames (~1 sec at 5 FPS)
        cooldown_sec: int = 300,                # 5-minute (300s) alert cooldown
        helmet_confirm_sec: float = settings.CONFIRMATION_TIME_HELMET_SEC,
        vest_confirm_sec: float = settings.CONFIRMATION_TIME_VEST_SEC,
    ):
        self.consecutive_frames_required = consecutive_frames_required
        self.cooldown_sec = cooldown_sec
        self.helmet_confirm_sec = helmet_confirm_sec
        self.vest_confirm_sec = vest_confirm_sec

        # In-memory tracking of consecutive non-compliant frame counts and timing per track ID
        # Structure: {track_id: {"helmet": {"consecutive_count": int, "missing_since": float}, ...}}
        self.track_counters: Dict[str, Dict[str, Any]] = {}

    def _get_fingerprint(self, camera_id: str, zone_id: str, track_id: str, event_type: str) -> str:
        """Generates a unique fingerprint for alert deduplication and cooldown tracking."""
        return f"{camera_id}:{zone_id}:{track_id}:{event_type}"

    def compute_severity(self, event_type: str, zone_risk: str) -> str:
        """Computes alert severity based on event type and zone risk level."""
        event_upper = event_type.upper()
        risk_upper = zone_risk.upper()

        if "FIRE" in event_upper:
            return "critical"
        if "SMOKE" in event_upper:
            return "critical" if risk_upper in ["CRITICAL", "HIGH"] else "high"

        # Missing Helmet or Vest
        if risk_upper == "CRITICAL":
            return "critical"
        elif risk_upper == "HIGH":
            return "high"
        elif risk_upper == "MEDIUM":
            return "medium"
        else:
            return "low"

    def evaluate_frame_compliance(
        self,
        camera_id: str,
        zone: Optional[Dict],
        track_id: str,
        ppe_state: Dict,
        ppe_rules: Optional[Dict],
        current_time: Optional[float] = None
    ) -> List[Dict]:
        """
        Evaluates frame-level worker PPE compliance state against consecutive frame persistence rule.
        
        Args:
            camera_id (str): Associated camera identifier.
            zone (Dict): Zone details dict containing 'id', 'name', 'risk_level'.
            track_id (str): Anonymous worker tracker ID (e.g. "CAM_01_W_017").
            ppe_state (Dict): Dict containing 'helmet_state', 'vest_state', 'goggles_state'.
            ppe_rules (Dict): Dict defining required PPE for the zone.
            current_time (float): Optional timestamp float.

        Returns:
            List[Dict]: List of confirmed alert objects (if consecutive frame threshold N is met & not in cooldown).
        """
        if current_time is None:
            current_time = time.time()

        if not zone:
            # Person not in a registered zone; reset temporal counters
            self.track_counters.pop(track_id, None)
            return []

        zone_id = zone.get("id", "ZONE_GENERAL")
        zone_risk = zone.get("risk_level", "Medium")

        if track_id not in self.track_counters:
            self.track_counters[track_id] = {
                "helmet": {"consecutive_count": 0, "missing_since": None},
                "vest": {"consecutive_count": 0, "missing_since": None},
                "goggles": {"consecutive_count": 0, "missing_since": None},
            }

        counters = self.track_counters[track_id]
        rules = ppe_rules or {"helmet_required": True, "vest_required": True}
        confirmed_alerts = []

        # -------------------------------------------------------------
        # 1. Helmet Consecutive Frame & Cooldown Evaluation
        # -------------------------------------------------------------
        if rules.get("helmet_required", True):
            h_state = ppe_state.get("helmet_state", "PRESENT")
            if h_state == "MISSING":
                counters["helmet"]["consecutive_count"] += 1
                if counters["helmet"]["missing_since"] is None:
                    counters["helmet"]["missing_since"] = current_time

                # Check if N consecutive non-compliant frames reached
                if counters["helmet"]["consecutive_count"] >= self.consecutive_frames_required:
                    fingerprint = self._get_fingerprint(camera_id, zone_id, track_id, "MISSING_HELMET")
                    
                    # Cooldown Check (5 minutes / 300s)
                    if not cache.is_in_cooldown(fingerprint):
                        cache.set_cooldown(fingerprint, duration_sec=self.cooldown_sec)
                        duration = current_time - counters["helmet"]["missing_since"]
                        
                        confirmed_alerts.append({
                            "event_type": "MISSING_HELMET",
                            "severity": self.compute_severity("MISSING_HELMET", zone_risk),
                            "camera_id": camera_id,
                            "zone_id": zone_id,
                            "zone_name": zone.get("name", zone_id),
                            "worker_track_id": track_id,
                            "consecutive_frames": counters["helmet"]["consecutive_count"],
                            "duration_sec": round(duration, 1),
                            "metadata": {
                                "consecutive_non_compliant_frames": counters["helmet"]["consecutive_count"],
                                "violation_duration_sec": round(duration, 1),
                                "cooldown_sec": self.cooldown_sec
                            }
                        })
                        logger.info(f"Confirmed alert MISSING_HELMET for {track_id} after {counters['helmet']['consecutive_count']} consecutive frames.")
            else:
                # Reset counter on compliant or occluded frame to filter out single-frame errors
                counters["helmet"]["consecutive_count"] = 0
                counters["helmet"]["missing_since"] = None

        # -------------------------------------------------------------
        # 2. Vest Consecutive Frame & Cooldown Evaluation
        # -------------------------------------------------------------
        if rules.get("vest_required", True):
            v_state = ppe_state.get("vest_state", "PRESENT")
            if v_state == "MISSING":
                counters["vest"]["consecutive_count"] += 1
                if counters["vest"]["missing_since"] is None:
                    counters["vest"]["missing_since"] = current_time

                if counters["vest"]["consecutive_count"] >= self.consecutive_frames_required:
                    fingerprint = self._get_fingerprint(camera_id, zone_id, track_id, "MISSING_VEST")
                    
                    if not cache.is_in_cooldown(fingerprint):
                        cache.set_cooldown(fingerprint, duration_sec=self.cooldown_sec)
                        duration = current_time - counters["vest"]["missing_since"]
                        
                        confirmed_alerts.append({
                            "event_type": "MISSING_VEST",
                            "severity": self.compute_severity("MISSING_VEST", zone_risk),
                            "camera_id": camera_id,
                            "zone_id": zone_id,
                            "zone_name": zone.get("name", zone_id),
                            "worker_track_id": track_id,
                            "consecutive_frames": counters["vest"]["consecutive_count"],
                            "duration_sec": round(duration, 1),
                            "metadata": {
                                "consecutive_non_compliant_frames": counters["vest"]["consecutive_count"],
                                "violation_duration_sec": round(duration, 1),
                                "cooldown_sec": self.cooldown_sec
                            }
                        })
                        logger.info(f"Confirmed alert MISSING_VEST for {track_id} after {counters['vest']['consecutive_count']} consecutive frames.")
            else:
                counters["vest"]["consecutive_count"] = 0
                counters["vest"]["missing_since"] = None

        return confirmed_alerts

    # Backward compatibility helper
    evaluate_worker_ppe = evaluate_frame_compliance
