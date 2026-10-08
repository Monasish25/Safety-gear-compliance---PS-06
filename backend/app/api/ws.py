import logging
import json
import datetime
import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

logger = logging.getLogger("safegear.ws")

def _json_serial(obj: Any) -> Any:
    """JSON serializer for objects not serializable by default json code."""
    if isinstance(obj, (datetime.datetime, datetime.date)):
        return obj.isoformat()
    if isinstance(obj, BaseModel):
        return obj.model_dump()
    if isinstance(obj, uuid.UUID):
        return str(obj)
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining active connections: {len(self.active_connections)}")

    async def broadcast_alert(self, alert_data: Dict):
        """Broadcast safety alert to all connected dashboard supervisors."""
        dead_connections = []
        payload = json.dumps(alert_data, default=_json_serial)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Failed to send alert to WebSocket client ({e}), marking dead.")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

    async def broadcast_telemetry(self, telemetry_data: Dict):
        """Broadcast frame-by-frame computer vision telemetry & bounding boxes."""
        dead_connections = []
        payload = json.dumps(telemetry_data, default=_json_serial)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Failed to send telemetry to WebSocket client ({e}), marking dead.")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)


manager = ConnectionManager()


async def handle_websocket_connection(websocket: WebSocket, stream_name: str = "alerts"):
    await manager.connect(websocket)
    try:
        await websocket.send_json({
            "type": "SYSTEM_INFO",
            "message": f"Connected to SafeGear Compliance live stream ({stream_name})",
            "status": "ONLINE"
        })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error on stream {stream_name}: {e}")
        manager.disconnect(websocket)


@router.websocket("/ws/alerts")
async def websocket_alerts_endpoint(websocket: WebSocket):
    await handle_websocket_connection(websocket, stream_name="alerts")


@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await handle_websocket_connection(websocket, stream_name="telemetry")


@router.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    await handle_websocket_connection(websocket, stream_name="live")

