"""
source_verifier.py - Verify submitted news against trusted-source coverage.

Uses event/topic/claim/entity similarity on candidate trusted-source articles.
Keyword extraction helps query generation but is never the final decision.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Any
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_SEARCH_TIMEOUT = 5
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
_MAX_QUERY_TERMS = 10
_MATCH_THRESHOLD = 0.58
_PARTIAL_THRESHOLD = 0.42

_DEBUNK_TERMS = {
    "false", "debunk", "debunked", "misleading", "hoax", "fabricated",
    "fact check", "fact-check", "not true", "baseless", "disputed",
}

_STOPWORDS = frozenset({
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "is", "it", "its", "by", "as", "be", "was", "were", "are", "been",
    "has", "have", "had", "do", "does", "did", "not", "no", "so", "if",
    "from", "that", "this", "with", "will", "can", "may", "would", "could",
    "should", "about", "into", "than", "then", "also", "just", "more",
    "some", "very", "what", "when", "where", "which", "who", "whom", "how",
    "all", "each", "there", "their", "they", "them", "he", "she", "we",
    "you", "i", "me", "my", "our", "your", "his", "her", "up", "out",
    "over", "after", "before", "between", "under", "through", "during",
    "said", "says", "new", "one", "two",
})

_GENERIC_NEWS_WORDS = frozenset({
    "news", "update", "updates", "report", "reports", "latest", "today",
    "breaking", "live", "world", "home", "video", "watch", "read", "more",
    "story", "stories", "article", "follow", "share", "subscribe", "login",
    "cookie", "cookies", "privacy", "terms", "contact", "search", "menu",
})


@dataclass
class TrustedSource:
    name: str
    search_url: str
    domain: str


TRUSTED_SOURCES: list[TrustedSource] = [
    TrustedSource("BBC", "https://www.bbc.com/search?q={query}", "bbc.com"),
    TrustedSource("Reuters", "https://www.reuters.com/search/news?query={query}", "reuters.com"),
    TrustedSource("AP News", "https://apnews.com/search?q={query}", "apnews.com"),
    TrustedSource("The Guardian", "https://www.theguardian.com/search?q={query}", "theguardian.com"),
    TrustedSource("Al Jazeera", "https://www.aljazeera.com/search/{query}", "aljazeera.com"),
    TrustedSource("Times of India", "https://timesofindia.indiatimes.com/topic/{query}", "timesofindia.indiatimes.com"),
]


@dataclass
class SourceVerificationResult:
    verification_enabled: bool = True
    verification_status: str = "unsupported"  # supported | partially_supported | unsupported
    matched_sources: list[dict[str, Any]] = field(default_factory=list)
    source_count: int = 0
    verification_notes: str = ""
    per_source_statuses: list[dict[str, Any]] = field(default_factory=list)
    contradiction_count: int = 0


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z]{3,}", (text or "").lower())


def _token_set(text: str) -> set[str]:
    raw = set(_tokenize(text))
    return raw - _STOPWORDS - _GENERIC_NEWS_WORDS


def _extract_entities(text: str) -> set[str]:
    if not text:
        return set()
    entities = set(
        m.strip()
        for m in re.findall(r"\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b", text)
        if len(m.strip()) > 2
    )
    return entities


def _extract_main_claim(text: str) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", (text or "").strip())
    for sent in sentences:
        if len(sent.strip()) >= 35:
            return sent.strip()[:220]
    return (text or "").strip()[:220]


def _extract_topic_terms(text: str, title: str = "") -> list[str]:
    combined = f"{title} {text}".strip()
    terms: list[str] = []
    seen: set[str] = set()
    for tok in _tokenize(combined):
        if tok in _STOPWORDS or tok in _GENERIC_NEWS_WORDS or tok in seen:
            continue
        seen.add(tok)
        terms.append(tok)
        if len(terms) >= _MAX_QUERY_TERMS:
            break
    return terms


def _build_search_query(topic_terms: list[str], entities: set[str]) -> str:
    entity_terms = [e for e in entities if len(e) > 3][:4]
    query_terms = topic_terms[:6] + [e.replace(" ", " ") for e in entity_terms]
    compact = " ".join(query_terms).strip()
    return compact or "latest news"


def _trusted_source_from_url(submitted_url: str) -> TrustedSource | None:
    if not submitted_url:
        return None
    try:
        host = (urlparse(submitted_url).hostname or "").lower()
    except Exception:
        return None

    if host.startswith("www."):
        host = host[4:]

    for source in TRUSTED_SOURCES:
        domain = source.domain.lower()
        if host == domain or host.endswith(f".{domain}"):
            return source
    return None


def _auto_match_decision(source: TrustedSource, title: str = "") -> dict[str, Any]:
    return {
        "source_name": source.name,
        "domain": source.domain,
        "status": "matched",
        "similarity_score": 1.0,
        "matched_headline": (title or f"Submitted URL from {source.name}")[:180],
        "matched_entities": [],
        "similarity_breakdown": {
            "title_similarity": 1.0,
            "topic_similarity": 1.0,
            "entity_similarity": 1.0,
            "claim_similarity": 1.0,
            "text_similarity": 1.0,
            "overall_similarity": 1.0,
        },
        "note": f"{source.name} matched — submitted URL belongs to trusted source domain.",
        "is_domain_match": True,
    }


def _status_entry(decision: dict[str, Any]) -> dict[str, Any]:
    return {
        "source_name": decision["source_name"],
        "status": decision["status"],
        "note": decision["note"],
        "similarity_score": decision.get("similarity_score", 0.0),
        "is_domain_match": bool(decision.get("is_domain_match", False)),
    }


def _deduplicate_sources(matched_sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Deduplicate matched sources by source_name, keeping only the best match."""
    if not matched_sources:
        return matched_sources

    best_by_name: dict[str, dict[str, Any]] = {}
    for source_entry in matched_sources:
        source_name = source_entry.get("source_name", "")
        if source_name not in best_by_name:
            best_by_name[source_name] = source_entry
        else:
            # Keep the one with higher similarity score, or prefer domain_match
            existing = best_by_name[source_name]
            is_new_domain = source_entry.get("is_domain_match", False)
            is_existing_domain = existing.get("is_domain_match", False)

            # Prefer domain matches
            if is_new_domain and not is_existing_domain:
                best_by_name[source_name] = source_entry
            # If both or neither are domain matches, prefer higher similarity
            elif new_score := source_entry.get("similarity_score", 0):
                existing_score = existing.get("similarity_score", 0)
                if new_score > existing_score:
                    best_by_name[source_name] = source_entry

    return list(best_by_name.values())


