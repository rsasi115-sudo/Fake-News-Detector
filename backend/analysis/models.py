"""
Analysis models — AnalysisRequest, AnalysisResult, SourceCheck.

These store the user's verification history and results.
Real pipeline logic will be added in Phase 5; LLM integration in Phase 6.
"""

from django.conf import settings
from django.db import models


class AnalysisRequest(models.Model):
    """A single news-verification request submitted by a user."""

    class InputType(models.TextChoices):
        TEXT = "text", "Text"
        URL = "url", "URL"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="analysis_requests",
    )
    input_type = models.CharField(max_length=4, choices=InputType.choices)
    input_value = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "analysis_request"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        preview = self.input_value[:50]
        return f"[{self.input_type}] {preview}"


class AnalysisResult(models.Model):
    """The verification result for a given AnalysisRequest."""

    class Verdict(models.TextChoices):
        TRUE = "true", "True"
        FALSE = "false", "False"
        MISLEADING = "misleading", "Misleading"
        UNKNOWN = "unknown", "Unknown"

    request = models.OneToOneField(
        AnalysisRequest,
        on_delete=models.CASCADE,
        related_name="result",
    )
    verdict = models.CharField(max_length=11, choices=Verdict.choices)
    credibility_score = models.IntegerField(
        help_text="0–100 credibility score.",
    )
    metrics = models.JSONField(default=dict, blank=True)
    llm_summary = models.TextField(blank=True, default="")

    # ── Phase 6: explainable-AI fields ───────────────────────────────
    explainable_ai = models.JSONField(
        default=dict,
        blank=True,
        help_text="Structured JSON explanation from the LLM provider.",
    )
    llm_provider = models.CharField(
        max_length=50,
        blank=True,
        default="ollama",
        help_text="Which LLM provider produced the explanation.",
    )
    llm_latency_ms = models.IntegerField(
        null=True,
        blank=True,
        help_text="Wall-clock milliseconds the LLM call took.",
    )
    llm_status = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="success | error",
    )
    llm_error = models.TextField(
        blank=True,
        default="",
        help_text="Error message if LLM call failed.",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "analysis_result"

    def __str__(self) -> str:
        return f"Result #{self.pk} — {self.verdict} ({self.credibility_score}%)"


class SourceCheck(models.Model):
    """An external source cross-reference for a result."""

    class Status(models.TextChoices):
        VERIFIED = "verified", "Verified"
        DISPUTED = "disputed", "Disputed"
        NOT_FOUND = "not_found", "Not Found"

    result = models.ForeignKey(
        AnalysisResult,
        on_delete=models.CASCADE,
        related_name="sources",
    )
    source_name = models.CharField(max_length=255)
    verification_status = models.CharField(max_length=10, choices=Status.choices)
    match_percentage = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "analysis_source_check"

    def __str__(self) -> str:
        return f"{self.source_name} — {self.verification_status}"
