"""
Inference engine for SafeGear Compliance.
Dual-model pipeline:
  • PPE.pt      – detects personal protective equipment (helmets, vests, boots, gloves, goggles, harness)
  • FireSmoke.pt – detects fire and smoke hazards

Both models run on every frame; detections are merged before annotation and streaming.

CCTV Feed Sources (from backend/storage/demo_video/):
  CAM-01  13751987_3840_2160_50fps.mp4   (Welding Bay - Sector B4)
  CAM-02  14990691_2160_3840_30fps.mp4   (Assembly Line - Sector A)
  CAM-03  19832492-hd_1920_1080_25fps.mp4  (Loading Dock - South Gate)
  CAM-04  42923-434300950.mp4            (Perimeter - East Fence)
  2X2     Quad-split composed feed of all 4 cameras simultaneously

All frames pass through OpenCV -> PPE.pt + FireSmoke.pt -> merged annotated output is saved
locally to backend/storage/output_recordings/ and streamed over WebSocket.
"""
from __future__ import annotations

import asyncio
import base64
import datetime
import os
import threading
import time
from pathlib import Path
from typing import AsyncIterator

import cv2
import numpy as np
from ultralytics import YOLO

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_BACKEND_DIR         = Path(__file__).resolve().parent.parent
_PPE_MODEL_PATH      = _BACKEND_DIR / "models" / "PPE.pt"
_FIRESMOKE_MODEL_PATH = _BACKEND_DIR / "models" / "FireSmoke.pt"
_DEMO_VIDEO_DIR      = _BACKEND_DIR / "storage" / "demo_video"
_OUTPUT_DIR          = _BACKEND_DIR / "storage" / "output_recordings"

_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# CCTV Camera Catalogue (Mapped to all 4 demo videos)
# ---------------------------------------------------------------------------
CCTV_CAMERAS: list[dict] = [
    {
        "id":      "CAM-01",
        "label":   "Welding Bay - Sector B4",
        "zone":    "ZONE_WELDING",
        "video":   _DEMO_VIDEO_DIR / "13751987_3840_2160_50fps.mp4",
        "infer_w": 720,
    },
    {
        "id":      "CAM-02",
        "label":   "Assembly Line - Sector A",
        "zone":    "ZONE_ASSEMBLY",
        "video":   _DEMO_VIDEO_DIR / "14990691_2160_3840_30fps.mp4",
        "infer_w": 540,
    },
    {
        "id":      "CAM-03",
        "label":   "Loading Dock - South Gate",
        "zone":    "ZONE_LOADING",
        "video":   _DEMO_VIDEO_DIR / "19832492-hd_1920_1080_25fps.mp4",
        "infer_w": 720,
    },
    {
        "id":      "CAM-04",
        "label":   "Perimeter - East Fence",
        "zone":    "ZONE_PERIMETER",
        "video":   _DEMO_VIDEO_DIR / "42923-434300950.mp4",
        "infer_w": 720,
    },
]

# Quick lookup by ID (CAM-01 .. CAM-04)
CCTV_MAP: dict[str, dict] = {c["id"]: c for c in CCTV_CAMERAS}

# ---------------------------------------------------------------------------
# PPE Class Taxonomy
# ---------------------------------------------------------------------------
_CRITICAL_CLASSES = {
    "no_helmet", "no-helmet", "no_vest", "no-vest",
    "no_boots",  "no-boots",  "no_harness", "no-harness",
    "fire",      "smoke",
}
_WARNING_CLASSES = {
    "no_gloves", "no-gloves", "no_goggle", "no-goggle",
    "helmet-off", "ppe-violation", "none",
}
_COMPLIANT_CLASSES = {
    "helmet", "vest", "gloves", "boots", "goggles", "harness",
}

# ---------------------------------------------------------------------------
# Model Singletons  (PPE.pt + FireSmoke.pt)
# ---------------------------------------------------------------------------
_CACHED_PPE_MODEL:       YOLO | None = None
_CACHED_FIRESMOKE_MODEL: YOLO | None = None
_MODEL_LOCK = threading.Lock()


def get_model() -> YOLO:
    """Return the PPE model (primary / backward-compat accessor)."""
    return get_ppe_model()


