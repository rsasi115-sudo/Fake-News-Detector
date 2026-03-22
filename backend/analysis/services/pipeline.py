"""
pipeline.py — Orchestrates the full verification flow.

Sequence:
  1. Validate    (input sanity checks)
  2. Preprocess  (clean text, normalise, remove stopwords)
  3. Extract     (keyword, claim & pattern detection)
  4. Score       (deterministic rule-based credibility scoring)
  5. Report      (structured summary, recommendations, source checks)
  6. LLM         (real Ollama explainable-AI — NO mock, NO fallback)

Returns a context dict ready to be persisted by the analysis service.
Steps 1-5 are deterministic. Step 6 calls real Ollama.
If Ollama fails, llm_status is set to "error" with a clear message.
"""

import json
import logging
import time

from analysis.services.article_extractor import extract_article
from analysis.services.preprocess import preprocess
from analysis.services.feature_extraction import extract_features
from analysis.services.scoring import compute_score, _score_to_verdict
from analysis.services.report_builder import build_report
from analysis.services.source_verifier import verify_sources

logger = logging.getLogger(__name__)

_TRUSTED_MATCH_SINGLE_BONUS = 25
_TRUSTED_MATCH_DOUBLE_BONUS = 35
_TRUSTED_MATCH_MULTI_BONUS = 45
_TRUSTED_SOURCE_CONTRADICTION_PENALTY = 12

# ── allowed input types ──────────────────────────────────────────────────

_VALID_INPUT_TYPES = {"text", "url"}

# ── required keys in LLM JSON output ────────────────────────────────────

_REQUIRED_LLM_KEYS = {"summary", "reasoning", "inconsistencies", "recommendations", "confidence"}


# ══════════════════════════════════════════════════════════════════════════
#  Errors
# ══════════════════════════════════════════════════════════════════════════

class PipelineError(Exception):
    """Raised when the pipeline encounters an unrecoverable error."""

    def __init__(self, stage: str, detail: str):
        self.stage = stage
        self.detail = detail
        super().__init__(f"Pipeline failed at [{stage}]: {detail}")


def _negative_signal_indicator_count(ctx: dict) -> int:
    features = ctx.get("features", {}) or {}
    claims = features.get("claims", []) or []
    red_flag_claims = {"conspiracy_claim", "cure_claim", "causation_claim"}

    red_flag_count = sum(1 for claim in claims if (claim or {}).get("type") in red_flag_claims)

    indicators = [
        len(features.get("clickbait_hits", [])) >= 3,
        len(features.get("emotional_hits", [])) >= 4,
        len(features.get("hedge_hits", [])) >= 4,
        len(features.get("absolute_hits", [])) >= 4,
        len(features.get("superlative_hits", [])) >= 4,
        int(features.get("exclamation_count", 0) or 0) >= 4,
        float(features.get("all_caps_ratio", 0) or 0) >= 0.35,
        int(features.get("repeated_punctuation", 0) or 0) >= 2,
        red_flag_count >= 2,
        bool(features.get("domain_untrusted", False)),
    ]

    return sum(1 for is_present in indicators if is_present)


def _has_strong_negative_content_signals(ctx: dict) -> bool:
    return _negative_signal_indicator_count(ctx) >= 1

def _trusted_match_bonus(match_count: int) -> int:
    if match_count >= 3:
        return _TRUSTED_MATCH_MULTI_BONUS
    if match_count == 2:
        return _TRUSTED_MATCH_DOUBLE_BONUS
    if match_count == 1:
        return _TRUSTED_MATCH_SINGLE_BONUS
    return 0


# ══════════════════════════════════════════════════════════════════════════
#  Validation
# ══════════════════════════════════════════════════════════════════════════

