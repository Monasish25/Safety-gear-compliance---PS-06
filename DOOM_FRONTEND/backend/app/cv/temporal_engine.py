import time
from typing import Dict, List, Optional, Tuple
from app.core.config import settings
from app.core.cache import cache

class TemporalConfirmationEngine:
    def __init__(
        self,
        helmet_confirm_sec: float = settings.CONFIRMATION_TIME_HELMET_SEC,
        vest_confirm_sec: float = settings.CONFIRMATION_TIME_VEST_SEC,
        cooldown_sec: int = settings.ALERT_COOLDOWN_SEC
    ):
        self.helmet_confirm_sec = helmet_confirm_sec
        self.vest_confirm_sec = vest_confirm_sec
        self.cooldown_sec = cooldown_sec

        # In-memory tracking of violation start times per track
        # {track_id: {"helmet_missing_since": float, "vest_missing_since": float}}
        self.track_timers: Dict[str, Dict[str, Optional[float]]] = {}

    def _get_fingerprint(self, camera_id: str, zone_id: str, track_id: str, event_type: str) -> str:
        return f"{camera_id}:{zone_id}:{track_id}:{event_type}"

    def compute_severity(self, event_type: str, zone_risk: str) -> str:
        """Computes alert severity based on PRD Section 17."""
        if event_type == "FIRE_DETECTED":
            return "CRITICAL"
        if event_type == "SMOKE_DETECTED":
            if zone_risk.upper() in ["CRITICAL", "HIGH"]:
                return "CRITICAL"
            return "HIGH"
        
        # Missing Helmet or Vest
        if zone_risk.upper() == "CRITICAL":
            return "CRITICAL"
        elif zone_risk.upper() == "HIGH":
            return "HIGH"
        elif zone_risk.upper() == "MEDIUM":
            return "MEDIUM"
        else:
            return "LOW"

    def evaluate_worker_ppe(
        self,
        camera_id: str,
        zone: Optional[Dict],
        track_id: str,
        ppe_state: Dict,
        ppe_rules: Optional[Dict],
        current_time: Optional[float] = None
    ) -> List[Dict]:
        """
        Evaluates temporal confirmation for worker PPE violations.
        Returns list of confirmed events to trigger (if any).
        """
        if current_time is None:
            current_time = time.time()

        if zone is None:
            # Person is not in a monitored zone
            self.track_timers.pop(track_id, None)
            return []

        zone_id = zone["id"]
        zone_risk = zone.get("risk_level", "Medium")

        if track_id not in self.track_timers:
            self.track_timers[track_id] = {
                "helmet_missing_since": None,
                "vest_missing_since": None
            }

        timers = self.track_timers[track_id]
        confirmed_alerts = []

        # Helmet check
        helmet_required = ppe_rules.get("helmet_required", True) if ppe_rules else True
        h_state = ppe_state.get("helmet_state", "PRESENT")

        if helmet_required:
            if h_state == "MISSING":
                if timers["helmet_missing_since"] is None:
                    timers["helmet_missing_since"] = current_time
                duration = current_time - timers["helmet_missing_since"]

                if duration >= self.helmet_confirm_sec:
                    fp = self._get_fingerprint(camera_id, zone_id, track_id, "MISSING_HELMET")
                    if not cache.is_in_cooldown(fp):
                        cache.set_cooldown(fp, self.cooldown_sec)
                        confirmed_alerts.append({
                            "event_type": "MISSING_HELMET",
                            "severity": self.compute_severity("MISSING_HELMET", zone_risk),
                            "camera_id": camera_id,
                            "zone_id": zone_id,
                            "zone_name": zone.get("name", zone_id),
                            "worker_track_id": track_id,
                            "confidence": 0.89,
                            "duration_sec": round(duration, 1),
                            "metadata": {
                                "violation_duration_sec": round(duration, 1),
                                "required_item": "helmet",
                                "detected_state": "MISSING",
                                "zone_risk": zone_risk
                            }
                        })
            elif h_state == "PRESENT":
                timers["helmet_missing_since"] = None
            # If NOT_VISIBLE or UNCERTAIN, do NOT reset timer, but do NOT trigger alert yet (extend observation)

        # Vest check
        vest_required = ppe_rules.get("vest_required", True) if ppe_rules else True
        v_state = ppe_state.get("vest_state", "PRESENT")

        if vest_required:
            if v_state == "MISSING":
                if timers["vest_missing_since"] is None:
                    timers["vest_missing_since"] = current_time
                duration = current_time - timers["vest_missing_since"]

                if duration >= self.vest_confirm_sec:
                    fp = self._get_fingerprint(camera_id, zone_id, track_id, "MISSING_VEST")
                    if not cache.is_in_cooldown(fp):
                        cache.set_cooldown(fp, self.cooldown_sec)
                        confirmed_alerts.append({
                            "event_type": "MISSING_VEST",
                            "severity": self.compute_severity("MISSING_VEST", zone_risk),
                            "camera_id": camera_id,
                            "zone_id": zone_id,
                            "zone_name": zone.get("name", zone_id),
                            "worker_track_id": track_id,
                            "confidence": 0.86,
                            "duration_sec": round(duration, 1),
                            "metadata": {
                                "violation_duration_sec": round(duration, 1),
                                "required_item": "vest",
                                "detected_state": "MISSING",
                                "zone_risk": zone_risk
                            }
                        })
            elif v_state == "PRESENT":
                timers["vest_missing_since"] = None

        return confirmed_alerts

    def evaluate_hazards(
        self,
        camera_id: str,
        zone: Optional[Dict],
        smoke_detected: bool,
        fire_detected: bool,
        current_time: Optional[float] = None
    ) -> List[Dict]:
        """
        Evaluates temporal confirmation for Smoke (>= 3 of 5) and Fire (>= 2 of 3).
        """
        if current_time is None:
            current_time = time.time()

        zone_id = zone["id"] if zone else "ZONE_GENERAL"
        zone_risk = zone.get("risk_level", "High") if zone else "High"
        zone_name = zone.get("name", "Factory Area") if zone else "General Area"

        confirmed_hazards = []

        # Smoke evaluation (>= 3 of last 5)
        smoke_key = f"hazard_history:{camera_id}:{zone_id}:smoke"
        cache.push_observation(smoke_key, 1 if smoke_detected else 0, max_len=5)
        recent_smoke = cache.get_recent_observations(smoke_key, count=5)
        if len(recent_smoke) >= 3 and sum(recent_smoke) >= 3:
            fp = self._get_fingerprint(camera_id, zone_id, "HAZARD", "SMOKE_DETECTED")
            if not cache.is_in_cooldown(fp):
                cache.set_cooldown(fp, self.cooldown_sec)
                confirmed_hazards.append({
                    "event_type": "SMOKE_DETECTED",
                    "severity": self.compute_severity("SMOKE_DETECTED", zone_risk),
                    "camera_id": camera_id,
                    "zone_id": zone_id,
                    "zone_name": zone_name,
                    "worker_track_id": None,
                    "confidence": 0.91,
                    "metadata": {
                        "observation_ratio": f"{sum(recent_smoke)}/5",
                        "zone_risk": zone_risk
                    }
                })

        # Fire evaluation (>= 2 of last 3)
        fire_key = f"hazard_history:{camera_id}:{zone_id}:fire"
        cache.push_observation(fire_key, 1 if fire_detected else 0, max_len=3)
        recent_fire = cache.get_recent_observations(fire_key, count=3)
        if len(recent_fire) >= 2 and sum(recent_fire) >= 2:
            fp = self._get_fingerprint(camera_id, zone_id, "HAZARD", "FIRE_DETECTED")
            if not cache.is_in_cooldown(fp):
                cache.set_cooldown(fp, self.cooldown_sec)
                confirmed_hazards.append({
                    "event_type": "FIRE_DETECTED",
                    "severity": self.compute_severity("FIRE_DETECTED", zone_risk),
                    "camera_id": camera_id,
                    "zone_id": zone_id,
                    "zone_name": zone_name,
                    "worker_track_id": None,
                    "confidence": 0.95,
                    "metadata": {
                        "observation_ratio": f"{sum(recent_fire)}/3",
                        "zone_risk": zone_risk
                    }
                })

        return confirmed_hazards
