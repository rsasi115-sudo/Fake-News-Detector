"""
Analysis views — submit, history list, detail, rerun.
"""

import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from analysis.models import AnalysisRequest
from analysis.serializers.analysis import (
    AnalysisHistoryItemSerializer,
    AnalysisRequestCreateSerializer,
    AnalysisRequestDetailSerializer,
)
from analysis.services.analysis import rerun_analysis, submit_analysis

logger = logging.getLogger(__name__)


# ── helpers ──────────────────────────────────────────────────────────────

def _ok(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _err(code: str, message: str, status_code=status.HTTP_400_BAD_REQUEST):
    return Response(
        {"success": False, "error": {"code": code, "message": message}},
        status=status_code,
    )


def _get_user_request_or_404(user, pk):
    """Return the AnalysisRequest owned by *user* or None."""
    try:
        return AnalysisRequest.objects.select_related("result").prefetch_related("result__sources").get(
            pk=pk, user=user,
        )
    except AnalysisRequest.DoesNotExist:
        return None


# ── views ────────────────────────────────────────────────────────────────

class SubmitAnalysisView(APIView):
    """POST /api/analysis/submit/ — create a new analysis request."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AnalysisRequestCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return _err("VALIDATION_ERROR", serializer.errors)

        analysis_req = submit_analysis(
            user=request.user,
            input_type=serializer.validated_data["input_type"],
            input_value=serializer.validated_data["input_value"],
        )
        # Re-fetch with relations for serialization
        analysis_req = _get_user_request_or_404(request.user, analysis_req.pk)
        data = AnalysisRequestDetailSerializer(analysis_req).data
        logger.info("Analysis submitted: user=%s request=%s", request.user.pk, analysis_req.pk)
        return _ok(data, status.HTTP_201_CREATED)


class HistoryListView(APIView):
    """GET /api/history/ — list current user's analysis history."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            AnalysisRequest.objects
            .filter(user=request.user)
            .select_related("result")
            .order_by("-created_at")
        )
        data = AnalysisHistoryItemSerializer(qs, many=True).data
        return _ok(data)


class HistoryDetailView(APIView):
    """GET /api/history/<id>/ — full report for one request."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        analysis_req = _get_user_request_or_404(request.user, pk)
        if analysis_req is None:
            return _err("NOT_FOUND", "Analysis request not found.", status.HTTP_404_NOT_FOUND)
        data = AnalysisRequestDetailSerializer(analysis_req).data
        return _ok(data)


class RerunAnalysisView(APIView):
    """POST /api/history/<id>/rerun/ — regenerate result for an existing request."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        analysis_req = _get_user_request_or_404(request.user, pk)
        if analysis_req is None:
            return _err("NOT_FOUND", "Analysis request not found.", status.HTTP_404_NOT_FOUND)

        rerun_analysis(analysis_req)
        # Re-fetch with fresh result + sources
        analysis_req = _get_user_request_or_404(request.user, pk)
        data = AnalysisRequestDetailSerializer(analysis_req).data
        logger.info("Analysis rerun: user=%s request=%s", request.user.pk, pk)
        return _ok(data)