def _validate_input(input_type: str, input_value: str) -> None:
    """Raise ``PipelineError`` if input is obviously invalid."""

    if input_type not in _VALID_INPUT_TYPES:
        raise PipelineError(
            "validate",
            f"Invalid input_type '{input_type}'. Must be one of {_VALID_INPUT_TYPES}.",
        )

    if not input_value or not input_value.strip():
        raise PipelineError("validate", "input_value must be a non-empty string.")

    if len(input_value) > 50_000:
        raise PipelineError(
            "validate",
            f"input_value too long ({len(input_value)} chars). Max 50 000.",
        )

    if input_type == "url" and not input_value.strip().startswith(("http://", "https://")):
        raise PipelineError(
            "validate",
            "URL inputs must begin with http:// or https://.",
        )


# ══════════════════════════════════════════════════════════════════════════
#  LLM stage — REAL Ollama only, no mock fallback
# ══════════════════════════════════════════════════════════════════════════

def _run_llm_stage(ctx: dict) -> dict:
    """
    Call real Ollama for explainable AI.

    On success:  ctx gets explainable_ai (dict), llm_status="success"
    On failure:  ctx gets explainable_ai={}, llm_status="error", llm_error=<message>
    NEVER stores fake/mock explanations.
    """
    from django.conf import settings

    llm_enabled = getattr(settings, "LLM_ENABLE", True)

    if not llm_enabled:
        ctx["explainable_ai"] = {}
        ctx["llm_provider"] = "ollama"
        ctx["llm_latency_ms"] = 0
        ctx["llm_status"] = "disabled"
        ctx["llm_error"] = "LLM integration is disabled in settings."
        logger.info("LLM stage skipped (LLM_ENABLE=false)")
        return ctx

    from analysis.services.ollama_client import OllamaClient, OllamaClientError
    from analysis.services.prompts import SYSTEM_PROMPT, build_user_prompt

    client = OllamaClient()
    user_prompt = build_user_prompt(ctx)

    logger.info(
        "LLM prompt built: prompt_len=%d  cleaned_text_len=%d  first_300_chars=%.300s",
        len(user_prompt),
        len(str(ctx.get('cleaned_text', ''))),
        str(ctx.get('cleaned_text', ''))[:300],
    )
    logger.info("Sending %d characters to LLaMA explanation", len(user_prompt))

    t0 = time.monotonic()

    try:
        envelope = client.generate(
            prompt=user_prompt,
            system=SYSTEM_PROMPT,
            temperature=0.3,
            max_tokens=512,
        )
    except OllamaClientError as exc:
        latency = round((time.monotonic() - t0) * 1000)
        error_msg = f"Ollama call failed: {exc}"
        logger.warning("LLM stage error: %s", error_msg)
        ctx["explainable_ai"] = {}
        ctx["llm_provider"] = "ollama"
        ctx["llm_latency_ms"] = latency
        ctx["llm_status"] = "error"
        ctx["llm_error"] = error_msg
        return ctx

    latency = round((time.monotonic() - t0) * 1000)

    # ── parse the response ───────────────────────────────────────────
    response_text = envelope.get("response", "")

    try:
        parsed = json.loads(response_text)
    except json.JSONDecodeError as exc:
        error_msg = f"Ollama returned invalid JSON: {response_text[:300]}"
        logger.warning("LLM stage error: %s", error_msg)
        ctx["explainable_ai"] = {}
        ctx["llm_provider"] = "ollama"
        ctx["llm_latency_ms"] = latency
        ctx["llm_status"] = "error"
        ctx["llm_error"] = error_msg
        return ctx

    if not isinstance(parsed, dict):
        error_msg = f"Ollama returned {type(parsed).__name__}, expected dict."
        logger.warning("LLM stage error: %s", error_msg)
        ctx["explainable_ai"] = {}
        ctx["llm_provider"] = "ollama"
        ctx["llm_latency_ms"] = latency
        ctx["llm_status"] = "error"
        ctx["llm_error"] = error_msg
        return ctx

    # Validate required keys
    missing = _REQUIRED_LLM_KEYS - set(parsed.keys())
    if missing:
        error_msg = f"Ollama response missing keys: {sorted(missing)}"
        logger.warning("LLM stage error: %s", error_msg)
        ctx["explainable_ai"] = {}
        ctx["llm_provider"] = "ollama"
        ctx["llm_latency_ms"] = latency
        ctx["llm_status"] = "error"
        ctx["llm_error"] = error_msg
        return ctx

    # Clamp confidence
    conf = parsed.get("confidence", 0.5)
    if not isinstance(conf, (int, float)):
        conf = 0.5
    parsed["confidence"] = max(0.0, min(1.0, float(conf)))

    ctx["explainable_ai"] = parsed
    ctx["llm_provider"] = "ollama"
    ctx["llm_latency_ms"] = latency
    ctx["llm_status"] = "success"
    ctx["llm_error"] = ""

    logger.info(
        "LLM stage OK: provider=ollama status=success latency=%dms",
        latency,
    )
    return ctx


