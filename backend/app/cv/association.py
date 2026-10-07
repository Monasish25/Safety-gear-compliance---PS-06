"""
app.cv.association
------------------
PPE association engine: maps detected PPE items to person bounding boxes
using anatomical sub-regions (head, torso, lower-body, hands).

Box format throughout: [x1, y1, x2, y2] in pixel coordinates.
"""
from __future__ import annotations

from typing import Any


# ---------------------------------------------------------------------------
# Public helper
# ---------------------------------------------------------------------------

def calculate_box_overlap(box_a: list[float], box_b: list[float]) -> float:
    """
    Return the Intersection-over-Union (IoU) of two axis-aligned boxes.

    Parameters
    ----------
    box_a, box_b : [x1, y1, x2, y2]

    Returns
    -------
    float in [0, 1]
    """
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h

    if inter_area == 0:
        return 0.0

    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union_area = area_a + area_b - inter_area

    return inter_area / union_area if union_area > 0 else 0.0


# ---------------------------------------------------------------------------
# PPEAssociationEngine
# ---------------------------------------------------------------------------

# Minimum IoU threshold to count a PPE item as "overlapping" a sub-region
_OVERLAP_THRESHOLD = 0.10

# Anatomical region fractions of person height
_HEAD_TOP_FRAC    = 0.0   # from top of bbox
_HEAD_BOTTOM_FRAC = 0.30  # top 30 % → head/helmet zone
_TORSO_TOP_FRAC   = 0.25  # 25 % from top  → torso start
_TORSO_BOTTOM_FRAC = 0.70 # 70 % from top  → torso end
_HANDS_TOP_FRAC   = 0.55
_HANDS_BOTTOM_FRAC = 0.85


class PPEAssociationEngine:
    """
    Assess PPE compliance for a single tracked person.

    Usage::

        engine = PPEAssociationEngine()
        regions = engine.get_person_regions([x1, y1, x2, y2])
        result  = engine.assess_person_ppe(person_box, detected_ppe)
    """

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_person_regions(self, person_box: list[float]) -> dict[str, list[int]]:
        """
        Split a person bounding box into anatomical sub-regions.

        Returns a dict with keys ``head``, ``torso``, ``lower_body``, ``hands``.
        Each value is [x1, y1, x2, y2] (integer pixel coords).
        """
        x1, y1, x2, y2 = person_box
        h = y2 - y1

        def _region(top_frac: float, bot_frac: float) -> list[int]:
            return [
                int(x1),
                int(y1 + h * top_frac),
                int(x2),
                int(y1 + h * bot_frac),
            ]

        return {
            "head":       _region(_HEAD_TOP_FRAC,    _HEAD_BOTTOM_FRAC),
            "torso":      _region(_TORSO_TOP_FRAC,   _TORSO_BOTTOM_FRAC),
            "lower_body": _region(_TORSO_BOTTOM_FRAC, 1.0),
            "hands":      _region(_HANDS_TOP_FRAC,   _HANDS_BOTTOM_FRAC),
        }

    def assess_person_ppe(
        self,
        person_box: list[float],
        detected_ppe: list[dict[str, Any]],
    ) -> dict[str, str]:
        """
        Determine PPE state for a person given a list of detected PPE items.

        Parameters
        ----------
        person_box   : [x1, y1, x2, y2]
        detected_ppe : list of dicts with keys ``label``, ``bbox``, ``confidence``

        Returns
        -------
        dict with keys:
            ``helmet_state``    – "PRESENT" | "MISSING"
            ``vest_state``      – "PRESENT" | "MISSING"
            ``gloves_state``    – "PRESENT" | "MISSING"
            ``mask_state``      – "PRESENT" | "MISSING"
            ``harness_state``   – "PRESENT" | "MISSING"
        """
        regions = self.get_person_regions(person_box)

        helmet_present  = False
        vest_present    = False
        gloves_present  = False
        mask_present    = False
        harness_present = False

        for item in detected_ppe:
            label = item.get("label", "").lower()
            bbox  = item.get("bbox", [])
            if not bbox or len(bbox) != 4:
                continue

            if "helmet" in label or "hard-hat" in label or "hardhat" in label:
                if calculate_box_overlap(bbox, regions["head"]) >= _OVERLAP_THRESHOLD:
                    helmet_present = True

            if "vest" in label or "hi-vis" in label or "hivis" in label or "safety-vest" in label:
                if calculate_box_overlap(bbox, regions["torso"]) >= _OVERLAP_THRESHOLD:
                    vest_present = True

            if "glove" in label:
                if calculate_box_overlap(bbox, regions["hands"]) >= _OVERLAP_THRESHOLD:
                    gloves_present = True

            if "mask" in label or "respirator" in label:
                if calculate_box_overlap(bbox, regions["head"]) >= _OVERLAP_THRESHOLD:
                    mask_present = True

            if "harness" in label:
                if calculate_box_overlap(bbox, regions["torso"]) >= _OVERLAP_THRESHOLD:
                    harness_present = True

        def _state(present: bool) -> str:
            return "PRESENT" if present else "MISSING"

        return {
            "helmet_state":  _state(helmet_present),
            "vest_state":    _state(vest_present),
            "gloves_state":  _state(gloves_present),
            "mask_state":    _state(mask_present),
            "harness_state": _state(harness_present),
        }
