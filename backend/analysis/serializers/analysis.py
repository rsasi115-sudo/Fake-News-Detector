"""
Analysis serializers — request creation, result, source, history list.
"""

from rest_framework import serializers

from analysis.models import AnalysisRequest, AnalysisResult, SourceCheck


# ── input ────────────────────────────────────────────────────────────────

class AnalysisRequestCreateSerializer(serializers.Serializer):
    """Validate the submit payload."""

    input_type = serializers.ChoiceField(choices=AnalysisRequest.InputType.choices)
    input_value = serializers.CharField(min_length=1)


# ── output (detail) ─────────────────────────────────────────────────────

class SourceCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = SourceCheck
        fields = ("id", "source_name", "verification_status", "match_percentage")


class AnalysisResultSerializer(serializers.ModelSerializer):
    sources = SourceCheckSerializer(many=True, read_only=True)

    class Meta:
        model = AnalysisResult
        fields = (
            "id",
            "verdict",
            "credibility_score",
            "metrics",
            "llm_summary",
            "explainable_ai",
            "llm_provider",
            "llm_latency_ms",
            "llm_status",
            "llm_error",
            "created_at",
            "sources",
        )


class AnalysisRequestDetailSerializer(serializers.ModelSerializer):
    """Full detail view of a request + its result + sources."""

    result = AnalysisResultSerializer(read_only=True)

    class Meta:
        model = AnalysisRequest
        fields = ("id", "input_type", "input_value", "created_at", "updated_at", "result")


# ── output (history list) ───────────────────────────────────────────────

class AnalysisHistoryItemSerializer(serializers.ModelSerializer):
    """Compact list-item for history."""

    verdict = serializers.SerializerMethodField()
    credibility_score = serializers.SerializerMethodField()
    input_preview = serializers.SerializerMethodField()

    class Meta:
        model = AnalysisRequest
        fields = (
            "id",
            "input_type",
            "input_preview",
            "created_at",
            "verdict",
            "credibility_score",
        )

    def get_input_preview(self, obj: AnalysisRequest) -> str:
        return obj.input_value[:120]

    def get_verdict(self, obj: AnalysisRequest) -> str | None:
        result = getattr(obj, "result", None)
        return result.verdict if result else None

    def get_credibility_score(self, obj: AnalysisRequest) -> int | None:
        result = getattr(obj, "result", None)
        return result.credibility_score if result else None
