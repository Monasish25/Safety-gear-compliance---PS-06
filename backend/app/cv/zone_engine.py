from typing import List, Dict, Optional, Tuple

def point_in_polygon(x: float, y: float, polygon: List[List[float]]) -> bool:
    """Ray casting algorithm for point-in-polygon test."""
    n = len(polygon)
    inside = False
    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

class ZoneEngine:
    def __init__(self, zones: List[Dict]):
        """
        zones: List of zone definitions, e.g.:
        [
            {
                "id": "ZONE_ASSEMBLY",
                "name": "Assembly Zone",
                "risk_level": "Medium",
                "polygon": {
                    "points": [[40, 60], [600, 60], [600, 680], [40, 680]],
                    "x_min": 40, "y_min": 60, "x_max": 600, "y_max": 680
                }
            }
        ]
        """
        self.zones = zones

    def update_zones(self, zones: List[Dict]):
        self.zones = zones

    def get_bbox_center(self, bbox: List[float]) -> Tuple[float, float]:
        """Calculates center [cx, cy] of [x1, y1, x2, y2]."""
        cx = (bbox[0] + bbox[2]) / 2.0
        cy = (bbox[1] + bbox[3]) / 2.0
        return cx, cy

    def find_zone_for_bbox(self, bbox: List[float], frame_width: int = 1280, frame_height: int = 720) -> Optional[Dict]:
        """
        Maps person bbox center to zone polygon/rect.
        Returns matching zone dict or None.
        """
        if not self.zones:
            return None

        cx, cy = self.get_bbox_center(bbox)

        for zone in self.zones:
            poly_data = zone.get("polygon", {})
            if isinstance(poly_data, list):
                # Simple list of points: [[x1, y1], [x2, y2], ...]
                points = poly_data
                if len(points) >= 3 and point_in_polygon(cx, cy, points):
                    return zone

            elif isinstance(poly_data, dict):
                points = poly_data.get("points")
                if points and len(points) >= 3:
                    eval_points = points
                    if all(pt[0] <= 1.0 and pt[1] <= 1.0 for pt in points):
                        eval_points = [[pt[0] * frame_width, pt[1] * frame_height] for pt in points]
                    
                    if point_in_polygon(cx, cy, eval_points):
                        return zone

                if "x_min" in poly_data and "x_max" in poly_data:
                    x_min = poly_data["x_min"]
                    y_min = poly_data["y_min"]
                    x_max = poly_data["x_max"]
                    y_max = poly_data["y_max"]
                    
                    if x_max <= 1.0 and y_max <= 1.0:
                        x_min *= frame_width
                        x_max *= frame_width
                        y_min *= frame_height
                        y_max *= frame_height

                    if x_min <= cx <= x_max and y_min <= cy <= y_max:
                        return zone

        # Fallback to first configured zone if bbox center is within default frame
        return self.zones[0] if self.zones else None

    # Alias for method compatibility
    get_zone_for_person = find_zone_for_bbox
