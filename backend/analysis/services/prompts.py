"""
prompts.py — Prompt template builders for the Ollama LLM integration.

Templates enforce strict JSON output format so the response can be
machine-parsed without guessing.
"""

from __future__ import annotations

import re
from typing import Any

# ── maximum input length sent to the LLM ─────────────────────────────────

MAX_INPUT_CHARS = 1_000

# ── prompt-injection guard phrases ───────────────────────────────────────

_INJECTION_PATTERNS: list[str] = [
    "ignore previous",
    "ignore all previous",
    "ignore above",
    "disregard previous",
    "disregard all",
    "forget your instructions",
    "override instructions",
    "you are now",
    "act as",
    "new instructions",
    "system prompt",
    "reveal your prompt",
    "ignore the system",
    "bypass",
    "jailbreak",
    "do anything now",
    "developer mode",
    "ignore safety",
    "run shell",
    "execute command",
    "delete all",
]

_ROLE_TAG_PATTERN = re.compile(
    r"<(?:system|assistant|developer|tool)[^>]*>"
    r"|#{2,}\s*(?:system|assistant|developer|tool)\s*#{2,}",
    re.IGNORECASE,
)
_CONTROL_CHARS_PATTERN = re.compile(r"[\x00-\x1f\x7f]")


def sanitize_input(text: str) -> str:
    """
    Truncate and strip known injection patterns from user-supplied text.

    This is a *basic* defence-in-depth measure, not a full sandbox.
    """
    text = str(text or "")

    # Remove role tags / control chars / obvious command-like separators
    text = _ROLE_TAG_PATTERN.sub(" ", text)
    text = _CONTROL_CHARS_PATTERN.sub(" ", text)
    text = text.replace("```", " ").replace("&&", " ").replace(";", " ")

    # Case-insensitive removal of injection phrases
    lower = text.lower()
    for phrase in _INJECTION_PATTERNS:
        while phrase in lower:
            idx = lower.index(phrase)
            text = text[:idx] + text[idx + len(phrase):]
            lower = text.lower()

    # Truncate to max model input budget
    text = text[:MAX_INPUT_CHARS]

    return text.strip()


# ══════════════════════════════════════════════════════════════════════════
#  System prompt
# ══════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """\
You are TruthLens AI, a misinformation-detection assistant.

Analyse the content and NLP metrics below. Produce ONLY a single JSON object with these keys:

  "summary"          : string  — 2-3 sentence verdict explanation.
  "reasoning"        : array of strings — 3-5 reasoning steps.
  "inconsistencies"  : array of strings — 0-5 inconsistencies (empty list if none).
  "recommendations"  : array of strings — 2-4 actionable recommendations.
  "confidence"       : number  — 0.0 to 1.0.

