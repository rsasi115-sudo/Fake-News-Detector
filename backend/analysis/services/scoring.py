"""
scoring.py — Deterministic rule-based credibility scoring.

Takes the feature-enriched context and produces a numeric score + verdict.
Fully deterministic — no randomness, no ML, no LLM.
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)


def _clamp(value: int, lo: int = 0, hi: int = 100) -> int:
    """Clamp *value* between *lo* and *hi*."""
    return max(lo, min(hi, value))


# ══════════════════════════════════════════════════════════════════════════
#  Verdict thresholds
# ══════════════════════════════════════════════════════════════════════════

_VERDICT_THRESHOLDS: list[tuple[int, str]] = [
    (30, "false"),        # 0  – 30
    (50, "misleading"),   # 31 – 50
    (70, "unknown"),      # 51 – 70
    (100, "true"),        # 71 – 100
]


def _score_to_verdict(score: int) -> str:
    """Map a clamped 0–100 score to a verdict label."""
    for threshold, verdict in _VERDICT_THRESHOLDS:
        if score <= threshold:
            return verdict
    return "unknown"  # fallback


# ══════════════════════════════════════════════════════════════════════════
#  Scoring rules  (each is a standalone function for testability)
# ══════════════════════════════════════════════════════════════════════════

def _apply_clickbait_rules(
    features: dict, apply: Any,
) -> None:
    hits = features["clickbait_hits"]
    n = len(hits)
    if n >= 4:
        apply(-25, f"Very high clickbait density ({n} keywords)")
    elif n >= 2:
        apply(-15, f"Clickbait keywords: {', '.join(hits[:5])}")
    elif n == 1:
        apply(-8, f"Clickbait keyword: {hits[0]}")


def _apply_emotional_rules(
    features: dict, apply: Any,
) -> None:
    hits = features["emotional_hits"]
    n = len(hits)
    if n >= 4:
        apply(-20, f"Heavy emotional language ({n} keywords)")
    elif n >= 2:
        apply(-10, f"Emotional keywords: {', '.join(hits[:5])}")
    elif n == 1:
        apply(-5, f"Emotional keyword: {hits[0]}")


def _apply_credibility_rules(
    features: dict, apply: Any,
) -> None:
    hits = features["credibility_hits"]
    n = len(hits)
    if n >= 3:
        apply(20, f"Strong credibility indicators ({n})")
    elif n >= 1:
        apply(8 * n, f"Credibility indicators: {', '.join(hits[:5])}")


def _apply_hedge_rules(
    features: dict, apply: Any,
) -> None:
    hits = features["hedge_hits"]
    n = len(hits)
    if n >= 3:
        apply(-12, f"Heavy hedging language ({n} words)")
    elif n >= 1:
        apply(-4 * n, f"Hedge words: {', '.join(hits[:5])}")


def _apply_absolute_rules(
    features: dict, apply: Any,
) -> None:
    hits = features.get("absolute_hits", [])
    n = len(hits)
    if n >= 3:
        apply(-15, f"Excessive absolute language ({n} words)")
    elif n >= 1:
        apply(-5 * n, f"Absolute words: {', '.join(hits[:5])}")


def _apply_superlative_rules(
    features: dict, apply: Any,
) -> None:
    hits = features.get("superlative_hits", [])
    n = len(hits)
    if n >= 3:
        apply(-10, f"Heavy superlative usage ({n} words)")
    elif n >= 1:
        apply(-3 * n, f"Superlatives: {', '.join(hits[:5])}")


def _apply_claim_rules(
    features: dict, apply: Any,
) -> None:
    claims = features.get("claims", [])
    types = features.get("claim_types", [])
    if not claims:
        return

    # Conspiracy / cure claims are red flags
    red_flag_types = {"conspiracy_claim", "cure_claim", "causation_claim"}
    red_flags = [c for c in claims if c["type"] in red_flag_types]
    neutral_claims = [c for c in claims if c["type"] not in red_flag_types]

    if red_flags:
        apply(-15, f"Suspicious claims detected: {', '.join(c['type'] for c in red_flags[:3])}")

    # Research / authority claims are mildly positive
    research_types = {"research_claim", "appeal_to_authority"}
    research_claims = [c for c in claims if c["type"] in research_types]
    if research_claims:
        apply(6, f"Research/authority references ({len(research_claims)})")

    # Having factual-looking claims (numbers, percentages) is neutral-to-positive
    if len(neutral_claims) >= 2 and not red_flags:
        apply(4, f"Multiple factual claims detected ({len(neutral_claims)})")


def _apply_structural_rules(
    features: dict, ctx: dict, apply: Any,
) -> None:
    """Punctuation, caps, questions, quotes, length."""

    # Exclamation marks
    exc = features["exclamation_count"]
    if exc >= 5:
        apply(-15, f"Excessive exclamation marks ({exc})")
    elif exc >= 3:
        apply(-10, f"Many exclamation marks ({exc})")
    elif exc >= 1:
        apply(-3, f"Exclamation marks ({exc})")

    # ALL-CAPS ratio
    caps = features["all_caps_ratio"]
    if caps >= 0.5:
        apply(-18, f"High ALL-CAPS ratio ({caps})")
    elif caps >= 0.3:
        apply(-10, f"Significant ALL-CAPS ratio ({caps})")
    elif caps >= 0.15:
        apply(-5, f"Moderate ALL-CAPS ratio ({caps})")

    # Repeated punctuation  (??? or !!!)
    rp = features.get("repeated_punctuation", 0)
    if rp >= 2:
        apply(-8, f"Repeated punctuation patterns ({rp})")
    elif rp == 1:
        apply(-3, "Repeated punctuation detected")

    # Question marks
    if features["has_question_marks"]:
        apply(-3, "Contains question marks (uncertain framing)")

    # Presence of numbers / dates (specificity)
    if features["has_numbers"]:
        apply(4, "Contains specific numbers")
    if features["has_dates"]:
        apply(5, "Contains specific dates")

    # Quoted text (attribution)
    if features["has_quotes"]:
        apply(4, "Contains quoted text (attribution)")

    # Text length
    wc = ctx["word_count"]
    if wc < 8:
        apply(-12, f"Very short text ({wc} words)")
    elif wc < 20:
        apply(-6, f"Short text ({wc} words)")
    elif wc > 300:
        apply(8, f"Very detailed text ({wc} words)")
    elif wc > 150:
        apply(5, f"Detailed text ({wc} words)")

    # Sentence count  —  single-sentence texts are often headlines
    sc = features["sentence_count"]
    if sc == 1 and wc > 5:
        apply(-4, "Single-sentence input (headline-like)")
    elif sc >= 5:
        apply(3, f"Multi-sentence text ({sc} sentences)")


def _apply_linguistic_rules(
    features: dict, apply: Any,
) -> None:
    """Passive voice, person dominance, lexical diversity."""

    # Passive voice (mild positive — formal writing)
    pv = features.get("passive_voice_count", 0)
    if pv >= 3:
        apply(4, f"Formal passive-voice usage ({pv} instances)")
    elif pv >= 1:
        apply(2, f"Some passive-voice constructions ({pv})")

    # First-person dominance (mild negative — anecdotal/opinion)
    fp = features.get("first_person_count", 0)
    tp = features.get("third_person_count", 0)
    if fp >= 5 and tp < 2:
        apply(-8, f"Heavy first-person language ({fp} pronouns)")
    elif fp >= 3 and tp < 2:
        apply(-4, f"First-person dominant ({fp} pronouns)")

    # Lexical diversity
    ld = features.get("lexical_diversity", 0.5)
    if ld >= 0.85:
        apply(5, f"High lexical diversity ({ld})")
    elif ld <= 0.3 and ld > 0:
        apply(-5, f"Low lexical diversity ({ld}) — repetitive language")


def _apply_domain_rules(
    features: dict, ctx: dict, apply: Any,
) -> None:
    """Trusted / untrusted domain scoring (URL inputs only)."""
    if features["domain_trusted"]:
        apply(20, f"Trusted domain: {ctx.get('domain', '')}")
    if features["domain_untrusted"]:
        apply(-18, f"Untrusted / user-generated domain: {ctx.get('domain', '')}")


# ══════════════════════════════════════════════════════════════════════════
#  Public entry-point
# ══════════════════════════════════════════════════════════════════════════

def compute_score(ctx: dict) -> dict:
    """
    Apply all scoring rules to the feature context.

    Adds to ``ctx``:
      - ``credibility_score``  (int 0–100)
      - ``verdict``            ("true" | "false" | "misleading" | "unknown")
      - ``scoring_breakdown``  (list of rule applications for transparency)
    """

    features: dict = ctx["features"]
    score: int = 50  # neutral starting point
    breakdown: list[dict] = []

    def apply(delta: int, reason: str) -> None:
        nonlocal score
        score += delta
        breakdown.append({
            "delta": delta,
            "reason": reason,
            "running": _clamp(score),
        })

    # ── apply all rule groups ────────────────────────────────────────
    _apply_clickbait_rules(features, apply)
    _apply_emotional_rules(features, apply)
    _apply_credibility_rules(features, apply)
    _apply_hedge_rules(features, apply)
    _apply_absolute_rules(features, apply)
    _apply_superlative_rules(features, apply)
    _apply_claim_rules(features, apply)
    _apply_structural_rules(features, ctx, apply)
    _apply_linguistic_rules(features, apply)
    _apply_domain_rules(features, ctx, apply)

    # ── finalise ─────────────────────────────────────────────────────
    final_score = _clamp(score)
    verdict = _score_to_verdict(final_score)

    ctx["credibility_score"] = final_score
    ctx["verdict"] = verdict
    ctx["scoring_breakdown"] = breakdown

    logger.info("Score computed: %d -> verdict=%s  (%d rules applied)", final_score, verdict, len(breakdown))
    return ctx
