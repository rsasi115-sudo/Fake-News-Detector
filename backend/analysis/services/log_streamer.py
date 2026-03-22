"""
Logging handler that streams backend logs to WebSocket clients.
"""

from __future__ import annotations

import logging
import time
from collections import deque

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


class WebSocketLogHandler(logging.Handler):
    """
    Logging handler that pushes log records to the `analysis_logs` channel group.

    This allows frontend clients to receive backend processing logs in real time
    without scraping terminal output.
    """

    group_name = "analysis_logs"

    def __init__(self) -> None:
        super().__init__()
        self._recent = deque(maxlen=50)

    def emit(self, record: logging.LogRecord) -> None:
        try:
            message = self.format(record)
            level = record.levelname.lower()
            now_ms = int(time.time() * 1000)

            # Basic de-duplication for accidental repeated emissions.
            dedupe_key = (record.name, level, message)
            if dedupe_key in self._recent:
                return
            self._recent.append(dedupe_key)

            channel_layer = get_channel_layer()
            if channel_layer is None:
                return

            async_to_sync(channel_layer.group_send)(
                self.group_name,
                {
                    "type": "log.message",
                    "message": message,
                    "level": level,
                    "timestamp": now_ms,
                },
            )
        except Exception:
            self.handleError(record)