# ══════════════════════════════════════════════════════════════════════════
#  Public entry-point
# ══════════════════════════════════════════════════════════════════════════

def run_pipeline(input_type: str, input_value: str, stream_id: str | None = None) -> dict:
    """
    Execute the full verification pipeline and return the result context.

    Args:
        input_type: "text" or "url"
        input_value: content to analyze
        stream_id: optional stream ID for real-time log streaming

    Returns dict with keys:
      - verdict, credibility_score, summary, metrics
      - source_checks (list of dicts)
      - features, scoring_breakdown, recommendations
      - explainable_ai, llm_provider, llm_latency_ms, llm_status, llm_error

    Raises:
      PipelineError — on validation failure or stage error.
    """
    from analysis.services.stream_logs import emit_analysis_log

    t0 = time.monotonic()
    logger.info("Pipeline started: input_type=%s len=%d stream_id=%s", input_type, len(input_value), stream_id)
    emit_analysis_log(stream_id=stream_id, message="Submitting to backend...", level="info", category="pipeline")

    # ── Step 0 — validate ────────────────────────────────────────────
    emit_analysis_log(stream_id=stream_id, message="Validating input...", level="info", category="pipeline")
    _validate_input(input_type, input_value)

    # ── Step 0.5 — article extraction (URLs only) ────────────────────
    extraction = None
    original_url = input_value if input_type == "url" else None
    if input_type == "url":
        emit_analysis_log(stream_id=stream_id, message="Extracting article from URL...", level="info", category="pipeline")
        logger.info("URL detected: True  url=%s", input_value)
        try:
            extraction = extract_article(input_value)
        except Exception as exc:
            logger.warning("Article extractor crashed (non-fatal): %s", exc)
            emit_analysis_log(stream_id=stream_id, message=f"Article extraction warning: {exc}", level="warning", category="pipeline")
            extraction = None

        if extraction:
            emit_analysis_log(stream_id=stream_id, message=f"Article extracted: {extraction.title[:60]}...", level="success", category="pipeline")
            logger.info(
                "Extraction CONTEXT READY: title_len=%d context_len=%d step=%s url=%s",
                len(extraction.title), len(extraction.text), getattr(extraction, "extraction_step", ""), input_value,
            )
            input_value = extraction.text
            input_type = "text"
        else:
            # Last-resort URL context keeps analysis alive even if fetch fails.
            from urllib.parse import urlparse
            domain = urlparse(input_value).netloc or input_value
            input_value = f"Article context from {domain}. URL slug-based fallback context."
            input_type = "text"
    else:
        logger.info("URL detected: False  (plain text input, len=%d)", len(input_value))

    # ── Step 1 — preprocess ──────────────────────────────────────────
    emit_analysis_log(stream_id=stream_id, message="Preprocessing & text cleaning...", level="info", category="pipeline")
    try:
        ctx = preprocess(input_type, input_value)
    except Exception as exc:
        raise PipelineError("preprocess", str(exc)) from exc

    emit_analysis_log(stream_id=stream_id, message="Preprocessing complete", level="success", category="pipeline")

    # Attach extraction metadata if a URL was processed
    if extraction is not None:
        ctx["article_extracted"] = extraction.extracted
        ctx["article_title"] = extraction.title
        ctx["article_source_url"] = extraction.source_url
        ctx["article_extraction_step"] = getattr(extraction, "extraction_step", "")
        ctx["article_meta_description"] = getattr(extraction, "meta_description", "")

    # ── Step 2 — feature extraction ──────────────────────────────────
    emit_analysis_log(stream_id=stream_id, message="Extracting features & claims...", level="info", category="pipeline")
    try:
        ctx = extract_features(ctx)
    except Exception as exc:
        raise PipelineError("feature_extraction", str(exc)) from exc

    emit_analysis_log(stream_id=stream_id, message="Feature extraction complete", level="success", category="pipeline")

    # ── Step 2.5 — source verification ───────────────────────────────
    emit_analysis_log(stream_id=stream_id, message="Verifying against trusted sources...", level="info", category="pipeline")
    try:
        sv_result = verify_sources(
            ctx.get("original_text", ""),
            ctx.get("article_title", ""),
            submitted_url=original_url or ctx.get("article_source_url", ""),
        )
        ctx["source_verification"] = {
            "verification_enabled": sv_result.verification_enabled,
            "verification_status": sv_result.verification_status,
            "matched_sources": sv_result.matched_sources,
            "per_source_statuses": sv_result.per_source_statuses,
            "contradiction_count": sv_result.contradiction_count,
            "source_count": sv_result.source_count,
            "verification_notes": sv_result.verification_notes,
        }
        if sv_result.source_count > 0:
            emit_analysis_log(stream_id=stream_id, message=f"Source verification: {sv_result.source_count} trusted source(s) checked", level="success", category="pipeline")
        else:
            emit_analysis_log(stream_id=stream_id, message="No trusted sources available for verification", level="info", category="pipeline")
        logger.info(
            "Source verification: status=%s  matches=%d",
            sv_result.verification_status, sv_result.source_count,
        )
    except Exception as exc:
        logger.warning("Source verification failed (non-fatal): %s", exc)
        emit_analysis_log(stream_id=stream_id, message=f"Source verification error: {exc}", level="warning", category="pipeline")
        ctx["source_verification"] = {
            "verification_enabled": False,
            "verification_status": "not_available",
            "matched_sources": [],
            "per_source_statuses": [],
            "contradiction_count": 0,
            "source_count": 0,
            "verification_notes": f"Source verification unavailable: {exc}",
        }

    # ── Step 3 — scoring ─────────────────────────────────────────────
    emit_analysis_log(stream_id=stream_id, message="Computing credibility score...", level="info", category="pipeline")
    try:
        ctx = compute_score(ctx)
    except Exception as exc:
        raise PipelineError("scoring", str(exc)) from exc

    emit_analysis_log(stream_id=stream_id, message=f"Credibility score: {ctx['credibility_score']:.1f}%", level="success", category="pipeline")

    # ── Step 3.5 — adjust score based on source verification ─────────
    sv = ctx["source_verification"]
    if sv["verification_enabled"] and sv["verification_status"] != "not_available":
        matched_sources = sv.get("matched_sources", []) or []
        domain_matches = [m for m in matched_sources if m.get("is_domain_match", False)]
        has_domain_match = bool(domain_matches)
        unique_source_names = {m.get("source_name", "") for m in matched_sources if m.get("source_name")}
        trusted_match_count = len(unique_source_names)
        contradiction_count = int(sv.get("contradiction_count", 0) or 0)
        negative_indicator_count = _negative_signal_indicator_count(ctx)
        strong_negative_signals = negative_indicator_count >= 1
        severe_negative_signals = negative_indicator_count >= 3
        adj = 0

        if trusted_match_count > 0:
            adj += _trusted_match_bonus(trusted_match_count)
            if contradiction_count > 0:
                adj -= _TRUSTED_SOURCE_CONTRADICTION_PENALTY * contradiction_count

            old_score = ctx["credibility_score"]
            ctx["credibility_score"] = max(0, min(100, old_score + adj))

            # Domain-based floor protects trusted-source URLs from weak penalties.
            if has_domain_match:
                if not strong_negative_signals and contradiction_count == 0:
                    ctx["credibility_score"] = max(ctx["credibility_score"], 65)
                elif not severe_negative_signals:
                    ctx["credibility_score"] = max(ctx["credibility_score"], 35)

            ctx["scoring_breakdown"].append({
                "delta": adj,
                "reason": f"Source verification: {trusted_match_count} trusted source match(es)",
                "running": ctx["credibility_score"],
            })
            # Re-derive verdict from adjusted score
            ctx["verdict"] = _score_to_verdict(ctx["credibility_score"])
            ctx["source_scoring"] = {
                "trusted_match_count": trusted_match_count,
                "has_domain_match": has_domain_match,
                "negative_indicator_count": negative_indicator_count,
                "strong_negative_signals": strong_negative_signals,
                "severe_negative_signals": severe_negative_signals,
            }
            logger.info(
                "Score adjusted by %+d for source verification (trusted_matches=%d domain_match=%s contradictions=%d strong_negative=%s severe_negative=%s): %d -> %d  verdict=%s",
                adj,
                trusted_match_count,
                has_domain_match,
                contradiction_count,
                strong_negative_signals,
                severe_negative_signals,
                old_score,
                ctx["credibility_score"],
                ctx["verdict"],
            )
        else:
            ctx["source_scoring"] = {
                "trusted_match_count": 0,
                "has_domain_match": False,
                "negative_indicator_count": negative_indicator_count,
                "strong_negative_signals": strong_negative_signals,
                "severe_negative_signals": severe_negative_signals,
            }

    # ── Step 4 — report ──────────────────────────────────────────────
    emit_analysis_log(stream_id=stream_id, message="Building verification report...", level="info", category="pipeline")
    try:
        ctx = build_report(ctx)
    except Exception as exc:
        raise PipelineError("report_builder", str(exc)) from exc

    emit_analysis_log(stream_id=stream_id, message="Report generation complete", level="success", category="pipeline")

    # ── Step 5 — LLM explainable-AI (real Ollama) ────────────────────
    emit_analysis_log(stream_id=stream_id, message="Running explainable AI analysis...", level="info", category="pipeline")
    ctx = _run_llm_stage(ctx)
    emit_analysis_log(stream_id=stream_id, message="AI analysis complete", level="success", category="pipeline")

    elapsed_ms = round((time.monotonic() - t0) * 1000)
    ctx["pipeline_elapsed_ms"] = elapsed_ms

    # ── Final debug summary ───────────────────────────────────────────
    sv_final = ctx.get("source_verification", {})
    logger.info(
        "Pipeline complete in %dms: verdict=%s  score=%d  "
        "llm_status=%s  sv_status=%s  sv_count=%d  matched=%s",
        elapsed_ms,
        ctx["verdict"],
        ctx["credibility_score"],
        ctx.get("llm_status", "?"),
        sv_final.get("verification_status", "?"),
        sv_final.get("source_count", 0),
        [m.get("source_name", "?") for m in sv_final.get("matched_sources", [])],
    )
    
    emit_analysis_log(
        stream_id=stream_id,
        message=f"✓ Analysis complete: {ctx['verdict'].upper()} (Score: {ctx['credibility_score']:.0f}%)",
        level="success",
        category="pipeline"
    )
    
    return ctx
