"""
Standalone YOLOv8 Inference Worker
----------------------------------
This script runs in a completely separate process from the main FastAPI server.
It connects to the database, reads active RTSP cameras, pulls frames directly, 
and executes the heavy YOLOv8 SafetyPipeline.

It sends real-time WebSockets telemetry back to FastAPI via a fast internal HTTP webhook.
"""

import os
import cv2
import time
import requests
import logging
import threading

from app.core.config import settings
from app.core.database import SessionLocal
from app.models import schema
from app.cv.pipeline import SafetyPipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("inference_worker")

# Force OpenCV FFmpeg to use TCP for RTSP to prevent UDP packet drops
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

# The endpoint where FastAPI listens for our WebSocket broadcasts
FASTAPI_WEBHOOK_URL = f"http://127.0.0.1:8000{settings.API_V1_STR}/internal/broadcast"


class FrameReaderThread(threading.Thread):
    """
    Dedicated thread to aggressively pull frames from the RTSP stream.
    Prevents OpenCV internal buffer from filling up and introducing latency.
    """
    def __init__(self, stream_url: str):
        super().__init__(daemon=True)
        self.stream_url = stream_url
        if self.stream_url == 0:
            # Use DirectShow or ANY for local webcam on Windows
            self.cap = cv2.VideoCapture(0, cv2.CAP_ANY)
        else:
            self.cap = cv2.VideoCapture(self.stream_url, cv2.CAP_FFMPEG)
            
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self.latest_frame = None
        self.ret = False
        self.stop_event = threading.Event()
        self.lock = threading.Lock()

    def run(self):
        while not self.stop_event.is_set():
            if self.cap.isOpened():
                ret, frame = self.cap.read()
                with self.lock:
                    self.ret = ret
                    self.latest_frame = frame.copy() if ret else None
            else:
                logger.warning(f"Connection lost to {self.stream_url}. Reconnecting...")
                time.sleep(2.0)
                if self.stream_url == 0:
                    self.cap = cv2.VideoCapture(0, cv2.CAP_ANY)
                else:
                    self.cap = cv2.VideoCapture(self.stream_url, cv2.CAP_FFMPEG)
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                
        if self.cap:
            self.cap.release()

    def get_latest_frame(self):
        with self.lock:
            return self.ret, self.latest_frame

    def stop(self):
        self.stop_event.set()


def run_camera_worker(camera_id: str, stream_url: str):
    logger.info(f"Starting Standalone Inference Worker for {camera_id} at {stream_url}")
    
    reader = FrameReaderThread(stream_url)
    reader.start()

    pipeline = SafetyPipeline(camera_id=camera_id)
    
    def on_alert_sync(alert_payload: dict):
        try:
            # We don't have websocket access directly, so we push to FastAPI internal webhook
            requests.post(FASTAPI_WEBHOOK_URL, json={
                "type": "NEW_ALERT",
                "alert": alert_payload
            }, timeout=1.0)
        except Exception as e:
            logger.error(f"Failed to push alert to FastAPI: {e}")

    def on_frame_sync(telemetry_payload: dict):
        try:
            requests.post(FASTAPI_WEBHOOK_URL, json=telemetry_payload, timeout=0.5)
        except Exception as e:
            pass # Ignore dropped telemetry frames to keep speed

    frame_idx = 0
    fps_target = getattr(settings, 'INFERENCE_FPS', 5)
    frame_interval = 1.0 / fps_target
    
    time.sleep(1.0) # Wait for first frame
    
    try:
        while True:
            start_time = time.time()
            ret, frame = reader.get_latest_frame()
            
            if not ret or frame is None:
                time.sleep(0.1)
                continue

            # Heavy YOLO Inference is executed in this standalone process!
            pipeline.process_frame(
                frame=frame,
                timestamp=time.time(),
                frame_idx=frame_idx,
                persist_db=True,
                on_alert_callback=on_alert_sync,
                on_frame_callback=on_frame_sync
            )
            
            frame_idx += 1
            
            elapsed = time.time() - start_time
            sleep_time = frame_interval - elapsed
            if sleep_time > 0:
                time.sleep(sleep_time)
                
    except KeyboardInterrupt:
        logger.info(f"Stopping worker for {camera_id}")
    finally:
        reader.stop()
        reader.join(timeout=2.0)


def main():
    logger.info("Initializing Standalone YOLOv8 Inference Engine...")
    db = SessionLocal()
    
    # Auto-provision a mock camera if none exist
    cameras = db.query(schema.Camera).all()
    if not cameras:
        mock_cam = schema.Camera(
            camera_id="CAM_01",
            name="Main Entrance Feed",
            location_label="Gate 1",
            stream_url="rtsp://mock-camera.local:8554/cam/CAM_01",
            is_active=True
        )
        db.add(mock_cam)
        db.commit()
        cameras = [mock_cam]
        
    db.close()
    
    active_cameras = [c for c in cameras if c.is_active]
    if not active_cameras:
        logger.error("No active cameras found in database. Exiting.")
        return
        
    # For demonstration, we run the first active camera
    target_camera = active_cameras[0]
    # Use 0 (default laptop webcam) for local testing if it's the mock RTSP URL
    stream_url = target_camera.stream_url
    if not stream_url or "mock-camera.local" in stream_url:
        logger.info("No real RTSP URL found. Falling back to local webcam (0) for testing!")
        stream_url = 0
        
    run_camera_worker(target_camera.camera_id, stream_url)


if __name__ == "__main__":
    main()