def _extract_candidates(html: str) -> list[dict[str, str]]:
    soup = BeautifulSoup(html[:700_000], "html.parser")
    candidates: list[dict[str, str]] = []

    for card in soup.find_all(["article", "li", "div"]):
        heading = card.find(["h1", "h2", "h3", "h4"])
        if not heading:
            continue
        headline = heading.get_text(" ", strip=True)
        if not (20 <= len(headline) <= 260):
            continue
        para = card.find("p")
        snippet = para.get_text(" ", strip=True)[:240] if para else ""
        candidates.append({"headline": headline, "snippet": snippet})
        if len(candidates) >= 70:
            break

    if not candidates:
        for tag in soup.find_all(["h1", "h2", "h3"]):
            headline = tag.get_text(" ", strip=True)
            if 20 <= len(headline) <= 260:
                candidates.append({"headline": headline, "snippet": ""})

    return candidates


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def _seq(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _is_contradiction(text: str) -> bool:
    lower = (text or "").lower()
    return any(term in lower for term in _DEBUNK_TERMS)


def _similarity_breakdown(
    submitted_title: str,
    submitted_claim: str,
    submitted_topic_tokens: set[str],
    submitted_entities: set[str],
    candidate_headline: str,
    candidate_snippet: str,
) -> dict[str, float]:
    candidate_text = f"{candidate_headline} {candidate_snippet}".strip()
    candidate_tokens = _token_set(candidate_text)
    candidate_entities = _extract_entities(candidate_text)

    title_sim = _seq(submitted_title or submitted_claim, candidate_headline)
    topic_sim = _jaccard(submitted_topic_tokens, candidate_tokens)
    entity_sim = _jaccard({e.lower() for e in submitted_entities}, {e.lower() for e in candidate_entities})
    claim_sim = _seq(submitted_claim, candidate_text)
    text_sim = _seq(" ".join(list(submitted_topic_tokens)[:15]), candidate_text)

    overall = (
        0.28 * title_sim +
        0.25 * topic_sim +
        0.20 * entity_sim +
        0.17 * claim_sim +
        0.10 * text_sim
    )

    return {
        "title_similarity": round(title_sim, 3),
        "topic_similarity": round(topic_sim, 3),
        "entity_similarity": round(entity_sim, 3),
        "claim_similarity": round(claim_sim, 3),
        "text_similarity": round(text_sim, 3),
        "overall_similarity": round(overall, 3),
    }


def _check_source(
    source: TrustedSource,
    query: str,
    submitted_title: str,
    submitted_claim: str,
    submitted_topic_tokens: set[str],
    submitted_entities: set[str],
) -> dict[str, Any]:
    url = source.search_url.replace("{query}", requests.utils.quote(query))

    default_status = {
        "source_name": source.name,
        "domain": source.domain,
        "status": "not_matched",
        "similarity_score": 0.0,
        "matched_headline": "",
        "matched_entities": [],
        "note": f"{source.name} not matched",
    }

    try:
        resp = requests.get(
            url,
            timeout=_SEARCH_TIMEOUT,
            headers={
                "User-Agent": _USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
            allow_redirects=True,
        )
        if resp.status_code != 200:
            logger.debug("Source [%s] HTTP %d", source.name, resp.status_code)
            return default_status

        candidates = _extract_candidates(resp.text)
        logger.debug("Source [%s] candidates=%d", source.name, len(candidates))

        best: dict[str, Any] | None = None
        best_score = 0.0

        for cand in candidates:
            breakdown = _similarity_breakdown(
                submitted_title,
                submitted_claim,
                submitted_topic_tokens,
                submitted_entities,
                cand["headline"],
                cand["snippet"],
            )
            score = breakdown["overall_similarity"]
            if score > best_score:
                best_score = score
                best = {
                    "headline": cand["headline"],
                    "snippet": cand["snippet"],
                    "breakdown": breakdown,
                    "entities": sorted(list(_extract_entities(f"{cand['headline']} {cand['snippet']}")))[:8],
                }

        if not best:
            return default_status

        contradiction = _is_contradiction(f"{best['headline']} {best['snippet']}")

        if contradiction and best_score >= _PARTIAL_THRESHOLD:
            return {
                "source_name": source.name,
                "domain": source.domain,
                "status": "contradicted",
                "similarity_score": round(best_score, 2),
                "matched_headline": best["headline"][:180],
                "matched_entities": best["entities"],
                "similarity_breakdown": best["breakdown"],
                "note": f"{source.name} contradiction: reports the claim as false/misleading.",
            }

        if best_score >= _MATCH_THRESHOLD:
            return {
                "source_name": source.name,
                "domain": source.domain,
                "status": "matched",
                "similarity_score": round(best_score, 2),
                "matched_headline": best["headline"][:180],
                "matched_entities": best["entities"],
                "similarity_breakdown": best["breakdown"],
                "note": f"{source.name} matched: covers the same event/topic.",
            }

        if best_score >= _PARTIAL_THRESHOLD:
            return {
                "source_name": source.name,
                "domain": source.domain,
                "status": "partial",
                "similarity_score": round(best_score, 2),
                "matched_headline": best["headline"][:180],
                "matched_entities": best["entities"],
                "similarity_breakdown": best["breakdown"],
                "note": f"{source.name} partial: related story but not the same core claim.",
            }

        return default_status

    except requests.Timeout:
        logger.debug("Source [%s] timed out", source.name)
        return default_status
    except Exception as exc:
        logger.debug("Source [%s] error: %s", source.name, exc)
        return default_status


def verify_sources(text: str, title: str = "", submitted_url: str = "") -> SourceVerificationResult:
    auto_source = _trusted_source_from_url(submitted_url)

    if not text or not text.strip():
        per_source_statuses: list[dict[str, Any]] = []
        matched_sources: list[dict[str, Any]] = []

        for src in TRUSTED_SOURCES:
            if auto_source and src.name == auto_source.name:
                decision = _auto_match_decision(src, title)
                matched_sources.append(decision)
            else:
                decision = {
                    "source_name": src.name,
                    "status": "not_matched",
                    "note": f"{src.name} not matched",
                    "similarity_score": 0.0,
                    "is_domain_match": False,
                }
            per_source_statuses.append(_status_entry(decision))

        source_count = len(matched_sources)
        status = "partially_supported" if source_count == 1 else "unsupported"
        notes = " ".join(item["note"] for item in per_source_statuses)

        return SourceVerificationResult(
            verification_enabled=True,
            verification_status=status,
            matched_sources=matched_sources,
            source_count=source_count,
            verification_notes=notes,
            per_source_statuses=per_source_statuses,
            contradiction_count=0,
        )

    topic_terms = _extract_topic_terms(text, title)
    submitted_topic_tokens = set(topic_terms)
    submitted_entities = _extract_entities(f"{title} {text}")
    submitted_claim = _extract_main_claim(text)
    submitted_title = (title or submitted_claim)[:220]

    query = _build_search_query(topic_terms, submitted_entities)
    logger.info("Source verification query=%r terms=%s entities=%s", query, topic_terms, sorted(list(submitted_entities))[:8])

    per_source_statuses: list[dict[str, Any]] = []
    matched_sources: list[dict[str, Any]] = []
    contradiction_count = 0
    partial_count = 0
    domain_matched_sources: set[str] = set()  # Track which sources were domain-matched

    for source in TRUSTED_SOURCES:
        if auto_source and source.name == auto_source.name:
            decision = _auto_match_decision(source, submitted_title)
            domain_matched_sources.add(source.name)
            logger.info("Source verification auto-match: source=%s url=%s", source.name, submitted_url)
        else:
            decision = _check_source(
                source,
                query,
                submitted_title,
                submitted_claim,
                submitted_topic_tokens,
                submitted_entities,
            )
        
        # Ensure is_domain_match flag is set
        if "is_domain_match" not in decision:
            decision["is_domain_match"] = source.name in domain_matched_sources

        per_source_statuses.append(_status_entry(decision))

        if decision["status"] == "matched":
            matched_sources.append(decision)
        elif decision["status"] == "contradicted":
            contradiction_count += 1
        elif decision["status"] == "partial":
            partial_count += 1

    # Deduplicate matched sources by source_name
    matched_sources = _deduplicate_sources(matched_sources)

    source_count = len(matched_sources)

    if contradiction_count > 0:
        verification_status = "unsupported"
    elif source_count >= 2:
        verification_status = "supported"
    elif source_count == 1 or partial_count > 0:
        verification_status = "partially_supported"
    else:
        verification_status = "unsupported"

    notes = " ".join(item["note"] for item in per_source_statuses)

    logger.info(
        "Source verification complete: status=%s matched=%d partial=%d contradictions=%d domain_matched=%s",
        verification_status,
        source_count,
        partial_count,
        contradiction_count,
        list(domain_matched_sources),
    )

    return SourceVerificationResult(
        verification_enabled=True,
        verification_status=verification_status,
        matched_sources=matched_sources,
        source_count=source_count,
        verification_notes=notes,
        per_source_statuses=per_source_statuses,
        contradiction_count=contradiction_count,
    )
