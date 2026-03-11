"""
Analysis service — runs the rule-based verification pipeline.

All business logic lives here so views stay thin.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from analysis.models import AnalysisRequest, AnalysisResult, SourceCheck
from analysis.services.pipeline import PipelineError, run_pipeline

if TYPE_CHECKING:
    from accounts.models import User

logger = logging.getLogger(__name__)


class AnalysisServiceError(Exception):
    """Raised when analysis submission or rerun fails."""


def _persist_pipeline_result(request: AnalysisRequest, pipe_ctx: dict) -> AnalysisResult:
    """Persist the pipeline output as AnalysisResult + SourceChecks."""

    # Delete any existing result so rerun is clean
    AnalysisResult.objects.filter(request=request).delete()

    result = AnalysisResult.objects.create(
        request=request,
        verdict=pipe_ctx["verdict"],
        credibility_score=pipe_ctx["credibility_score"],
        metrics=pipe_ctx["metrics"],
        llm_summary=pipe_ctx["summary"],
        # Phase 6 — explainable AI
        explainable_ai=pipe_ctx.get("explainable_ai", {}),
        llm_provider=pipe_ctx.get("llm_provider", "ollama"),
        llm_latency_ms=pipe_ctx.get("llm_latency_ms"),
        llm_status=pipe_ctx.get("llm_status", ""),
        llm_error=pipe_ctx.get("llm_error", ""),
    )

    for src in pipe_ctx["source_checks"]:
        SourceCheck.objects.create(
            result=result,
            source_name=src["source_name"],
            verification_status=src["verification_status"],
            match_percentage=src["match_percentage"],
        )

    logger.info(
        "Pipeline result persisted: request=%s verdict=%s score=%s elapsed=%dms",
        request.pk, pipe_ctx["verdict"], pipe_ctx["credibility_score"],
        pipe_ctx.get("pipeline_elapsed_ms", 0),
    )
    return result


# ── public API ───────────────────────────────────────────────────────────

def submit_analysis(*, user: "User", input_type: str, input_value: str) -> AnalysisRequest:
    """
    Create an AnalysisRequest and run the verification pipeline.

    Raises AnalysisServiceError on pipeline or persistence failures.
    """

    request = AnalysisRequest.objects.create(
        user=user,
        input_type=input_type,
        input_value=input_value,
    )

    try:
        pipe_ctx = run_pipeline(input_type, input_value)
    except PipelineError as exc:
        logger.error("Pipeline error for request %s: %s", request.pk, exc)
        # Store a fallback result so the request is not orphaned
        _persist_fallback_result(request, str(exc))
        return request
    except Exception as exc:
        logger.exception("Unexpected error in pipeline for request %s", request.pk)
        _persist_fallback_result(request, f"Internal error: {exc}")
        return request

    _persist_pipeline_result(request, pipe_ctx)
    return request


def rerun_analysis(request: AnalysisRequest) -> AnalysisRequest:
    """
    Re-run the pipeline for an existing request.

    Raises AnalysisServiceError on pipeline or persistence failures.
    """

    try:
        pipe_ctx = run_pipeline(request.input_type, request.input_value)
    except PipelineError as exc:
        logger.error("Pipeline error during rerun for request %s: %s", request.pk, exc)
        _persist_fallback_result(request, str(exc))
        request.refresh_from_db()
        return request
    except Exception as exc:
        logger.exception("Unexpected error during rerun for request %s", request.pk)
        _persist_fallback_result(request, f"Internal error: {exc}")
        request.refresh_from_db()
        return request

    _persist_pipeline_result(request, pipe_ctx)
    request.refresh_from_db()
    return request


def _persist_fallback_result(request: AnalysisRequest, error_detail: str) -> None:
    """
    Create a minimal AnalysisResult when the pipeline fails,
    so the request is never left without a result.
    """
    AnalysisResult.objects.filter(request=request).delete()
    AnalysisResult.objects.create(
        request=request,
        verdict="unknown",
        credibility_score=0,
        metrics={"error": error_detail, "pipeline_failed": True},
        llm_summary=f"Analysis could not be completed: {error_detail}",
        explainable_ai={},
        llm_provider="ollama",
        llm_latency_ms=None,
        llm_status="error",
        llm_error=error_detail,
    )
    logger.warning("Fallback result stored for request %s", request.pk)
