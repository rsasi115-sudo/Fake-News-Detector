"""
prompts.py — Prompt template builders for the Ollama LLM integration.

Templates enforce strict JSON output format so the response can be
machine-parsed without guessing.
"""

from __future__ import annotations

import re
from typing import Any

# ── maximum input length sent to the LLM ─────────────────────────────────

MAX_INPUT_CHARS = 4_000

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
You are TruthLens AI, a specialised misinformation-detection assistant.

INSTRUCTIONS
- Analyse the provided news text / URL and the NLP pipeline metrics.
- Produce ONLY a single JSON object (no markdown, no explanation outside it).
- The JSON object MUST contain these keys:

  "summary"          : string  — a 2-4 sentence overall verdict explanation.
  "reasoning"        : array of strings — 3-6 bullet-point reasoning steps.
  "inconsistencies"  : array of strings — 0-5 inconsistencies found (empty list if none).
  "recommendations"  : array of strings — 2-4 actionable recommendations for the reader.
  "confidence"       : number  — your confidence between 0.0 and 1.0.

HARD RULES
- Do NOT output anything outside the JSON object.
- Do NOT wrap the JSON in markdown code-fences.
- Keep all strings concise (< 200 chars each).
- If you are unsure, say so honestly in the summary and set confidence ≤ 0.4.
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

    sources = payload.get("source_checks") or payload.get("sources") or []
    source_lines: list[str] = []
    for src in sources[:8]:
        source_name = src.get("source_name", "unknown")
        source_status = src.get("verification_status", "unknown")
        match_pct = src.get("match_percentage", "?")
        source_lines.append(f"  - {source_name}: {source_status} ({match_pct}%)")
    sources_block = "\n".join(source_lines) if source_lines else "  (no source checks available)"

    recommendations = payload.get("recommendations") or []
    recs_block = "\n".join(f"  - {r}" for r in recommendations[:6]) if recommendations else "  (none)"

    return f"""\
INPUT TEXT:
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
  recommendations:
{recs_block}

Based on the above, produce the JSON analysis now.
"""
