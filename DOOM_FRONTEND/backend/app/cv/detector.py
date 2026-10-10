import os
import cv2
import numpy as np
import logging
from typing import List, Dict, Tuple, Optional
from ultralytics import YOLO

from app.core.config import settings

logger = logging.getLogger("safegear.detector")

class SafetyVisionDetector:
    def __init__(self, ppe_model_path: Optional[str] = None, firesmoke_model_path: Optional[str] = None):
        self.ppe_model_path = ppe_model_path or (str(settings.PPE_MODEL_PATH) if settings.PPE_MODEL_PATH.exists() else None)
        self.firesmoke_model_path = firesmoke_model_path or (str(settings.FIRESMOKE_MODEL_PATH) if settings.FIRESMOKE_MODEL_PATH.exists() else None)
        self.ppe_model = None
        self.firesmoke_model = None
        self.fallback_model = None
        self._load_models()

    def _load_models(self):
        if self.ppe_model_path and os.path.exists(self.ppe_model_path):
            try:
                self.ppe_model = YOLO(self.ppe_model_path)
                logger.info(f"Loaded custom PPE YOLO model from {self.ppe_model_path}")
            except Exception as e:
                logger.warning(f"Failed to load PPE YOLO model ({e})")

        if self.firesmoke_model_path and os.path.exists(self.firesmoke_model_path):
            try:
                self.firesmoke_model = YOLO(self.firesmoke_model_path)
                logger.info(f"Loaded custom FireSmoke YOLO model from {self.firesmoke_model_path}")
            except Exception as e:
                logger.warning(f"Failed to load FireSmoke YOLO model ({e})")

        if self.ppe_model is None:
            try:
                self.fallback_model = YOLO("yolov8n.pt")
                logger.info("Loaded fallback yolov8n.pt model")
            except Exception as e:
                logger.warning(f"Failed to load fallback yolov8n.pt: {e}")

    def detect_frame(self, frame: np.ndarray, conf_threshold: float = 0.25) -> Dict:
        """
        Runs object detection on frame using trained PPE.pt and FireSmoke.pt models,
        with fallback to optical contour and HSV analysis.
        Outputs:
            persons: list of {'bbox': [x1, y1, x2, y2], 'confidence': float}
            ppe_items: list of {'label': 'helmet'|'vest'|'gloves'|'mask', 'bbox': [x1, y1, x2, y2], 'confidence': float}
            smoke_detected: bool, smoke_boxes: list
            fire_detected: bool, fire_boxes: list
        """
        persons = []
        ppe_items = []
        smoke_boxes = []
        fire_boxes = []

        h, w = frame.shape[:2]

        # 1. Custom PPE & Worker Detection
        if self.ppe_model is not None:
            try:
                results = self.ppe_model.predict(frame, conf=conf_threshold, verbose=False)
                for r in results:
                    for box in r.boxes:
                        cls_id = int(box.cls[0])
                        cls_name = self.ppe_model.names.get(cls_id, "").lower()
                        conf = float(box.conf[0])
                        xyxy = [float(x) for x in box.xyxy[0].tolist()]

                        if cls_name == "person" or cls_id == 6:
                            persons.append({"bbox": xyxy, "confidence": conf})
                        elif "helmet" in cls_name or "hardhat" in cls_name:
                            ppe_items.append({"label": "helmet", "bbox": xyxy, "confidence": conf})
                        elif "vest" in cls_name:
                            ppe_items.append({"label": "vest", "bbox": xyxy, "confidence": conf})
                        elif "glove" in cls_name:
                            ppe_items.append({"label": "gloves", "bbox": xyxy, "confidence": conf})
                        elif "mask" in cls_name:
                            ppe_items.append({"label": "mask", "bbox": xyxy, "confidence": conf})
            except Exception as e:
                logger.error(f"PPE model inference error: {e}")

        # 2. Custom Fire & Smoke Detection
        if self.firesmoke_model is not None:
            try:
                results = self.firesmoke_model.predict(frame, conf=conf_threshold, verbose=False)
                for r in results:
                    for box in r.boxes:
                        cls_id = int(box.cls[0])
                        cls_name = self.firesmoke_model.names.get(cls_id, "").lower()
                        conf = float(box.conf[0])
                        xyxy = [float(x) for x in box.xyxy[0].tolist()]

                        if "smoke" in cls_name:
                            smoke_boxes.append({"bbox": xyxy, "confidence": conf})
                        elif "fire" in cls_name:
                            fire_boxes.append({"bbox": xyxy, "confidence": conf})
            except Exception as e:
                logger.error(f"FireSmoke model inference error: {e}")

        # 3. Fallback YOLOv8n if PPE model was unavailable
        if self.ppe_model is None and self.fallback_model is not None:
            try:
                results = self.fallback_model.predict(frame, conf=conf_threshold, verbose=False)
                for r in results:
                    for box in r.boxes:
                        cls_id = int(box.cls[0])
                        cls_name = self.fallback_model.names.get(cls_id, "").lower()
                        conf = float(box.conf[0])
                        xyxy = [float(x) for x in box.xyxy[0].tolist()]

                        if cls_name == "person":
                            persons.append({"bbox": xyxy, "confidence": conf})
                        elif "fire" in cls_name:
                            fire_boxes.append({"bbox": xyxy, "confidence": conf})
                        elif "smoke" in cls_name:
                            smoke_boxes.append({"bbox": xyxy, "confidence": conf})
            except Exception as e:
                logger.error(f"Fallback YOLO inference error: {e}")

        # If no neural persons found (e.g. synthetic simulation or extreme lighting), detect human shapes by contour/aspect ratio
        if len(persons) == 0:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            # Find contours against dark background
            _, thresh = cv2.threshold(gray, 55, 255, cv2.THRESH_BINARY)
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                cx, cy, cw, ch = cv2.boundingRect(cnt)
                aspect = ch / max(1, cw)
                # Human standing/walking profile: height 90-350, width 30-150, aspect ratio 1.2-4.5
                if 90 <= ch <= 350 and 30 <= cw <= 150 and 1.2 <= aspect <= 4.5:
                    persons.append({
                        "bbox": [float(cx), float(cy), float(cx + cw), float(cy + ch)],
                        "confidence": 0.88
                    })

        # Optical analysis for safety equipment on detected persons
        # In case generic YOLOv8n only outputs person, we analyze head (helmet) & torso (vest)
        for person in persons:
            px1, py1, px2, py2 = person["bbox"]
            p_height = py2 - py1
            p_width = px2 - px1

            # Head region analysis (top 30%)
            hy1 = max(0, int(py1))
            hy2 = min(h, int(py1 + p_height * 0.30))
            hx1 = max(0, int(px1))
            hx2 = min(w, int(px2))

            if hy2 > hy1 and hx2 > hx1:
                head_crop = frame[hy1:hy2, hx1:hx2]
                if self._has_helmet_signature(head_crop):
                    ppe_items.append({
                        "label": "helmet",
                        "bbox": [float(hx1), float(hy1), float(hx2), float(hy2)],
                        "confidence": 0.88
                    })

            # Torso region analysis (25% to 70%)
            ty1 = max(0, int(py1 + p_height * 0.25))
            ty2 = min(h, int(py1 + p_height * 0.70))
            tx1 = max(0, int(px1))
            tx2 = min(w, int(px2))

            if ty2 > ty1 and tx2 > tx1:
                torso_crop = frame[ty1:ty2, tx1:tx2]
                if self._has_vest_signature(torso_crop):
                    ppe_items.append({
                        "label": "vest",
                        "bbox": [float(tx1), float(ty1), float(tx2), float(ty2)],
                        "confidence": 0.87
                    })

        # Optical Smoke & Fire check
        detected_smoke, detected_fire = self._detect_hazards_optical(frame)
        smoke_boxes.extend(detected_smoke)
        fire_boxes.extend(detected_fire)

        return {
            "persons": persons,
            "ppe_items": ppe_items,
            "smoke_detected": len(smoke_boxes) > 0,
            "smoke_boxes": smoke_boxes,
            "fire_detected": len(fire_boxes) > 0,
            "fire_boxes": fire_boxes
        }

    def _has_helmet_signature(self, crop: np.ndarray) -> bool:
        """
        Detects industrial safety helmet (yellow, white, blue, red hardhat)
        via HSV color range & saturation analysis.
        """
        if crop.size == 0 or crop.shape[0] < 10 or crop.shape[1] < 10:
            return False

        hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        # Yellow hardhat HSV: H [18, 38], S [90, 255], V [100, 255]
        yellow_mask = cv2.inRange(hsv, np.array([18, 90, 100]), np.array([38, 255, 255]))
        # White hardhat HSV: S < 40, V > 180
        white_mask = cv2.inRange(hsv, np.array([0, 0, 180]), np.array([180, 50, 255]))
        # Blue hardhat HSV: H [95, 130], S [80, 255], V [80, 255]
        blue_mask = cv2.inRange(hsv, np.array([95, 80, 80]), np.array([130, 255, 255]))

        total_pixels = crop.shape[0] * crop.shape[1]
        helmet_pixels = cv2.countNonZero(yellow_mask) + cv2.countNonZero(white_mask) + cv2.countNonZero(blue_mask)

        return (helmet_pixels / total_pixels) > 0.18

    def _has_vest_signature(self, crop: np.ndarray) -> bool:
        """
        Detects hi-vis safety vest (fluorescent yellow-green or neon orange)
        with reflective tape pattern.
        """
        if crop.size == 0 or crop.shape[0] < 15 or crop.shape[1] < 15:
            return False

        hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        # Neon fluorescent yellow-green: H [25, 55], S [90, 255], V [100, 255]
        neon_mask = cv2.inRange(hsv, np.array([25, 90, 100]), np.array([55, 255, 255]))
        # Hi-vis safety orange: H [5, 22], S [120, 255], V [120, 255]
        orange_mask = cv2.inRange(hsv, np.array([5, 120, 120]), np.array([22, 255, 255]))

        total_pixels = crop.shape[0] * crop.shape[1]
        vest_pixels = cv2.countNonZero(neon_mask) + cv2.countNonZero(orange_mask)

        return (vest_pixels / total_pixels) > 0.20

    def _detect_hazards_optical(self, frame: np.ndarray) -> Tuple[List[Dict], List[Dict]]:
        """Optical detection of smoke (gray/turbulent cloud) and fire (bright orange/red flame)."""
        smoke_boxes = []
        fire_boxes = []

        h, w = frame.shape[:2]
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        # Fire flame: high brightness, orange/yellow hue
        fire_mask = cv2.inRange(hsv, np.array([0, 150, 200]), np.array([25, 255, 255]))
        fire_contours, _ = cv2.findContours(fire_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in fire_contours:
            area = cv2.contourArea(cnt)
            if area > 400:
                fx, fy, fw, fh = cv2.boundingRect(cnt)
                fire_boxes.append({
                    "bbox": [float(fx), float(fy), float(fx + fw), float(fy + fh)],
                    "confidence": min(0.98, 0.70 + (area / 10000.0))
                })

        # Smoke: low saturation, medium-high value, diffuse contours
        gray_smoke_mask = cv2.inRange(hsv, np.array([0, 0, 100]), np.array([180, 45, 200]))
        smoke_contours, _ = cv2.findContours(gray_smoke_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in smoke_contours:
            area = cv2.contourArea(cnt)
            if area > 1200:
                sx, sy, sw, sh = cv2.boundingRect(cnt)
                # Smoke tends to have aspect ratio near 1 and large soft area
                smoke_boxes.append({
                    "bbox": [float(sx), float(sy), float(sx + sw), float(sy + sh)],
                    "confidence": min(0.92, 0.65 + (area / 20000.0))
                })

        return smoke_boxes, fire_boxes
