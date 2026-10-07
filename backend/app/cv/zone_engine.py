"""
app.cv.zone_engine
------------------
Polygon-based zone assignment for detected persons.

A zone config looks like:
    {
        "id": "ZONE_WELDING",
        "name": "Welding Bay",
        "risk_level": "High",
        "polygon": {"points": [[x0,y0], [x1,y1], ...]}
    }
"""
from __future__ import annotations

from typing import Any


# ---------------------------------------------------------------------------
# Public helper
# ---------------------------------------------------------------------------

def point_in_polygon(x: float, y: float, polygon: list[list[float]]) -> bool:
    """
    Ray-casting algorithm to test whether point (x, y) is inside *polygon*.

    Parameters
    ----------
    x, y    : float – coordinates of the point to test.
    polygon : list of [px, py] pairs – vertices of the polygon (closed or open).

    Returns
    -------
    True if the point is strictly inside (or on the boundary of) the polygon.
    """
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


# ---------------------------------------------------------------------------
# ZoneEngine
# ---------------------------------------------------------------------------

class ZoneEngine:
    """
    Maps bounding boxes to zone configs using polygon containment.

    Usage::

        engine = ZoneEngine(zones)          # list of zone dicts (see above)
        zone = engine.find_zone_for_bbox([x1, y1, x2, y2])
    """

    def __init__(self, zones: list[dict[str, Any]]) -> None:
        self._zones = zones

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def find_zone_for_bbox(self, bbox: list[float]) -> dict[str, Any] | None:
        """
        Return the first zone whose polygon contains the *centre* of *bbox*.

        bbox format: [x1, y1, x2, y2] in pixel coordinates.
        Returns the matching zone dict or None.
        """
        cx = (bbox[0] + bbox[2]) / 2.0
        cy = (bbox[1] + bbox[3]) / 2.0
        for zone in self._zones:
            points = zone.get("polygon", {}).get("points", [])
            if points and point_in_polygon(cx, cy, points):
                return zone
        return None

    def get_zone_by_id(self, zone_id: str) -> dict[str, Any] | None:
        """Return a zone dict by its ``id`` field."""
        for zone in self._zones:
            if zone.get("id") == zone_id:
                return zone
        return None
