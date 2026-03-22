"""
Helpers for emitting real-time analysis logs over WebSocket groups.
"""

from __future__ import annotations

import logging

from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


def _emit_log_safe(*, stream_id: str, message: str, level: str, category: str) -> None:
    """
    Emit a log entry when Channels is available.

    This import is intentionally lazy so the scoring pipeline still runs
    even when WebSocket dependencies are not installed.
    """
    try:
        from config.consumers import emit_log
    except Exception as exc:
        logger.debug("Real-time log streaming unavailable: %s", exc)
        return

    async_to_sync(emit_log)(
        analysis_id=stream_id,
        message=message,
        level=level,
        category=category,
    )


def emit_analysis_log(
    *,
    stream_id: str | None,
    message: str,
    level: str = "info",
    category: str = "pipeline",
) -> None:
    """Emit a log entry to the analysis stream if a stream_id is provided."""
    if not stream_id:
        return

    try:
        _emit_log_safe(
            stream_id=stream_id,
            message=message,
            level=level,
            category=category,
        )
    except Exception:
        logger.exception("Failed to emit analysis log (stream_id=%s)", stream_id)
