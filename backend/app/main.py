"""
SafeGear Compliance - FastAPI backend
CORS + WebSocket /ws/detections + REST API v1
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.database import init_db
from app.api.v1.routes import router as v1_router
from app.detector import CCTV_CAMERAS, inference_stream

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_STORAGE_DIR = _BACKEND_DIR / "storage"

app = FastAPI(title="SafeGear Compliance API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for demo videos and local output recordings
if _STORAGE_DIR.exists():
    app.mount("/storage", StaticFiles(directory=str(_STORAGE_DIR)), name="storage")

# Include REST API v1
app.include_router(v1_router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
async def health():
    return {"status": "HEALTHY"}


@app.get("/api/cameras")
async def list_cameras():
    """Return the CCTV camera catalogue so the frontend can populate feed selectors."""
    return [
        {
            "id":        cam["id"],
            "label":     cam["label"],
            "zone":      cam["zone"],
            "available": cam["video"].exists(),
            "video_url": f"/storage/demo_video/{cam['video'].name}",
        }
        for cam in CCTV_CAMERAS
    ]


@app.websocket("/ws/detections")
async def ws_detections(
    websocket: WebSocket,
    cam: Optional[str] = Query(default=None, description="CCTV camera ID, e.g. CAM-01, CAM-02, 2X2, or omit"),
):
    """
    WebSocket endpoint for live model detections.

    Query params:
      ?cam=CAM-01   Stream a specific CCTV demo feed (CAM-01 .. CAM-04).
      ?cam=2X2      Stream a composed 2x2 grid of all 4 CCTV feeds simultaneously.
      Omit          Defaults to CAM-01.

    Sends JSON: { frame, detections, fps, source, model, cam_label, output_file }
    """
    await websocket.accept()

    # Resolve camera source
    selected_source = "CAM-01"
    if cam:
        cam_upper = cam.upper().strip()
        if cam_upper in ("2X2", "ALL", "QUAD"):
            selected_source = "2X2"
        elif cam_upper in ("ROTATE", "AUTO"):
            selected_source = "rotate"
        else:
            match = next((c for c in CCTV_CAMERAS if c["id"].upper() == cam_upper), None)
            if match and match["video"].exists():
                selected_source = match["id"]
            else:
                await websocket.send_text(json.dumps({"error": f"Camera '{cam}' not found or video file missing."}))
                await websocket.close()
                return

    try:
        async for payload in inference_stream(source=selected_source, target_fps=8):
            await websocket.send_text(json.dumps(payload))
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_text(json.dumps({"error": str(exc)}))
        except Exception:
            pass
