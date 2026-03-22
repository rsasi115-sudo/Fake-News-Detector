"""
consumers.py
WebSocket consumer for streaming backend logs to frontend.

Handles real-time log streaming from analysis pipeline to connected clients.
Each client connects with an analysis_id and receives logs for that specific analysis.
"""

import json
import logging
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class LogStreamConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for backend log streaming.
    
    URL: /ws/logs/?analysis_id={analysis_id}
    
    Messages sent from group:
    {
        "type": "log_message",
        "level": "info|success|warning|error|debug",
        "message": "...",
        "timestamp": 1234567890
    }
    """

    async def connect(self):
        """Handle new WebSocket connection."""
        # Extract analysis_id from query string
        query_string = self.scope.get("query_string", b"").decode()
        self.analysis_id = self._extract_analysis_id(query_string)
        
        if not self.analysis_id:
            logger.warning("[LogStreamConsumer] No analysis_id provided, using 'global'")
            self.analysis_id = "global"

        # Create a unique group name for this analysis
        self.group_name = f"logs_{self.analysis_id}"

        logger.info(f"[LogStreamConsumer] Client connecting (analysis_id={self.analysis_id})")

        # Add to group (creates group if doesn't exist)
        await self.channel_layer.group_add(self.group_name, self.channel_name)

        # Accept connection
        await self.accept()

        # Send welcome message
        await self.send_json({
            "type": "log",
            "level": "success",
            "message": f"Connected to backend log stream (analysis={self.analysis_id})",
            "timestamp": self._get_timestamp(),
        })

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        logger.info(f"[LogStreamConsumer] Client disconnecting (analysis_id={self.analysis_id})")
        
        # Remove from group
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def log_message(self, event):
        """
        Receive log message from group and send to WebSocket.
        
        Called when a message is sent to the group with type "log_message".
        The event dict contains the log data.
        """
        # Send the log to the WebSocket
        await self.send_json({
            "type": "log",
            "level": event.get("level", "info"),
            "message": event.get("message", ""),
            "timestamp": event.get("timestamp", self._get_timestamp()),
            "category": event.get("category", "pipeline"),
        })

    async def status_message(self, event):
        """Receive status message and send to WebSocket."""
        await self.send_json({
            "type": "status",
            "message": event.get("message", ""),
            "timestamp": event.get("timestamp", self._get_timestamp()),
        })

    async def error_message(self, event):
        """Receive error message and send to WebSocket."""
        await self.send_json({
            "type": "error",
            "message": event.get("message", ""),
            "timestamp": event.get("timestamp", self._get_timestamp()),
        })

    @staticmethod
    def _extract_analysis_id(query_string: str) -> str:
        """Extract analysis_id from query string."""
        params = query_string.split("&")
        for param in params:
            if param.startswith("analysis_id="):
                return param.split("=", 1)[1]
        return ""

    @staticmethod
    def _get_timestamp() -> float:
        """Get current timestamp in milliseconds."""
        import time
        return int(time.time() * 1000)


# ──────────────────────────────────────────────────────────────────────────
# Helper function to emit logs from anywhere in the application
# ──────────────────────────────────────────────────────────────────────────

async def emit_log(
    analysis_id: str,
    message: str,
    level: str = "info",
    category: str = "pipeline",
):
    """
    Emit a log message to all connected clients for a specific analysis.
    
    Usage (async context):
    ```python
    await emit_log(
        analysis_id="12345",
        message="Preprocessing started...",
        level="info"
    )
    ```
    
    Usage (sync context):
    ```python
    from asgiref.sync import async_to_sync
    async_to_sync(emit_log)(
        analysis_id="12345",
        message="Preprocessing started...",
        level="info"
    )
    ```
    """
    import time
    from channels.layers import get_channel_layer

    channel_layer = get_channel_layer()
    group_name = f"logs_{analysis_id}"
    timestamp = int(time.time() * 1000)

    await channel_layer.group_send(
        group_name,
        {
            "type": "log_message",
            "level": level,
            "message": message,
            "timestamp": timestamp,
            "category": category,
        },
    )

    logger.debug(f"[emit_log] Sent to group '{group_name}': [{level}] {message}")
