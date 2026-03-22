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
    stream_id = serializers.CharField(required=False, allow_blank=False)


# ── output (detail) ─────────────────────────────────────────────────────

class SourceCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = SourceCheck
        fields = ("id", "source_name", "verification_status", "match_percentage")


class AnalysisResultSerializer(serializers.ModelSerializer):
    sources = SourceCheckSerializer(many=True, read_only=True)
    source_verification = serializers.SerializerMethodField()

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
            "source_verification",
        )

    def get_source_verification(self, obj: AnalysisResult) -> dict:
        sv = (obj.metrics or {}).get("source_verification")
        if not sv or not isinstance(sv, dict):
            return {
                "verification_enabled": False,
                "verification_status": "not_available",
                "matched_sources": [],
                "per_source_statuses": [],
                "contradiction_count": 0,
                "source_count": 0,
                "verification_notes": "",
            }

        # Sanitise: ensure matched_sources is always a list of dicts.
        matched = sv.get("matched_sources") or []
        if not isinstance(matched, list):
            matched = []
        matched = [m for m in matched if isinstance(m, dict)]

        per_source = sv.get("per_source_statuses") or []
        if not isinstance(per_source, list):
            per_source = []
        per_source = [p for p in per_source if isinstance(p, dict)]

        source_count = len(matched)
        status = sv.get("verification_status", "unsupported") or "unsupported"
        contradiction_count = int(sv.get("contradiction_count") or 0)

        # Consistency enforcement:
        # - unsupported / not_available must have empty matched_sources
        # - supported must have at least 1 fully matched source
        if status in ("unsupported", "not_available"):
            matched = []
            source_count = 0
        elif source_count == 0 and status == "supported":
            status = "unsupported"

        if source_count > 0 and status == "unsupported":
            status = "partially_supported"

        return {
            "verification_enabled": bool(sv.get("verification_enabled", False)),
            "verification_status": status,
            "matched_sources": matched,
            "per_source_statuses": per_source,
            "contradiction_count": contradiction_count,
            "source_count": source_count,
            "verification_notes": sv.get("verification_notes") or "",
        }


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
