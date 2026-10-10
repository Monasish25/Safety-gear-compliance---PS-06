import time
import numpy as np
from typing import List, Dict, Tuple, Optional

def calculate_iou(box1: List[float], box2: List[float]) -> float:
    """Calculate Intersection over Union of two bounding boxes [x1, y1, x2, y2]."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter_area = max(0, x2 - x1) * max(0, y2 - y1)
    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])

    union_area = box1_area + box2_area - inter_area
    if union_area <= 0:
        return 0.0
    return inter_area / union_area

class TrackedWorker:
    def __init__(self, track_id: str, bbox: List[float], confidence: float, timestamp: float):
        self.track_id = track_id
        self.bbox = bbox  # [x1, y1, x2, y2]
        self.confidence = confidence
        self.first_seen = timestamp
        self.last_seen = timestamp
        self.time_since_update = 0.0
        self.velocity = [0.0, 0.0]  # dx, dy per sec
        self.history = [bbox]

    def predict(self, dt: float) -> List[float]:
        """Simple motion prediction for occlusion handling."""
        dx = self.velocity[0] * dt
        dy = self.velocity[1] * dt
        return [
            self.bbox[0] + dx,
            self.bbox[1] + dy,
            self.bbox[2] + dx,
            self.bbox[3] + dy
        ]

    def update(self, bbox: List[float], confidence: float, timestamp: float):
        dt = max(1e-3, timestamp - self.last_seen)
        old_center = [(self.bbox[0] + self.bbox[2]) / 2, (self.bbox[1] + self.bbox[3]) / 2]
        new_center = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
        
        self.velocity = [
            (new_center[0] - old_center[0]) / dt,
            (new_center[1] - old_center[1]) / dt
        ]
        self.bbox = bbox
        self.confidence = confidence
        self.last_seen = timestamp
        self.time_since_update = 0.0
        self.history.append(bbox)
        if len(self.history) > 30:
            self.history.pop(0)

class AnonymousWorkerTracker:
    """
    ByteTrack-inspired tracker maintaining anonymous IDs across frames.
    Tolerates occlusion (default up to 3s) using predicted bounding boxes.
    """
    def __init__(self, camera_id: str = "CAM_01", max_age_seconds: float = 3.0, iou_threshold: float = 0.3):
        self.camera_id = camera_id
        self.max_age_seconds = max_age_seconds
        self.iou_threshold = iou_threshold
        self.trackers: Dict[str, TrackedWorker] = {}
        self.next_id_counter = 1

    def _generate_id(self) -> str:
        tid = f"{self.camera_id}_W_{self.next_id_counter:03d}"
        self.next_id_counter += 1
        return tid

    def update(self, detections: List[Dict], current_time: Optional[float] = None) -> List[Dict]:
        """
        Input detections: list of {'bbox': [x1, y1, x2, y2], 'confidence': float}
        Returns: list of detections augmented with 'track_id' and 'predicted_bbox'
        """
        if current_time is None:
            current_time = time.time()

        # Update time_since_update for existing tracks
        for track in self.trackers.values():
            track.time_since_update = current_time - track.last_seen

        active_track_ids = list(self.trackers.keys())
        matched_detections = set()
        matched_tracks = set()

        results = []

        if active_track_ids and detections:
            # First match with recent tracks
            cost_matrix = np.zeros((len(detections), len(active_track_ids)), dtype=float)
            for i, det in enumerate(detections):
                for j, tid in enumerate(active_track_ids):
                    track = self.trackers[tid]
                    pred_bbox = track.predict(track.time_since_update)
                    cost_matrix[i, j] = calculate_iou(det['bbox'], pred_bbox)

            # Greedy bipartite matching
            while True:
                max_iou = np.max(cost_matrix)
                if max_iou < self.iou_threshold:
                    break
                i, j = np.unravel_index(np.argmax(cost_matrix), cost_matrix.shape)
                tid = active_track_ids[j]

                self.trackers[tid].update(detections[i]['bbox'], detections[i]['confidence'], current_time)
                det_copy = dict(detections[i])
                det_copy['track_id'] = tid
                results.append(det_copy)

                matched_detections.add(i)
                matched_tracks.add(tid)
                cost_matrix[i, :] = -1.0
                cost_matrix[:, j] = -1.0

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