def get_ppe_model() -> YOLO:
    global _CACHED_PPE_MODEL
    with _MODEL_LOCK:
        if _CACHED_PPE_MODEL is None:
            if not _PPE_MODEL_PATH.exists():
                raise FileNotFoundError(f"[SafeGear] PPE model not found at {_PPE_MODEL_PATH}")
            print(f"[SafeGear] Loading PPE model: {_PPE_MODEL_PATH}")
            _CACHED_PPE_MODEL = YOLO(str(_PPE_MODEL_PATH))
            print(f"[SafeGear] PPE model classes: {_CACHED_PPE_MODEL.names}")
        return _CACHED_PPE_MODEL


def get_firesmoke_model() -> YOLO:
    global _CACHED_FIRESMOKE_MODEL
    with _MODEL_LOCK:
        if _CACHED_FIRESMOKE_MODEL is None:
            if not _FIRESMOKE_MODEL_PATH.exists():
                raise FileNotFoundError(f"[SafeGear] FireSmoke model not found at {_FIRESMOKE_MODEL_PATH}")
            print(f"[SafeGear] Loading FireSmoke model: {_FIRESMOKE_MODEL_PATH}")
            _CACHED_FIRESMOKE_MODEL = YOLO(str(_FIRESMOKE_MODEL_PATH))
            print(f"[SafeGear] FireSmoke model classes: {_CACHED_FIRESMOKE_MODEL.names}")
        return _CACHED_FIRESMOKE_MODEL


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _classify(label: str) -> str:
    lc = label.lower().replace(" ", "_")
    if lc in _CRITICAL_CLASSES:
        return "critical"
    if lc in _WARNING_CLASSES:
        return "warning"
    if lc in ("person", "worker"):
        return "person"
    if lc in _COMPLIANT_CLASSES:
        return "resolved"
    if "no" in lc or "miss" in lc or "fire" in lc or "smoke" in lc:
        return "critical"
    return "resolved"


def _encode_frame(frame: np.ndarray, quality: int = 70) -> str:
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not ok:
        return ""
    return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode()


def decode_frame(data_url_or_b64: str) -> np.ndarray | None:
    try:
        if "," in data_url_or_b64:
            data_url_or_b64 = data_url_or_b64.split(",", 1)[1]
        raw_bytes = base64.b64decode(data_url_or_b64)
        np_arr    = np.frombuffer(raw_bytes, np.uint8)
        return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    except Exception:
        return None


def _resize_for_inference(frame: np.ndarray, target_width: int) -> np.ndarray:
    h, w = frame.shape[:2]
    if w <= target_width:
        return frame
    scale = target_width / w
    return cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_LINEAR)


# ---------------------------------------------------------------------------
# Local recorder (saves annotated CCTV feeds to disk)
# ---------------------------------------------------------------------------
class _LocalRecorder:
    FOURCC   = cv2.VideoWriter_fourcc(*"mp4v")
    OUT_FPS  = 8
    OUT_SIZE = (960, 540)

    def __init__(self, cam_id: str) -> None:
        self._cam_id = cam_id
        self._lock   = threading.Lock()
        self._writer: cv2.VideoWriter | None = None
        self._date   = ""
        self._path: Path | None = None

    def write(self, frame: np.ndarray) -> None:
        today = datetime.date.today().isoformat()
        with self._lock:
            if self._date != today or self._writer is None:
                self._roll(today)
            resized = cv2.resize(frame, self.OUT_SIZE)
            self._writer.write(resized)

    def close(self) -> None:
        with self._lock:
            if self._writer:
                self._writer.release()
                self._writer = None

    @property
    def output_path(self) -> Path | None:
        return self._path

    def _roll(self, today: str) -> None:
        if self._writer:
            self._writer.release()
        self._date   = today
        self._path   = _OUTPUT_DIR / f"{self._cam_id}_{today}.mp4"
        self._writer = cv2.VideoWriter(str(self._path), self.FOURCC, self.OUT_FPS, self.OUT_SIZE)
        print(f"[SafeGear][Recorder] {self._cam_id} recording to {self._path}")


_RECORDERS: dict[str, _LocalRecorder] = {}
_RECORDERS_LOCK = threading.Lock()


def _get_recorder(cam_id: str) -> _LocalRecorder:
    with _RECORDERS_LOCK:
        if cam_id not in _RECORDERS:
            _RECORDERS[cam_id] = _LocalRecorder(cam_id)
        return _RECORDERS[cam_id]


