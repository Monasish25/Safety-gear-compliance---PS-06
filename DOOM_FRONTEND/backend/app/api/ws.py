import logging
import json
from typing import List, Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger("safegear.ws")

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Active: {len(self.active_connections)}")

    async def broadcast_alert(self, alert_data: Dict):
        """Broadcast safety alert to all connected dashboard supervisors."""
        dead_connections = []
        payload = json.dumps(alert_data)
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Failed to send to client ({e}), marking dead.")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

manager = ConnectionManager()

@router.websocket("/ws/alerts")
async def websocket_alerts_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial welcome & heartbeat
        await websocket.send_json({
            "type": "SYSTEM_INFO",
            "message": "Connected to SafeGear Compliance live alert stream",
            "status": "ONLINE"
        })
        while True:
            # Keep connection alive; client can send pings or subscriptions
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)
