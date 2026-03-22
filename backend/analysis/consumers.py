"""
WebSocket consumers for analysis log streaming.
"""

from __future__ import annotations

import json

from channels.generic.websocket import AsyncWebsocketConsumer


class AnalysisLogConsumer(AsyncWebsocketConsumer):
    """
    Streams backend logs to clients.

    - Joins shared group: `analysis_logs`
    - Optionally joins per-analysis group: `logs_<analysis_id>`
    """

    async def connect(self) -> None:
        self.analysis_id = self._extract_analysis_id()
        self.shared_group = "analysis_logs"
        self.analysis_group = f"logs_{self.analysis_id}" if self.analysis_id else None

        await self.channel_layer.group_add(self.shared_group, self.channel_name)
        if self.analysis_group:
            await self.channel_layer.group_add(self.analysis_group, self.channel_name)

        await self.accept()
        await self.send(
            text_data=json.dumps(
                {
                    "type": "status",
                    "message": "Connected to log stream",
                }
            )
        )

    async def disconnect(self, close_code: int) -> None:
        await self.channel_layer.group_discard(self.shared_group, self.channel_name)
        if self.analysis_group:
            await self.channel_layer.group_discard(self.analysis_group, self.channel_name)

    async def log_message(self, event: dict) -> None:
        await self.send(
            text_data=json.dumps(
                {
                    "type": "log",
                    "message": event.get("message", ""),
                    "level": event.get("level", "info"),
                    "timestamp": event.get("timestamp"),
                }
            )
        )

    async def log_message_alt(self, event: dict) -> None:
        # Compatibility for `type: log.message` event naming.
        await self.log_message(event)

    def _extract_analysis_id(self) -> str:
        query_string = self.scope.get("query_string", b"").decode()
        for param in query_string.split("&"):
            if param.startswith("analysis_id="):
                return param.split("=", 1)[1]
        return ""