# ---------------------------------------------------------------------------
# Annotation and HUD
# ---------------------------------------------------------------------------
def annotate_and_extract_detections(
    frame: np.ndarray,
    results,
    model: YOLO,
) -> tuple[np.ndarray, list[dict]]:
    h, w      = frame.shape[:2]
    annotated = frame.copy()
    detections: list[dict] = []

    if results and len(results) > 0 and results[0].boxes is not None:
        for box in results[0].boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf     = float(box.conf[0])
            cls_id   = int(box.cls[0])
            label    = model.names.get(cls_id, str(cls_id))
            track_id = int(box.id[0]) if box.id is not None else 0
            kind     = _classify(label)

            bbox_norm = [x1 / w, y1 / h, x2 / w, y2 / h]
            detections.append({
                "id":         track_id,
                "label":      label,
                "confidence": round(conf, 3),
                "bbox":       [round(v, 4) for v in bbox_norm],
                "kind":       kind,
            })

            if kind == "critical":
                colour     = (50, 50, 240)    # Red (BGR)
                badge_text = f"BREACH: {label.upper()} {conf:.2f}"
            elif kind == "warning":
                colour     = (40, 180, 255)   # Amber (BGR)
                badge_text = f"WARN: {label.upper()} {conf:.2f}"
            elif kind == "person":
                colour     = (230, 180, 70)   # Cyan-blue (BGR)
                tid_str    = f"W-{track_id} " if track_id > 0 else ""
                badge_text = f"{tid_str}WORKER {conf:.2f}"
            else:
                colour     = (80, 220, 120)   # Green (BGR)
                badge_text = f"OK: {label.upper()} {conf:.2f}"

            ix1, iy1, ix2, iy2 = int(x1), int(y1), int(x2), int(y2)
            cv2.rectangle(annotated, (ix1, iy1), (ix2, iy2), colour, 2)

            (tw, th), _ = cv2.getTextSize(badge_text, cv2.FONT_HERSHEY_SIMPLEX, 0.40, 1)
            badge_y1 = max(0, iy1 - th - 6)
            badge_y2 = iy1
            cv2.rectangle(annotated, (ix1, badge_y1), (ix1 + tw + 6, badge_y2), colour, -1)
            cv2.putText(
                annotated, badge_text,
                (ix1 + 3, badge_y2 - 3),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38,
                (10, 15, 20), 1, cv2.LINE_AA,
            )

    return annotated, detections


