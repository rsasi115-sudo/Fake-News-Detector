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

from analysis.services.preprocess import preprocess
from analysis.services.feature_extraction import extract_features
from analysis.services.scoring import compute_score
from analysis.services.report_builder import build_report

logger = logging.getLogger(__name__)

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

def run_pipeline(input_type: str, input_value: str) -> dict:
    """
    Execute the full verification pipeline and return the result context.

    Returns dict with keys:
      - verdict, credibility_score, summary, metrics
      - source_checks (list of dicts)
      - features, scoring_breakdown, recommendations
      - explainable_ai, llm_provider, llm_latency_ms, llm_status, llm_error

    Raises:
      PipelineError — on validation failure or stage error.
    """

    t0 = time.monotonic()
    logger.info("Pipeline started: input_type=%s len=%d", input_type, len(input_value))

    # ── Step 0 — validate ────────────────────────────────────────────
    _validate_input(input_type, input_value)

    # ── Step 1 — preprocess ──────────────────────────────────────────
    try:
        ctx = preprocess(input_type, input_value)
    except Exception as exc:
        raise PipelineError("preprocess", str(exc)) from exc

    # ── Step 2 — feature extraction ──────────────────────────────────
    try:
        ctx = extract_features(ctx)
    except Exception as exc:
        raise PipelineError("feature_extraction", str(exc)) from exc

    # ── Step 3 — scoring ─────────────────────────────────────────────
    try:
        ctx = compute_score(ctx)
    except Exception as exc:
        raise PipelineError("scoring", str(exc)) from exc

    # ── Step 4 — report ──────────────────────────────────────────────
    try:
        ctx = build_report(ctx)
    except Exception as exc:
        raise PipelineError("report_builder", str(exc)) from exc

    # ── Step 5 — LLM explainable-AI (real Ollama) ────────────────────
    ctx = _run_llm_stage(ctx)

    elapsed_ms = round((time.monotonic() - t0) * 1000)
    ctx["pipeline_elapsed_ms"] = elapsed_ms

    logger.info(
        "Pipeline complete in %dms: verdict=%s score=%d llm_status=%s",
        elapsed_ms, ctx["verdict"], ctx["credibility_score"], ctx.get("llm_status"),
    )
    return ctx