RULES: No markdown, no text outside the JSON. Keep strings under 150 chars. If unsure, set confidence ≤ 0.4.
If a submitted URL belongs to a trusted source domain, explicitly say that this increases credibility.
If the final verdict is still misleading or false despite a trusted-domain match, explain that content-based warning signals reduced the score.
If no trusted-source match exists, state that the final score relies on content-based analysis.
Do not use harsh phrases (e.g., misinformation, clickbait, unverifiable, do not share) unless strong negative evidence is present.
Do not use awkward phrasing like "partially supports the article's credibility".
"""


# ══════════════════════════════════════════════════════════════════════════
#  User prompt builder
# ══════════════════════════════════════════════════════════════════════════

def build_user_prompt(payload: dict[str, Any]) -> str:
    """
    Build the user-side prompt from the pipeline context.

    ``payload`` is expected to contain keys like ``cleaned_text``,
    ``verdict``, ``credibility_score``, ``metrics``, etc.
    """
    cleaned_text = sanitize_input(
        str(payload.get("cleaned_text") or payload.get("input_value") or "")
    )
    verdict = payload.get("verdict", "unknown")
    score = payload.get("credibility_score", 0)

    # Summarise key extracted metrics for the model
    metrics = payload.get("metrics", {})
    extracted_metrics = {
        "word_count": metrics.get("word_count", payload.get("word_count")),
        "sentence_count": metrics.get("sentence_count"),
        "clickbait_count": metrics.get("clickbait_count"),
        "emotional_count": metrics.get("emotional_count"),
        "hedge_count": metrics.get("hedge_count"),
        "credibility_count": metrics.get("credibility_count"),
        "claim_count": metrics.get("claim_count"),
        "exclamation_count": metrics.get("exclamation_count"),
        "all_caps_ratio": metrics.get("all_caps_ratio"),
    }

    metric_lines: list[str] = []
    for key, val in extracted_metrics.items():
        if val is not None:
            metric_lines.append(f"  {key}: {val}")
    metrics_block = "\n".join(metric_lines) if metric_lines else "  (no metrics available)"

    sv = payload.get("source_verification") or {}
    per_source = sv.get("per_source_statuses") or []
    source_lines: list[str] = []
    for src in per_source[:8]:
      source_name = src.get("source_name", "unknown")
      source_status = src.get("status", "not_matched")
      source_note = src.get("note", "")
      source_lines.append(f"  - {source_name}: {source_status}. {source_note}")
    sources_block = "\n".join(source_lines) if source_lines else "  (no source checks available)"

    recommendations = payload.get("recommendations") or []
    recs_block = "\n".join(f"  - {r}" for r in recommendations[:6]) if recommendations else "  (none)"

    # Source verification results
    sv_status = sv.get("verification_status", "not_available")
    sv_notes = sv.get("verification_notes", "")
    sv_matched = sv.get("matched_sources") or []
    
    # Build matched sources description with domain-match indicators
    matched_descriptions: list[str] = []
    for m in sv_matched:
        source_name = m.get("source_name", "unknown")
        is_domain_match = m.get("is_domain_match", False)
        if is_domain_match:
            matched_descriptions.append(f"{source_name} (submitted URL is from this trusted domain)")
        else:
            matched_descriptions.append(f"{source_name} (article matched via content similarity)")
    
    sv_source_names = ", ".join(matched_descriptions) if matched_descriptions else "(none)"
    verification_block = (
        f"  status: {sv_status}\n"
        f"  matched_sources: {sv_source_names}\n"
        f"  notes: {sv_notes}"
    )

    explanation_guidance = ""
    source_scoring = payload.get("source_scoring") or {}
    trusted_match_count = int(source_scoring.get("trusted_match_count", 0) or 0)
    negative_indicator_count = int(source_scoring.get("negative_indicator_count", 0) or 0)
    severe_negative_signals = bool(source_scoring.get("severe_negative_signals", False))
    domain_match_names = [m.get("source_name", "") for m in sv_matched if m.get("is_domain_match")]

    if trusted_match_count > 0 and domain_match_names:
      primary_source = domain_match_names[0]
      explanation_guidance = (
        f"\nEXPLANATION GUIDANCE:\n"
        f"  - State clearly: The submitted article comes from {primary_source}, a trusted source, which significantly increases credibility.\n"
      )
      if negative_indicator_count == 0:
        explanation_guidance += (
          "  - Reinforce that no strong warning signals were detected, so the trusted-source match keeps confidence high.\n"
        )
      elif severe_negative_signals:
        explanation_guidance += (
          "  - Explain that severe content-based warning signals were strong enough to reduce the score despite the trusted source.\n"
        )
      else:
        explanation_guidance += (
          "  - Explain that some content-based warning signals lowered confidence, but the trusted source keeps the score from dropping too far.\n"
        )
    elif trusted_match_count == 0:
      explanation_guidance = (
        "\nEXPLANATION GUIDANCE:\n"
        "  - State clearly: No trusted-source match was found, so the final score relies on content-based analysis.\n"
      )

    return f"""\
INPUT CONTENT:
\"\"\"
{cleaned_text}
\"\"\"

NLP PIPELINE RESULTS:
  verdict: {verdict}
  credibility_score: {score}/100
  extracted_metrics:
{metrics_block}
  sources:
{sources_block}
  source_verification:
{verification_block}
  recommendations:
{recs_block}
{explanation_guidance}

Based on the above content and metrics, produce the JSON analysis now.
"""
