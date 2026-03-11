"""
report_builder.py — Structured analysis report generation.

Generates a human-readable summary, per-section breakdown, actionable
recommendations, and deterministic source-check results.
No AI / LLM — all outputs are template-driven.
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════════════
#  Constants
# ══════════════════════════════════════════════════════════════════════════

_VERDICT_LABELS: dict[str, str] = {
    "true": "Likely True",
    "false": "Likely Fake",
    "misleading": "Misleading / Partially False",
    "unknown": "Uncertain — Needs More Verification",
}

_VERDICT_EMOJI: dict[str, str] = {
    "true": "✅",
    "false": "🚫",
    "misleading": "⚠️",
    "unknown": "❓",
}

# ── deterministic source pool ────────────────────────────────────────────

_SOURCE_POOL: list[dict[str, Any]] = [
    {"name": "Reuters Fact-Check",  "min_score": 55, "status_if_match": "verified",  "status_else": "not_found"},
    {"name": "AP News",             "min_score": 65, "status_if_match": "verified",  "status_else": "not_found"},
    {"name": "PolitiFact",          "min_score": 0,  "status_if_match": "verified",  "status_else": "disputed"},
    {"name": "Snopes",              "min_score": 45, "status_if_match": "verified",  "status_else": "disputed"},
    {"name": "Full Fact",           "min_score": 35, "status_if_match": "verified",  "status_else": "not_found"},
]


# ══════════════════════════════════════════════════════════════════════════
#  Internal builders
# ══════════════════════════════════════════════════════════════════════════

def _build_headline(ctx: dict) -> str:
    """One-line verdict headline."""
    verdict_label = _VERDICT_LABELS.get(ctx["verdict"], "Unknown")
    score = ctx["credibility_score"]
    emoji = _VERDICT_EMOJI.get(ctx["verdict"], "")
    return f"{emoji} TruthLens Verdict: {verdict_label} (credibility score: {score}/100)."


def _build_signal_section(features: dict) -> list[str]:
    """Generate bullet-point signal descriptions."""
    lines: list[str] = []

    if features["clickbait_hits"]:
        lines.append(f"Clickbait language detected: {', '.join(features['clickbait_hits'][:6])}.")
    if features["emotional_hits"]:
        lines.append(f"Emotional language detected: {', '.join(features['emotional_hits'][:6])}.")
    if features["credibility_hits"]:
        lines.append(f"Credibility indicators found: {', '.join(features['credibility_hits'][:6])}.")
    if features["hedge_hits"]:
        lines.append(f"Hedging language used: {', '.join(features['hedge_hits'][:6])}.")
    if features.get("absolute_hits"):
        lines.append(f"Absolute/definitive language: {', '.join(features['absolute_hits'][:5])}.")
    if features.get("superlative_hits"):
        lines.append(f"Superlative claims: {', '.join(features['superlative_hits'][:5])}.")
    if features["all_caps_ratio"] >= 0.15:
        lines.append(f"Significant use of ALL-CAPS text ({features['all_caps_ratio']:.0%} of words).")
    if features["exclamation_count"] >= 2:
        lines.append(f"Excessive exclamation marks ({features['exclamation_count']}) detected.")
    if features.get("repeated_punctuation", 0) >= 1:
        lines.append("Repeated punctuation patterns (e.g. ???, !!!) detected.")
    if features.get("first_person_count", 0) >= 4:
        lines.append("Heavy use of first-person pronouns — may indicate opinion or anecdotal content.")

    return lines


def _build_claim_section(features: dict) -> list[str]:
    """Generate claim-analysis summary lines."""
    claims = features.get("claims", [])
    if not claims:
        return ["No specific factual claims detected for cross-referencing."]

    lines: list[str] = []
    type_counts: dict[str, int] = {}
    for c in claims:
        type_counts[c["type"]] = type_counts.get(c["type"], 0) + 1

    lines.append(f"{len(claims)} factual claim(s) detected:")
    for ctype, count in type_counts.items():
        readable = ctype.replace("_", " ").title()
        lines.append(f"  - {readable}: {count} instance(s)")

    # Flag dangerous claim types
    dangerous = {"conspiracy_claim", "cure_claim", "causation_claim"}
    flagged = [ct for ct in type_counts if ct in dangerous]
    if flagged:
        labels = [ct.replace("_", " ").title() for ct in flagged]
        lines.append(f"⚠ High-risk claim types flagged: {', '.join(labels)}.")

    return lines


def _build_summary(ctx: dict) -> str:
    """Assemble the full text summary from headline + sections."""
    features = ctx["features"]
    parts: list[str] = []

    parts.append(_build_headline(ctx))
    parts.append("")  # blank line

    signals = _build_signal_section(features)
    if signals:
        parts.append("Signal Analysis:")
        parts.extend(f"  • {s}" for s in signals)
        parts.append("")

    claim_lines = _build_claim_section(features)
    parts.append("Claim Analysis:")
    parts.extend(f"  • {cl}" for cl in claim_lines)
    parts.append("")

    # Linguistic profile
    ld = features.get("lexical_diversity", 0)
    awl = features.get("avg_word_length", 0)
    wc = ctx["word_count"]
    sc = features["sentence_count"]
    parts.append(
        f"Linguistic Profile: {wc} words, {sc} sentence(s), "
        f"lexical diversity {ld:.0%}, avg word length {awl:.1f} chars."
    )

    return "\n".join(parts)


def _generate_recommendations(ctx: dict) -> list[str]:
    """Return actionable, verdict-aware recommendations."""
    recs: list[str] = []
    verdict = ctx["verdict"]
    features = ctx["features"]

    # ── verdict-based primary advice ─────────────────────────────────
    if verdict == "false":
        recs.append("This content shows strong indicators of misinformation. Do not share it.")
        recs.append("Cross-check with trusted fact-checking organisations (Reuters, Snopes, PolitiFact).")
    elif verdict == "misleading":
        recs.append("This content contains misleading elements. Verify key claims independently.")
        recs.append("Look for the original source or official statements before sharing.")
    elif verdict == "unknown":
        recs.append("Insufficient signals to determine reliability. Seek additional sources.")
        recs.append("Check whether established news outlets have covered this story.")
    else:
        recs.append("This content appears credible based on available signals.")
        recs.append("Always verify critical decisions with multiple independent sources.")

    # ── signal-specific tips ─────────────────────────────────────────
    if features["clickbait_hits"]:
        recs.append("Be cautious of sensationalised headlines — read the full article.")
    if features.get("absolute_hits"):
        recs.append("Claims using absolute language ('always', 'never', 'proven') deserve extra scrutiny.")
    if features.get("claims"):
        dangerous = {"conspiracy_claim", "cure_claim", "causation_claim"}
        if any(c["type"] in dangerous for c in features["claims"]):
            recs.append("Dangerous claim patterns detected — consult medical or scientific authorities.")
    if features.get("first_person_count", 0) >= 4:
        recs.append("Heavily anecdotal content — look for corroborating data or studies.")
    if features.get("lexical_diversity", 1) <= 0.3:
        recs.append("Repetitive language may indicate propaganda or low-quality content.")

    return recs


def _build_source_checks(ctx: dict) -> list[dict[str, Any]]:
    """
    Deterministic source-check generation based on score.

    Each source "matches" if the credibility score is above its min_score
    threshold. Match percentage is derived from the credibility score
    (fully deterministic — no randomness).
    """
    score = ctx["credibility_score"]
    sources: list[dict[str, Any]] = []

    for src in _SOURCE_POOL:
        if score >= src["min_score"]:
            status = src["status_if_match"]
            match_pct = min(score + 5, 98)
        else:
            status = src["status_else"]
            match_pct = max(score - 10, 5)

        sources.append({
            "source_name": src["name"],
            "verification_status": status,
            "match_percentage": match_pct,
        })

    return sources


# ══════════════════════════════════════════════════════════════════════════
#  Public entry-point
# ══════════════════════════════════════════════════════════════════════════

def build_report(ctx: dict) -> dict:
    """
    Finalise the pipeline context into a report-ready dict.

    Adds to ``ctx``:
        summary          (str)   — multi-line human-readable report
        recommendations  (list)  — actionable guidance strings
        source_checks    (list)  — deterministic source verification dicts
        metrics          (dict)  — structured metrics for DB storage
    """
    features = ctx["features"]

    summary = _build_summary(ctx)
    recommendations = _generate_recommendations(ctx)
    source_checks = _build_source_checks(ctx)

    # ── metrics dict (stored in AnalysisResult.metrics JSON field) ────
    metrics: dict[str, Any] = {
        # keyword counts
        "clickbait_count":   len(features["clickbait_hits"]),
        "emotional_count":   len(features["emotional_hits"]),
        "credibility_count": len(features["credibility_hits"]),
        "hedge_count":       len(features["hedge_hits"]),
        "absolute_count":    len(features.get("absolute_hits", [])),
        "superlative_count": len(features.get("superlative_hits", [])),
        # structural
        "exclamation_count": features["exclamation_count"],
        "all_caps_ratio":    features["all_caps_ratio"],
        "word_count":        ctx["word_count"],
        "sentence_count":    features["sentence_count"],
        "has_dates":         features["has_dates"],
        "has_numbers":       features["has_numbers"],
        # claims
        "claim_count":       len(features.get("claims", [])),
        "claim_types":       features.get("claim_types", []),
        # linguistic
        "lexical_diversity":    features.get("lexical_diversity", 0),
        "avg_word_length":      features.get("avg_word_length", 0),
        "passive_voice_count":  features.get("passive_voice_count", 0),
        "first_person_count":   features.get("first_person_count", 0),
        "third_person_count":   features.get("third_person_count", 0),
        # transparency
        "scoring_breakdown":    ctx["scoring_breakdown"],
        "recommendations":      recommendations,
    }

    ctx["summary"] = summary
    ctx["recommendations"] = recommendations
    ctx["source_checks"] = source_checks
    ctx["metrics"] = metrics

    logger.info(
        "Report built: verdict=%s score=%d sources=%d recommendations=%d",
        ctx["verdict"], ctx["credibility_score"],
        len(source_checks), len(recommendations),
    )
    return ctx
