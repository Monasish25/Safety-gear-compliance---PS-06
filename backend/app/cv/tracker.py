import time
import numpy as np
from typing import List, Dict, Tuple, Optional

def calculate_center_distance(box1: List[float], box2: List[float]) -> float:
    """Calculate Euclidean distance between the centers of two bounding boxes."""
    c1_x = (box1[0] + box1[2]) / 2
    c1_y = (box1[1] + box1[3]) / 2
    c2_x = (box2[0] + box2[2]) / 2
    c2_y = (box2[1] + box2[3]) / 2
    return np.sqrt((c1_x - c2_x)**2 + (c1_y - c2_y)**2)

class TrackedWorker:
    def __init__(self, track_id: str, bbox: List[float], confidence: float, timestamp: float):
        self.track_id = track_id
        self.bbox = bbox  # [x1, y1, x2, y2]
        self.confidence = confidence
        self.first_seen = timestamp
        self.last_seen = timestamp
        self.time_since_update = 0.0
        self.velocity = [0.0, 0.0]
        self.history = [bbox]

    def predict(self, dt: float) -> List[float]:
        dx = self.velocity[0] * dt
        dy = self.velocity[1] * dt
        return [
            self.bbox[0] + dx,
            self.bbox[1] + dy,
            self.bbox[2] + dx,
            self.bbox[3] + dy
        ]

    def update(self, bbox: List[float], confidence: float, timestamp: float):
        self.velocity = [0.0, 0.0]
        self.bbox = bbox
        self.confidence = confidence
        self.last_seen = timestamp
        self.time_since_update = 0.0
        self.history.append(bbox)
        if len(self.history) > 30:
            self.history.pop(0)

class AnonymousWorkerTracker:
    def __init__(self, camera_id: str = "CAM_01", max_age_seconds: float = 1.0, distance_threshold: float = 250.0):
        self.camera_id = camera_id
        self.max_age_seconds = max_age_seconds
        self.distance_threshold = distance_threshold
        self.trackers: Dict[str, TrackedWorker] = {}
        self.next_id_counter = 1

    def _generate_id(self) -> str:
        tid = f"{self.camera_id}_W_{self.next_id_counter:03d}"
        self.next_id_counter += 1
        return tid

    def update(self, detections: List[Dict], current_time: Optional[float] = None) -> List[Dict]:
        if current_time is None:
            current_time = time.time()

        for track in self.trackers.values():
            track.time_since_update = current_time - track.last_seen

        active_track_ids = list(self.trackers.keys())
        matched_detections = set()
        matched_tracks = set()
        results = []

        if active_track_ids and detections:
            cost_matrix = np.full((len(detections), len(active_track_ids)), np.inf)
            for i, det in enumerate(detections):
                for j, tid in enumerate(active_track_ids):
                    track = self.trackers[tid]
                    pred_bbox = track.predict(track.time_since_update)
                    dist = calculate_center_distance(det['bbox'], pred_bbox)
                    cost_matrix[i, j] = dist

            while True:
                min_dist = np.min(cost_matrix)
                if min_dist > self.distance_threshold:
                    break
                i, j = np.unravel_index(np.argmin(cost_matrix), cost_matrix.shape)
                tid = active_track_ids[j]

                self.trackers[tid].update(detections[i]['bbox'], detections[i]['confidence'], current_time)
                det_copy = dict(detections[i])
                det_copy['track_id'] = tid
                results.append(det_copy)

                matched_detections.add(i)
                matched_tracks.add(tid)
                cost_matrix[i, :] = np.inf
                cost_matrix[:, j] = np.inf

        # Unmatched detections -> spawn new anonymous tracks
        for i, det in enumerate(detections):
            if i not in matched_detections:
                new_tid = self._generate_id()
                new_track = TrackedWorker(new_tid, det['bbox'], det['confidence'], current_time)
                self.trackers[new_tid] = new_track
                det_copy = dict(det)
                det_copy['track_id'] = new_tid
                results.append(det_copy)

        # Remove dead tracks that exceeded max_age_seconds
        dead_tracks = [
            tid for tid, track in self.trackers.items()
            if (current_time - track.last_seen) > self.max_age_seconds
        ]
        for tid in dead_tracks:
            del self.trackers[tid]

        return results
