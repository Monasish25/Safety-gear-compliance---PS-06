import os
import io
import cv2
import logging
import datetime
from pathlib import Path
from typing import Optional, Tuple
from app.core.config import settings

logger = logging.getLogger("safegear.storage")

class StorageService:
    def __init__(self):
        self.minio_client = None
        self.use_local = False
        self.bucket = settings.MINIO_BUCKET
        self.local_dir = settings.LOCAL_STORAGE_DIR / "evidence"
        self.local_dir.mkdir(parents=True, exist_ok=True)
        self._init_minio()

    def _init_minio(self):
        try:
            from minio import Minio
            client = Minio(
                settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE
            )
            # Check connection
            if not client.bucket_exists(self.bucket):
                client.make_bucket(self.bucket)
            self.minio_client = client
            logger.info(f"Connected to MinIO bucket '{self.bucket}'.")
        except Exception as e:
            logger.warning(f"MinIO unavailable ({e}). Storing evidence locally at {self.local_dir}.")
            self.use_local = True

    def save_evidence_image(
        self,
        image_bytes: bytes,
        camera_id: str,
        event_type: str,
        event_id: str,
        is_annotated: bool = True
    ) -> str:
        """
        Saves snapshot to MinIO or local storage.
        Returns relative object path: evidence/YYYY/MM/DD/{camera_id}/{event_type}/{filename}.jpg
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        date_path = now.strftime("%Y/%m/%d")
        clean_event_type = event_type.lower().replace(" ", "_")
        suffix = "annotated" if is_annotated else "raw"
        filename = f"event_{event_id}_{suffix}.jpg"
        object_path = f"evidence/{date_path}/{camera_id}/{clean_event_type}/{filename}"

        if not self.use_local and self.minio_client:
            try:
                data_stream = io.BytesIO(image_bytes)
                self.minio_client.put_object(
                    self.bucket,
                    object_path,
                    data_stream,
                    len(image_bytes),
                    content_type="image/jpeg"
                )
                return object_path
            except Exception as e:
                logger.error(f"Failed MinIO upload ({e}), falling back to local disk.")

        # Local filesystem fallback
        full_local_path = self.local_dir / object_path
        full_local_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_local_path, "wb") as f:
            f.write(image_bytes)
        return object_path

    def save_cv_frame(
        self,
        frame,
        camera_id: str,
        event_type: str,
        event_id: str,
        is_annotated: bool = True
    ) -> str:
        """Encodes OpenCV BGR frame to JPEG and saves."""
        success, encoded = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not success:
            raise ValueError("Failed to encode frame to JPEG")
        return self.save_evidence_image(
            encoded.tobytes(),
            camera_id=camera_id,
            event_type=event_type,
            event_id=event_id,
            is_annotated=is_annotated
        )

    def get_file_bytes(self, object_path: str) -> Optional[bytes]:
        """Fetch bytes from MinIO or local filesystem."""
        if not self.use_local and self.minio_client:
            try:
                response = self.minio_client.get_object(self.bucket, object_path)
                return response.read()
            except Exception:
                pass
        
        local_path = self.local_dir / object_path
        if local_path.exists():
            with open(local_path, "rb") as f:
                return f.read()
        return None

storage = StorageService()
