"""
routing.py
WebSocket URL routing for Django Channels.

Maps WebSocket URLs to consumers.
"""

from django.urls import re_path
from analysis.consumers import AnalysisLogConsumer

websocket_urlpatterns = [
    # Shared log stream endpoint.
    # Usage: ws://localhost:8000/ws/logs/
    # Optional analysis scoped stream: ws://localhost:8000/ws/logs/?analysis_id=<id>
    re_path(r"ws/logs/$", AnalysisLogConsumer.as_asgi()),
]
