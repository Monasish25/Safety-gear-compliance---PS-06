import os
import cv2
import time
import asyncio
import logging
import threading
from typing import Dict, Any

from app.core.config import settings
from app.cv.pipeline import SafetyPipeline
from app.api.ws import manager

logger = logging.getLogger("safegear.rtsp_worker")

# Force OpenCV FFmpeg to use TCP for RTSP to avoid UDP smearing/packet loss on production networks
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

class FrameReaderThread(threading.Thread):
    """
    Dedicated thread to aggressively pull frames from the RTSP stream.
    OpenCV's internal buffer will queue frames if we don't read them fast enough,
    causing massive "real-time" latency. This thread constantly empties the buffer.
    """
    def __init__(self, stream_url: str):
        super().__init__(daemon=True)
        self.stream_url = stream_url
        self.cap = cv2.VideoCapture(self.stream_url, cv2.CAP_FFMPEG)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self.latest_frame = None
        self.ret = False
        self.stop_event = threading.Event()
        self.lock = threading.Lock()

    def run(self):
        while not self.stop_event.is_set():
            if self.cap.isOpened():
                # Grab the absolute latest frame immediately
                ret, frame = self.cap.read()
                with self.lock:
                    self.ret = ret
                    self.latest_frame = frame.copy() if ret else None
            else:
                # Connection dropped, attempt auto-reconnect
                logger.warning(f"Connection lost to {self.stream_url}. Reconnecting...")
                time.sleep(2.0)
                self.cap = cv2.VideoCapture(self.stream_url, cv2.CAP_FFMPEG)
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                
        if self.cap:
            self.cap.release()

    def get_latest_frame(self):
        with self.lock:
            return self.ret, self.latest_frame

    def stop(self):
        self.stop_event.set()


class RTSPManager:
    """
    Manages active Background Video Ingestion workers inside the FastAPI application.
    """
    def __init__(self):
        # Maps camera_id -> worker threads and control events
        self.active_streams: Dict[str, Dict[str, Any]] = {}
        self.lock = threading.Lock()

    def start_stream(self, camera_id: str, stream_url: str) -> tuple[bool, str]:
        with self.lock:
            if camera_id in self.active_streams:
                return False, f"Camera {camera_id} is already streaming."

            stop_event = threading.Event()
            
            # Capture the current running async event loop to dispatch WS telemetry
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                return False, "Async event loop is not running. Cannot start worker."
            
            # Start inference worker thread
            thread = threading.Thread(
                target=self._inference_worker,
                args=(camera_id, stream_url, stop_event, loop),
                daemon=True,
                name=f"InferenceWorker-{camera_id}"
            )
            
            self.active_streams[camera_id] = {
                "thread": thread,
                "stop_event": stop_event,
                "url": stream_url,
                "start_time": time.time()
            }
            thread.start()
            return True, f"Started RTSP ingestion worker for {camera_id}."

    def stop_stream(self, camera_id: str) -> tuple[bool, str]:
        with self.lock:
            if camera_id not in self.active_streams:
                return False, f"Camera {camera_id} is not currently streaming."
            
            self.active_streams[camera_id]["stop_event"].set()
            # Remove from dict, thread will terminate natively based on stop_event
            del self.active_streams[camera_id]
            return True, f"Sent stop signal to RTSP ingestion worker for {camera_id}."
            
    def get_status(self) -> Dict[str, Any]:
        with self.lock:
            return {
                cam_id: {
                    "url": data["url"],
                    "uptime_seconds": round(time.time() - data["start_time"], 2)
                }
                for cam_id, data in self.active_streams.items()
            }

    def _inference_worker(self, camera_id: str, stream_url: str, stop_event: threading.Event, loop: asyncio.AbstractEventLoop):
        logger.info(f"Starting Inference Worker for camera {camera_id} reading from {stream_url}")
        
        # 1. Initialize dedicated frame reader (Latency protection)
        reader = FrameReaderThread(stream_url)
        reader.start()

        # 2. Initialize vision pipeline
        pipeline = SafetyPipeline(camera_id=camera_id)
        
        # 3. Thread-safe WebSocket Dispatch Callbacks
        def sync_alert_callback(alert_payload: dict):
            asyncio.run_coroutine_threadsafe(
                manager.broadcast_alert({
                    "type": "NEW_ALERT",
                    "alert": alert_payload
                }),
                loop
            )

        def sync_frame_callback(telemetry_payload: dict):
            asyncio.run_coroutine_threadsafe(
                manager.broadcast_telemetry(telemetry_payload),
                loop
            )

        frame_idx = 0
        fps_target = getattr(settings, 'INFERENCE_FPS', 5)
        frame_interval = 1.0 / fps_target
        
        # Wait slightly for the reader to capture the first frame
        time.sleep(1.0)
        
        try:
            while not stop_event.is_set():
                start_time = time.time()
                
                # Fetch latest frame instantly
                ret, frame = reader.get_latest_frame()
                
                if not ret or frame is None:
                    time.sleep(0.1)
                    continue

                # Execute full AI Pipeline (YOLO + Tracking + Rules)
                pipeline.process_frame(
                    frame=frame,
                    timestamp=time.time(),
                    frame_idx=frame_idx,
                    persist_db=True, # Persist detections and alerts to Postgres
                    on_alert_callback=sync_alert_callback,
                    on_frame_callback=sync_frame_callback
                )
                
                frame_idx += 1
                
                # Enforce target FPS rate limit to prevent GPU/CPU thrashing
                elapsed = time.time() - start_time
                sleep_time = frame_interval - elapsed
                if sleep_time > 0:
                    time.sleep(sleep_time)
                    
        finally:
            logger.info(f"Inference Worker for {camera_id} stopping...")
            reader.stop()
            reader.join(timeout=2.0)

# Global singleton instance
rtsp_manager = RTSPManager()