def _draw_hud(frame: np.ndarray, cam_id: str, cam_info: dict | None) -> None:
    h, w  = frame.shape[:2]
    ts    = datetime.datetime.utcnow().strftime("%Y-%m-%d  %H:%M:%S UTC")
    label = cam_info["label"] if cam_info else cam_id
    zone  = cam_info.get("zone", "") if cam_info else ""

    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 24), (8, 12, 18), -1)
    cv2.addWeighted(overlay, 0.70, frame, 0.30, 0, frame)

    cv2.putText(frame, f"REC  {cam_id} // {label}",
                (8, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (80, 230, 130), 1, cv2.LINE_AA)
    info_str = f"PPE.pt + FireSmoke.pt  {zone}  {ts}"
    (iw, _), _ = cv2.getTextSize(info_str, cv2.FONT_HERSHEY_SIMPLEX, 0.36, 1)
    cv2.putText(frame, info_str,
                (max(w - iw - 10, 200), 16), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (170, 210, 250), 1, cv2.LINE_AA)


# ---------------------------------------------------------------------------
# Dual-model inference helper
# ---------------------------------------------------------------------------
def _run_dual_inference(frame: np.ndarray, track: bool = False) -> list[dict]:
    """
    Run PPE.pt and FireSmoke.pt on *frame* and return merged detections.
    When ``track`` is True, ByteTrack is used for both models.
    """
    ppe_model       = get_ppe_model()
    firesmoke_model = get_firesmoke_model()

    common_kwargs = dict(verbose=False, conf=0.25)
    if track:
        common_kwargs.update(persist=True, tracker="bytetrack.yaml")
        ppe_results       = ppe_model.track(frame, **common_kwargs)
        firesmoke_results = firesmoke_model.track(frame, **common_kwargs)
    else:
        ppe_results       = ppe_model(frame, **common_kwargs)
        firesmoke_results = firesmoke_model(frame, **common_kwargs)

    # Merge detections from both models onto the frame
    _, ppe_detections       = annotate_and_extract_detections(frame, ppe_results, ppe_model)
    annotated, fs_detections = annotate_and_extract_detections(frame, firesmoke_results, firesmoke_model)

    # Annotate PPE on top of the FireSmoke-annotated frame
    annotated, ppe_detections = annotate_and_extract_detections(annotated, ppe_results, ppe_model)

    return annotated, ppe_detections + fs_detections


# ---------------------------------------------------------------------------
# Single-frame inference (e.g. for photo upload or manual check)
# ---------------------------------------------------------------------------
def process_single_frame(frame: np.ndarray, model: YOLO | None = None) -> dict:
    h, w = frame.shape[:2]
    target_w = 640
    if w > target_w:
        scale = target_w / w
        frame = cv2.resize(frame, (target_w, int(h * scale)))

    annotated, detections = _run_dual_inference(frame, track=False)
    frame_b64 = _encode_frame(annotated)

    return {
        "frame":      frame_b64,
        "detections": detections,
        "model":      "PPE.pt + FireSmoke.pt",
        "fps":        8.0,
        "source":     "single_frame",
    }


# ---------------------------------------------------------------------------
# Multi-Camera CCTV Stream (Single Camera or 2X2 Quad Grid)
# ---------------------------------------------------------------------------
async def inference_stream(source: int | str = "CAM-01", target_fps: int = 8) -> AsyncIterator[dict]:
    """
    Streams live CCTV footage through OpenCV and best.pt.

    Supported sources:
      - 'CAM-01', 'CAM-02', 'CAM-03', 'CAM-04': Specific demo video feed
      - '2X2' or 'ALL': Composed 2x2 CCTV quad-grid showing all 4 cameras simultaneously
      - 0 or 'rotate': Automatically rotates through all 4 cameras every 25 seconds
    """
    loop  = asyncio.get_event_loop()
    # Pre-warm both models before streaming begins
    await loop.run_in_executor(None, get_ppe_model)
    await loop.run_in_executor(None, get_firesmoke_model)

    source_str = str(source).upper().strip()
    is_quad    = source_str in ("2X2", "ALL", "QUAD")
    is_rotate  = source_str in ("0", "ROTATE", "AUTO")

    # Available feeds
    cctv_feeds = [c for c in CCTV_CAMERAS if c["video"].exists()]
    if not cctv_feeds:
        print("[SafeGear][ERROR] No CCTV demo videos found in", _DEMO_VIDEO_DIR)
        return

    interval = 1.0 / max(1, target_fps)

    # -----------------------------------------------------------------------
    # Case A: 2X2 Quad Split View (All 4 cameras simultaneously)
    # -----------------------------------------------------------------------
    if is_quad:
        print("[SafeGear] Starting 2X2 CCTV Quad-Grid inference stream (all 4 cameras)...")
        caps: list[cv2.VideoCapture] = []
        for cam in cctv_feeds[:4]:
            c = cv2.VideoCapture(str(cam["video"]))
            caps.append(c)

        quad_info = {"label": "2X2 QUAD MATRIX - ALL 4 CAMERAS", "zone": "ALL_ZONES"}
        recorder  = _get_recorder("QUAD_2X2")

        try:
            while True:
                tick = time.monotonic()
                quad_frames: list[np.ndarray] = []

                for i, c in enumerate(caps):
                    ok, frame = await loop.run_in_executor(None, c.read)
                    if not ok:
                        c.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        ok, frame = await loop.run_in_executor(None, c.read)
                    if ok and frame is not None:
                        # Resize each tile to (480, 270)
                        tile = cv2.resize(frame, (480, 270))
                        cam_id = cctv_feeds[i]["id"]
                        cam_lbl = cctv_feeds[i]["label"].split(" - ")[0]
                        cv2.rectangle(tile, (0, 0), (220, 22), (10, 15, 20), -1)
                        cv2.putText(tile, f"{cam_id} // {cam_lbl}", (5, 15),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, (100, 240, 160), 1, cv2.LINE_AA)
                        quad_frames.append(tile)
                    else:
                        placeholder = np.zeros((270, 480, 3), dtype=np.uint8)
                        quad_frames.append(placeholder)

                # Pad to 4 tiles if needed
                while len(quad_frames) < 4:
                    quad_frames.append(np.zeros((270, 480, 3), dtype=np.uint8))

                top_row = np.hstack([quad_frames[0], quad_frames[1]])
                bot_row = np.hstack([quad_frames[2], quad_frames[3]])
                grid    = np.vstack([top_row, bot_row])

                # Run PPE.pt + FireSmoke.pt with ByteTrack on the combined grid
                annotated, detections = await loop.run_in_executor(
                    None,
                    lambda g=grid: _run_dual_inference(g, track=True),
                )
                _draw_hud(annotated, "2X2 MATRIX", quad_info)

                # Record locally
                await loop.run_in_executor(None, recorder.write, annotated)
                frame_b64 = await loop.run_in_executor(None, _encode_frame, annotated)
                elapsed   = time.monotonic() - tick

                yield {
                    "frame":       frame_b64,
                    "detections":  detections,
                    "fps":         round(1.0 / max(elapsed, 1e-6), 1),
                    "source":      "2X2",
                    "model":       "PPE.pt + FireSmoke.pt",
                    "cam_label":   quad_info["label"],
                    "output_file": str(recorder.output_path) if recorder.output_path else "",
                }

                sleep = interval - (time.monotonic() - tick)
                if sleep > 0:
                    await asyncio.sleep(sleep)
        finally:
            for c in caps:
                c.release()
            print("[SafeGear] 2X2 Quad-Grid stream closed.")
        return

    # -----------------------------------------------------------------------
    # Case B: Single Camera Feed (CAM-01 .. CAM-04, or rotating)
    # -----------------------------------------------------------------------
    # Determine initial camera
    target_cam = CCTV_MAP.get(source_str)
    if not target_cam:
        # Match by filename or fallback to CAM-01
        target_cam = next((c for c in cctv_feeds if str(c["video"]) == source_str or c["id"] == source_str), cctv_feeds[0])

    cam_index = next((i for i, c in enumerate(cctv_feeds) if c["id"] == target_cam["id"]), 0)
    current_cam = cctv_feeds[cam_index]
    cap = cv2.VideoCapture(str(current_cam["video"]))
    print(f"[SafeGear] Connected CCTV stream: {current_cam['id']} ({current_cam['label']}) -> {current_cam['video'].name}")

    cam_start = time.monotonic()
    rotate_interval = 25.0

    try:
        while True:
            tick = time.monotonic()

            # Rotate feed if in rotation mode
            if is_rotate and (tick - cam_start) >= rotate_interval:
                if cap:
                    cap.release()
                cam_index   = (cam_index + 1) % len(cctv_feeds)
                current_cam = cctv_feeds[cam_index]
                cap         = cv2.VideoCapture(str(current_cam["video"]))
                cam_start   = tick
                print(f"[SafeGear] Auto-rotated CCTV -> {current_cam['id']} ({current_cam['label']})")

            if cap is None or not cap.isOpened():
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(frame, "CCTV FEED CONNECTING...", (120, 240),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (180, 230, 255), 2, cv2.LINE_AA)
            else:
                ok, frame = await loop.run_in_executor(None, cap.read)
                if not ok:
                    # Video reached end -> loop back to frame 0
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ok, frame = await loop.run_in_executor(None, cap.read)
                    if not ok:
                        await asyncio.sleep(interval)
                        continue

            # Resize frame for optimal inference latency
            infer_w = current_cam.get("infer_w", 720)
            infer_frame = await loop.run_in_executor(None, _resize_for_inference, frame, infer_w)

            # Run PPE.pt + FireSmoke.pt with ByteTrack
            annotated, detections = await loop.run_in_executor(
                None,
                lambda f=infer_frame: _run_dual_inference(f, track=True),
            )
            _draw_hud(annotated, current_cam["id"], current_cam)

            # Record annotated frame locally
            recorder = _get_recorder(current_cam["id"])
            await loop.run_in_executor(None, recorder.write, annotated)

            frame_b64 = await loop.run_in_executor(None, _encode_frame, annotated)
            elapsed   = time.monotonic() - tick

            yield {
                "frame":       frame_b64,
                "detections":  detections,
                "fps":         round(1.0 / max(elapsed, 1e-6), 1),
                "source":      current_cam["id"],
                "model":       "PPE.pt + FireSmoke.pt",
                "cam_label":   current_cam["label"],
                "output_file": str(recorder.output_path) if recorder.output_path else "",
            }

            sleep = interval - (time.monotonic() - tick)
            if sleep > 0:
                await asyncio.sleep(sleep)
    finally:
        if cap:
            cap.release()
        print(f"[SafeGear] Stream for {current_cam['id']} closed.")
