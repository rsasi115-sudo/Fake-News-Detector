"""
Project-level views (health check, etc.).
"""

from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    """GET /api/health/ — lightweight liveness probe."""

    authentication_classes: list = []
    permission_classes: list = []

    def get(self, request):
        return Response({"status": "ok", "service": "truthlens-backend"})
