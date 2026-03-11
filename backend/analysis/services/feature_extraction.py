"""
feature_extraction.py — Keyword, claim & pattern extraction.

Extracts linguistic and structural signals from preprocessed text.
No ML or LLM — purely rule-based pattern matching.
All operations are deterministic.
"""

import re
import logging
from typing import Any

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════════════
#  Keyword / phrase dictionaries
# ══════════════════════════════════════════════════════════════════════════

CLICKBAIT_KEYWORDS: list[str] = [
    "shocking", "unbelievable", "you won't believe", "you will not believe",
    "secret", "exposed", "mind-blowing", "jaw-dropping", "incredible",
    "insane", "epic", "must see", "breaking", "urgent", "exclusive",
    "leaked", "bombshell", "miracle", "banned",
    "they don't want you to know", "they do not want you to know",
    "what they're hiding", "what they are hiding",
    "gone wrong", "goes viral", "top 10", "number one",
    "will blow your mind", "changed my life",
]

EMOTIONAL_KEYWORDS: list[str] = [
    "outrage", "fury", "terrifying", "horrifying", "disgusting",
    "heartbreaking", "devastating", "enraged", "furious",
    "panic", "fear", "hate", "destroy", "war", "crisis",
    "catastrophe", "disaster", "chaos", "scam", "hoax",
    "alarming", "shocking", "shameful", "tragic", "appalling",
    "atrocity", "nightmare", "scandal", "betrayal", "corruption",
]

CREDIBILITY_BOOSTERS: list[str] = [
    "according to", "study shows", "research indicates",
    "peer-reviewed", "published in", "official statement",
    "confirmed by", "evidence suggests", "data shows",
    "university of", "journal of", "department of",
    "clinical trial", "scientific consensus", "systematic review",
    "meta-analysis", "world health organization", "centers for disease control",
    "national institute", "federal reserve", "bureau of statistics",
]

HEDGE_WORDS: list[str] = [
    "allegedly", "reportedly", "sources say", "rumor", "rumour",
    "unconfirmed", "unverified", "claimed", "purported",
    "so-called", "might", "could be", "possibly", "perhaps",
    "it is believed", "some people say", "appears to be",
    "may have", "seems to", "it is thought", "speculated",
]

ABSOLUTE_WORDS: list[str] = [
    "always", "never", "every", "none", "all", "nobody",
    "everyone", "everything", "nothing", "impossible", "guaranteed",
    "proven", "definitely", "certainly", "undeniably", "absolutely",
    "totally", "completely", "100%", "zero chance",
]

SUPERLATIVE_PATTERNS: list[str] = [
    "best", "worst", "most", "least", "greatest", "biggest",
    "largest", "smallest", "deadliest", "fastest", "highest",
    "lowest", "first ever", "only ever", "never before",
]

# ── domain reputation lists ──────────────────────────────────────────────

TRUSTED_DOMAINS: list[str] = [
    "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk",
    "nytimes.com", "washingtonpost.com", "theguardian.com",
    "nature.com", "sciencedirect.com", "gov.in", "nic.in",
    "who.int", "un.org", "cdc.gov", "nih.gov", "nasa.gov",
    "worldbank.org", "imf.org", "economist.com",
]

UNTRUSTED_DOMAIN_PATTERNS: list[str] = [
    r"blogspot\.", r"wordpress\.com", r"medium\.com/@",
    r"facebook\.com", r"twitter\.com", r"tiktok\.com",
    r"reddit\.com", r"tumblr\.com", r"4chan\.org",
]

# ── claim patterns (regex) ───────────────────────────────────────────────

_CLAIM_PATTERNS: list[tuple[str, str]] = [
    (r"\b\d+\s*(?:percent|%)\b", "percentage_claim"),
    (r"\b(?:million|billion|trillion|thousand|hundred)\b", "large_number_claim"),
    (r"\b(?:kills?|killed|deaths?|died|dead)\s+\d+", "casualty_claim"),
    (r"\b\d+\s+(?:people|persons|individuals|children|women|men)\b", "population_claim"),
    (r"\bcure(?:s|d)?\s+(?:for|of)\b", "cure_claim"),
    (r"\bcause(?:s|d)?\s+(?:cancer|autism|death|disease)\b", "causation_claim"),
    (r"\bgovernment\s+(?:cover|hide|conceal|suppress)", "conspiracy_claim"),
    (r"\b(?:exposed|reveals?|leaked|whistleblow)", "exposure_claim"),
    (r"\b(?:study|research|trial|experiment)\s+(?:shows?|proves?|finds?|found)\b", "research_claim"),
    (r"\b(?:expert|scientist|doctor|professor)s?\s+(?:say|warn|confirm|agree)\b", "appeal_to_authority"),
]


# ══════════════════════════════════════════════════════════════════════════
#  Internal helpers
# ══════════════════════════════════════════════════════════════════════════

def _match_keywords(text: str, keywords: list[str]) -> list[str]:
    """Return which keywords/phrases appear in *text*."""
    return [kw for kw in keywords if kw in text]


def _extract_claims(text: str) -> list[dict[str, str]]:
    """
    Detect factual-looking claims via regex patterns.

    Returns a list of ``{"type": ..., "match": ...}`` dicts.
    """
    claims: list[dict[str, str]] = []
    for pattern, claim_type in _CLAIM_PATTERNS:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            claims.append({"type": claim_type, "match": m.group()})
    return claims


