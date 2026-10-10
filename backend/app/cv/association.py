import cv2
import numpy as np
from typing import List, Dict, Tuple, Optional
from app.core.config import settings

def calculate_box_overlap(boxA: List[float], boxB: List[float]) -> float:
    """Calculates intersection area relative to boxB area."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    inter_width = max(0.0, xB - xA)
    inter_height = max(0.0, yB - yA)
    inter_area = inter_width * inter_height

    boxB_area = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
    if boxB_area <= 0:
        return 0.0
    return inter_area / boxB_area

def apply_clahe(frame: np.ndarray) -> np.ndarray:
    """Enhance contrast with CLAHE for low-light or dusty frames."""
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    return cv2.fastNlMeansDenoisingColored(enhanced, None, 3, 3, 7, 21) if False else enhanced

def is_low_contrast(crop: np.ndarray, std_thresh: float = 28.0) -> bool:
    """Detect dusty or dim scene by gray standard deviation."""
    if crop.size == 0:
        return True
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    return float(np.std(gray)) < std_thresh

class PPEAssociationEngine:
    def __init__(
        self,
        head_ratio: float = settings.HEAD_RATIO,
        torso_start: float = settings.TORSO_START_RATIO,
        torso_end: float = settings.TORSO_END_RATIO,
        overlap_threshold: float = 0.35
    ):
        self.head_ratio = head_ratio
        self.torso_start = torso_start
        self.torso_end = torso_end
        self.overlap_threshold = overlap_threshold

    def get_person_regions(self, person_bbox: List[float]) -> Dict[str, List[float]]:
        """
        Calculates head and torso region boxes from person [x1, y1, x2, y2].
        Head: top 30%
        Torso: 25% to 70%
        """
        x1, y1, x2, y2 = person_bbox
        height = y2 - y1

        head_box = [x1, y1, x2, y1 + (height * self.head_ratio)]
        torso_box = [x1, y1 + (height * self.torso_start), x2, y1 + (height * self.torso_end)]

        return {
            "head": head_box,
            "torso": torso_box
        }

    def assess_person_ppe(
        self,
        person_bbox: List[float],
        detected_ppe: List[Dict],
        frame: Optional[np.ndarray] = None,
        required_ppe: Optional[Dict] = None
    ) -> Dict:
        """
        Associates PPE boxes to person head and torso regions.
        detected_ppe: list of {'label': 'helmet'|'vest'|'gloves'|'mask', 'bbox': [x1, y1, x2, y2], 'confidence': float}
        Returns:
            helmet_state: PRESENT / MISSING / NOT_VISIBLE / UNCERTAIN
            vest_state: PRESENT / MISSING / NOT_VISIBLE / UNCERTAIN
            helmet_confidence: float
            vest_confidence: float
            visibility_quality: GOOD / POOR / OCCLUDED
        """
        if required_ppe is None:
            required_ppe = {"helmet": True, "vest": True, "gloves": False, "mask": False}

        regions = self.get_person_regions(person_bbox)
        head_box = regions["head"]
        torso_box = regions["torso"]

        # Check frame visibility & contrast if frame is available
        visibility_quality = "GOOD"
        if frame is not None:
            h, w = frame.shape[:2]
            # Check if head is cut off / out of frame
            if head_box[1] <= 5 or head_box[0] <= 5 or head_box[2] >= (w - 5):
                visibility_quality = "OCCLUDED"
            else:
                x1_c, y1_c, x2_c, y2_c = map(int, [max(0, head_box[0]), max(0, head_box[1]), min(w, head_box[2]), min(h, head_box[3])])
                if (x2_c > x1_c) and (y2_c > y1_c):
                    head_crop = frame[y1_c:y2_c, x1_c:x2_c]
                    if is_low_contrast(head_crop):
                        visibility_quality = "POOR"

        # 1. Helmet Evaluation
        helmet_state = "NOT_VISIBLE" if visibility_quality == "OCCLUDED" else "MISSING"
        helmet_confidence = 0.0
        best_helmet_overlap = 0.0
        helmet_bbox = None

        for item in detected_ppe:
            if item["label"] == "helmet":
                overlap = calculate_box_overlap(head_box, item["bbox"])
                if overlap > self.overlap_threshold:
                    if overlap > best_helmet_overlap:
                        best_helmet_overlap = overlap
                        helmet_confidence = item.get("confidence", 0.9)
                        helmet_state = "PRESENT"
                        helmet_bbox = item["bbox"]

        # 2. Vest Evaluation
        vest_state = "NOT_VISIBLE" if visibility_quality == "OCCLUDED" else "MISSING"
        vest_confidence = 0.0
        best_vest_overlap = 0.0
        vest_bbox = None

        for item in detected_ppe:
            if item["label"] in ["vest", "safety_vest"]:
                overlap = calculate_box_overlap(torso_box, item["bbox"])
                if overlap > self.overlap_threshold:
                    if overlap > best_vest_overlap:
                        best_vest_overlap = overlap
                        vest_confidence = item.get("confidence", 0.88)
                        vest_state = "PRESENT"
                        vest_bbox = item["bbox"]

        # 3. Gloves Evaluation
        gloves_state = "NOT_VISIBLE" if visibility_quality == "OCCLUDED" else "MISSING"
        gloves_confidence = 0.0
        best_gloves_overlap = 0.0
        gloves_bbox = None

        for item in detected_ppe:
            if item["label"] == "gloves":
                overlap = calculate_box_overlap(person_bbox, item["bbox"])
                if overlap > 0.0:  # Any overlap with the person
                    if overlap > best_gloves_overlap:
                        best_gloves_overlap = overlap
                        gloves_confidence = item.get("confidence", 0.85)
                        gloves_state = "PRESENT"
                        gloves_bbox = item["bbox"]
                        
        # Dust/Dim Scene -> Uncertainty logic (PRD Section 14)
        if visibility_quality == "POOR" and (helmet_state == "MISSING" or vest_state == "MISSING" or gloves_state == "MISSING"):
            if helmet_state == "MISSING":
                helmet_state = "UNCERTAIN"
            if vest_state == "MISSING":
                vest_state = "UNCERTAIN"
            if gloves_state == "MISSING":
                gloves_state = "UNCERTAIN"

        return {
            "head_bbox": head_box,
            "torso_bbox": torso_box,
            "helmet_state": helmet_state,
            "helmet_confidence": helmet_confidence,
            "helmet_bbox": helmet_bbox,
            "vest_state": vest_state,
            "vest_confidence": vest_confidence,
            "vest_bbox": vest_bbox,
            "gloves_state": gloves_state,
            "gloves_confidence": gloves_confidence,
            "gloves_bbox": gloves_bbox,
            "visibility_quality": visibility_quality
        }
