import os
import cv2
import time
import uuid
import datetime
import logging
from typing import List, Dict, Optional, Callable, Tuple
import numpy as np

from app.core.config import settings
from app.core.storage import storage
from app.core.database import SessionLocal
from app.models import schema
from app.cv.detector import SafetyVisionDetector
from app.cv.tracker import AnonymousWorkerTracker
from app.cv.zone_engine import ZoneEngine
from app.cv.association import PPEAssociationEngine, apply_clahe
from app.cv.temporal_engine import TemporalConfirmationEngine

logger = logging.getLogger("safegear.pipeline")

class SafetyPipeline:
    def __init__(self, camera_id: str = "CAM_01"):
        self.camera_id = camera_id
        self.detector = SafetyVisionDetector()
        self.tracker = AnonymousWorkerTracker(camera_id=camera_id, max_age_seconds=settings.TRACK_MAX_AGE_SEC)
        self.association_engine = PPEAssociationEngine()
        self.temporal_engine = TemporalConfirmationEngine()
        self.zone_engine = None
        self._load_zones_and_rules()

    def _load_zones_and_rules(self):
        db = SessionLocal()
        try:
            zones_db = db.query(schema.Zone).all()
            self.zones_data = []
            self.ppe_rules_map = {}
            for z in zones_db:
                self.zones_data.append({
                    "id": z.id,
                    "name": z.name,
                    "risk_level": z.risk_level,
                    "polygon": z.polygon,
                    "camera_id": z.camera_id
                })
                if z.ppe_rule:
                    self.ppe_rules_map[z.id] = {
                        "helmet_required": z.ppe_rule.helmet_required,
                        "vest_required": z.ppe_rule.vest_required,
                        "gloves_required": z.ppe_rule.gloves_required,
                        "mask_required": z.ppe_rule.mask_required
                    }
                else:
                    self.ppe_rules_map[z.id] = {"helmet_required": True, "vest_required": True}
            
            self.zone_engine = ZoneEngine(self.zones_data)
        finally:
            db.close()

    def process_video(
        self,
        video_path: str,
        video_id: str,
        on_alert_callback: Optional[Callable[[Dict], None]] = None,
        on_progress_callback: Optional[Callable[[float, int, int], None]] = None,
        save_annotated_video: bool = True
    ) -> Dict:
        """
        Processes an uploaded MP4 video according to the PRD specifications.
        """
        self._load_zones_and_rules()
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video at {video_path}")

        source_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Sample at 5 FPS (PRD Section 12)
        sample_step = max(1, int(round(source_fps / settings.INFERENCE_FPS)))
        time_step = 1.0 / settings.INFERENCE_FPS

        # Annotated video writer
        out_writer = None
        annotated_path = None
        if save_annotated_video:
            out_dir = settings.LOCAL_STORAGE_DIR / "videos"
            out_dir.mkdir(parents=True, exist_ok=True)
            annotated_path = str(out_dir / f"annotated_{video_id}.mp4")
            fourcc = cv2.VideoWriter_fourcc(*"avc1")
            out_writer = cv2.VideoWriter(annotated_path, fourcc, settings.INFERENCE_FPS, (width, height))
            if not out_writer.isOpened():
                # Fallback codec
                fourcc = cv2.VideoWriter_fourcc(*"mp4v")
                out_writer = cv2.VideoWriter(annotated_path, fourcc, settings.INFERENCE_FPS, (width, height))

        frame_idx = 0
        processed_count = 0
        simulated_time = 0.0
        violations_created = 0

        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_idx % sample_step == 0:
                    simulated_time += time_step
                    annotated_frame, confirmed_events = self.process_frame(
                        frame,
                        timestamp=simulated_time,
                        persist_db=True,
                        on_alert_callback=on_alert_callback
                    )
                    violations_created += len(confirmed_events)

                    if out_writer and out_writer.isOpened():
                        out_writer.write(annotated_frame)

                    processed_count += 1
                    if on_progress_callback:
                        progress = min(1.0, frame_idx / total_frames)
                        on_progress_callback(progress, processed_count, violations_created)

                frame_idx += 1
        finally:
            cap.release()
            if out_writer:
                out_writer.release()

        return {
            "total_frames": total_frames,
            "processed_frames": processed_count,
            "violation_count": violations_created,
            "annotated_video_path": annotated_path
        }

    def process_frame(
        self,
        frame: np.ndarray,
        timestamp: Optional[float] = None,
        persist_db: bool = True,
        on_alert_callback: Optional[Callable[[Dict], None]] = None
    ) -> Tuple[np.ndarray, List[Dict]]:
        """
        Processes single frame: detection, tracking, association, temporal logic, annotation.
        """
        if timestamp is None:
            timestamp = time.time()

        h, w = frame.shape[:2]
        annotated = frame.copy()

        # 1. Detection
        detections = self.detector.detect_frame(frame)
        persons = detections["persons"]
        ppe_items = detections["ppe_items"]
        smoke_detected = detections["smoke_detected"]
        fire_detected = detections["fire_detected"]

        # 2. Tracking (ByteTrack)
        tracked_workers = self.tracker.update(persons, current_time=timestamp)

        # 3. Draw Zones
        self._draw_zones(annotated)

        confirmed_events = []

        # 4. Worker Evaluation
        for worker in tracked_workers:
            bbox = worker["bbox"]
            track_id = worker["track_id"]

            # Zone mapping
            zone = self.zone_engine.find_zone_for_bbox(bbox, frame_width=w, frame_height=h)
            rules = self.ppe_rules_map.get(zone["id"]) if zone else None

            # PPE association
            assessment = self.association_engine.assess_person_ppe(
                person_bbox=bbox,
                detected_ppe=ppe_items,
                frame=frame,
                required_ppe=rules
            )

            # Temporal Confirmation
            alerts = self.temporal_engine.evaluate_worker_ppe(
                camera_id=self.camera_id,
                zone=zone,
                track_id=track_id,
                ppe_state=assessment,
                ppe_rules=rules,
                current_time=timestamp
            )

            for alert in alerts:
                confirmed_events.append(alert)
                if persist_db:
                    self._persist_safety_event(alert, frame, annotated)
                if on_alert_callback:
                    on_alert_callback(alert)

            # Draw worker annotation
            self._draw_worker(annotated, worker, zone, assessment)

        # 5. Hazard Evaluation (Smoke / Fire)
        # Map hazard to center zone or camera zone
        hazard_zone = self.zones_data[0] if self.zones_data else None
        hazard_alerts = self.temporal_engine.evaluate_hazards(
            camera_id=self.camera_id,
            zone=hazard_zone,
            smoke_detected=smoke_detected,
            fire_detected=fire_detected,
            current_time=timestamp
        )

        for h_alert in hazard_alerts:
            confirmed_events.append(h_alert)
            if persist_db:
                self._persist_safety_event(h_alert, frame, annotated)
            if on_alert_callback:
                on_alert_callback(h_alert)

        # Draw hazard boxes
        for sb in detections["smoke_boxes"]:
            sx1, sy1, sx2, sy2 = map(int, sb["bbox"])
            cv2.rectangle(annotated, (sx1, sy1), (sx2, sy2), (180, 180, 180), 2)
            cv2.putText(annotated, f"SMOKE {sb['confidence']:.2f}", (sx1, sy1 - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 2)

        for fb in detections["fire_boxes"]:
            fx1, fy1, fx2, fy2 = map(int, fb["bbox"])
            cv2.rectangle(annotated, (fx1, fy1), (fx2, fy2), (0, 0, 255), 3)
            cv2.putText(annotated, f"FIRE HAZARD {fb['confidence']:.2f}", (fx1, fy1 - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        return annotated, confirmed_events

    def _persist_safety_event(self, alert_data: Dict, raw_frame: np.ndarray, annotated_frame: np.ndarray):
        """Saves confirmed event in DB and evidence in MinIO / Local storage."""
        event_id = str(uuid.uuid4())
        alert_data["id"] = event_id

        # Save annotated evidence snapshot
        snapshot_rel_path = storage.save_cv_frame(
            annotated_frame,
            camera_id=self.camera_id,
            event_type=alert_data["event_type"],
            event_id=event_id,
            is_annotated=True
        )
        alert_data["snapshot_url"] = f"/api/v1/evidence/{snapshot_rel_path}"

        db = SessionLocal()
        try:
            # Ensure worker track is recorded
            worker_track_fk = None
            if alert_data.get("worker_track_id"):
                track_rec = db.query(schema.WorkerTrack).filter(
                    schema.WorkerTrack.tracker_id == alert_data["worker_track_id"]
                ).first()
                if not track_rec:
                    track_rec = schema.WorkerTrack(
                        id=str(uuid.uuid4()),
                        camera_id=self.camera_id,
                        tracker_id=alert_data["worker_track_id"],
                        status="ACTIVE"
                    )
                    db.add(track_rec)
                    db.flush()
                worker_track_fk = track_rec.id

            event = schema.SafetyEvent(
                id=event_id,
                camera_id=self.camera_id,
                zone_id=alert_data.get("zone_id"),
                worker_track_id=worker_track_fk,
                event_type=alert_data["event_type"],
                severity=alert_data["severity"],
                confidence=alert_data["confidence"],
                status="NEW",
                started_at=datetime.datetime.now(datetime.timezone.utc),
                event_metadata=alert_data.get("metadata")
            )
            db.add(event)
            db.flush()

            evidence_file = schema.EvidenceFile(
                id=str(uuid.uuid4()),
                safety_event_id=event_id,
                evidence_type="IMAGE",
                object_path=snapshot_rel_path,
                is_annotated=True
            )
            db.add(evidence_file)
            db.commit()
            logger.info(f"Persisted safety event {event_id} ({alert_data['event_type']}) with evidence.")
        except Exception as e:
            db.rollback()
            logger.error(f"Error persisting event to DB: {e}")
        finally:
            db.close()

    def _draw_zones(self, frame: np.ndarray):
        """Renders zone boundaries on frame."""
        for zone in self.zones_data:
            poly = zone.get("polygon", {})
            pts = poly.get("points")
            if pts:
                pts_np = np.array(pts, np.int32).reshape((-1, 1, 2))
                color = (0, 255, 0)
                if zone["risk_level"] == "High":
                    color = (0, 165, 255)
                elif zone["risk_level"] == "Critical":
                    color = (0, 0, 255)
                
                cv2.polylines(frame, [pts_np], isClosed=True, color=color, thickness=2)
                # Label
                label_x = int(pts[0][0]) + 10
                label_y = int(pts[0][1]) + 25
                cv2.putText(frame, f"{zone['name']} [{zone['risk_level']}]", (label_x, label_y),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)

    def _draw_worker(self, frame: np.ndarray, worker: Dict, zone: Optional[Dict], assessment: Dict):
        """Renders bounding box, anonymous ID, and PPE status indicators."""
        x1, y1, x2, y2 = map(int, worker["bbox"])
        track_id = worker["track_id"]
        h_state = assessment["helmet_state"]
        v_state = assessment["vest_state"]

        # Color: green if all compliant, red/amber if missing
        is_compliant = (h_state in ["PRESENT", "NOT_VISIBLE"]) and (v_state in ["PRESENT", "NOT_VISIBLE"])
        box_color = (0, 220, 0) if is_compliant else (0, 70, 255)

        # Worker bbox
        cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)

        # Draw head region (top 30%)
        hx1, hy1, hx2, hy2 = map(int, assessment["head_bbox"])
        h_color = (0, 255, 0) if h_state == "PRESENT" else ((0, 255, 255) if h_state == "UNCERTAIN" else (0, 0, 255))
        cv2.rectangle(frame, (hx1, hy1), (hx2, hy2), h_color, 1)

        # Draw torso region
        tx1, ty1, tx2, ty2 = map(int, assessment["torso_bbox"])
        v_color = (0, 255, 0) if v_state == "PRESENT" else ((0, 255, 255) if v_state == "UNCERTAIN" else (0, 0, 255))
        cv2.rectangle(frame, (tx1, ty1), (tx2, ty2), v_color, 1)

        # Overlay text banner
        banner_text = f"{track_id} | H:{h_state} | V:{v_state}"
        (tw, th), _ = cv2.getTextSize(banner_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(frame, (x1, max(0, y1 - 22)), (x1 + tw + 8, max(0, y1)), (20, 20, 20), -1)
        cv2.putText(frame, banner_text, (x1 + 4, max(0, y1 - 6)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