def _detect_patterns(text: str, original: str) -> dict[str, Any]:
    """
    Detect structural / linguistic patterns in the text.

    Returns a dict of boolean / numeric pattern signals.
    """
    # Passive-voice approximation  ("was/were/been/being" + past-participle-ish)
    passive_hits = len(re.findall(
        r"\b(?:was|were|been|being|is|are)\s+\w+ed\b", text,
    ))

    # Repeated punctuation  (e.g. "???" or "...")
    repeated_punct = len(re.findall(r"[?!.]{3,}", original))

    # ALL-CAPS words (length > 1, computed on original)
    original_words = original.split()
    caps_words = [w for w in original_words if w.isupper() and len(w) > 1]
    all_caps_ratio = round(len(caps_words) / max(len(original_words), 1), 2)

    # First-person dominance  —  misinformation often uses "I saw…", "my friend…"
    first_person_count = len(re.findall(
        r"\b(?:i|me|my|mine|myself|we|us|our|ours)\b", text,
    ))

    # Third-person attribution  —  credible text references others
    third_person_count = len(re.findall(
        r"\b(?:he|she|they|their|them|his|her|its|the\s+(?:study|report|data))\b",
        text,
    ))

    return {
        "passive_voice_count": passive_hits,
        "repeated_punctuation": repeated_punct,
        "all_caps_words": caps_words,
        "all_caps_ratio": all_caps_ratio,
        "first_person_count": first_person_count,
        "third_person_count": third_person_count,
    }


# ══════════════════════════════════════════════════════════════════════════
#  Public entry-point
# ══════════════════════════════════════════════════════════════════════════

def extract_features(ctx: dict) -> dict:
    """
    Analyse the preprocessed context and populate ``ctx["features"]``.

    Feature groups
    ──────────────
    • Keyword hits  — clickbait, emotional, credibility, hedge, absolute, superlative
    • Structural    — numbers, dates, quotes, question/exclamation marks, caps
    • Claims        — factual-sounding assertions detected by regex
    • Patterns      — passive voice, repeated punct, person dominance
    • Domain trust  — trusted vs. untrusted domain (URL inputs)
    """

    text: str = ctx["cleaned_text"]
    original: str = ctx["original_text"]

    # ── keyword matching ─────────────────────────────────────────────
    clickbait   = _match_keywords(text, CLICKBAIT_KEYWORDS)
    emotional   = _match_keywords(text, EMOTIONAL_KEYWORDS)
    credibility = _match_keywords(text, CREDIBILITY_BOOSTERS)
    hedge       = _match_keywords(text, HEDGE_WORDS)
    absolutes   = _match_keywords(text, ABSOLUTE_WORDS)
    superlatives = _match_keywords(text, SUPERLATIVE_PATTERNS)

    # ── structural signals ───────────────────────────────────────────
    has_numbers = bool(re.search(r"\d+", text))
    has_dates = bool(re.search(
        r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}"
        r"|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2})",
        text,
    ))
    has_quotes = '"' in original or "\u201c" in original or "\u2018" in original
    has_question_marks = "?" in original
    exclamation_count = original.count("!")

    sentence_count = max(len(ctx.get("sentences") or [1]), 1)

    # ── claim extraction ─────────────────────────────────────────────
    claims = _extract_claims(text)
    claim_types = list({c["type"] for c in claims})

    # ── pattern detection ────────────────────────────────────────────
    patterns = _detect_patterns(text, original)

    # ── domain analysis (URL inputs) ─────────────────────────────────
    domain: str = ctx.get("domain") or ""
    domain_trusted = any(td in domain for td in TRUSTED_DOMAINS) if domain else False
    domain_untrusted = any(
        re.search(pat, domain) for pat in UNTRUSTED_DOMAIN_PATTERNS
    ) if domain else False

    # ── lexical diversity (type-token ratio) ─────────────────────────
    tokens_ns = ctx.get("tokens_no_stop") or []
    unique_tokens = set(tokens_ns)
    lexical_diversity = round(
        len(unique_tokens) / max(len(tokens_ns), 1), 2,
    )

    # ── average word length ──────────────────────────────────────────
    tokens = ctx.get("tokens") or []
    avg_word_len = round(
        sum(len(t) for t in tokens) / max(len(tokens), 1), 1,
    )

    # ── assemble feature dict ────────────────────────────────────────
    features: dict[str, Any] = {
        # keyword hits
        "clickbait_hits":   clickbait,
        "emotional_hits":   emotional,
        "credibility_hits": credibility,
        "hedge_hits":       hedge,
        "absolute_hits":    absolutes,
        "superlative_hits": superlatives,
        # structural
        "has_numbers":        has_numbers,
        "has_dates":          has_dates,
        "has_quotes":         has_quotes,
        "has_question_marks": has_question_marks,
        "exclamation_count":  exclamation_count,
        "all_caps_ratio":     patterns["all_caps_ratio"],
        "all_caps_words":     patterns["all_caps_words"],
        "sentence_count":     sentence_count,
        # claims
        "claims":       claims,
        "claim_types":  claim_types,
        # patterns
        "passive_voice_count":   patterns["passive_voice_count"],
        "repeated_punctuation":  patterns["repeated_punctuation"],
        "first_person_count":    patterns["first_person_count"],
        "third_person_count":    patterns["third_person_count"],
        # lexical
        "lexical_diversity": lexical_diversity,
        "avg_word_length":   avg_word_len,
        # domain
        "domain_trusted":   domain_trusted,
        "domain_untrusted": domain_untrusted,
    }

    ctx["features"] = features

    logger.debug(
        "Features: clickbait=%d emotional=%d credibility=%d hedge=%d "
        "claims=%d absolutes=%d superlatives=%d",
        len(clickbait), len(emotional), len(credibility), len(hedge),
        len(claims), len(absolutes), len(superlatives),
    )
    return ctx
