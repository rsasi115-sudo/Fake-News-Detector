"""
article_extractor.py — Fetch and extract article context from a URL.

Uses a multi-step fallback strategy and always returns the best available
context for downstream analysis.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ── constants ────────────────────────────────────────────────────────────

_REQUEST_TIMEOUT = 8  # seconds
_MAX_RESPONSE_BYTES = 5_000_000  # 5 MB
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
_ACCEPT_LANGUAGE = "en-US,en;q=0.9"

# Hosts we refuse to fetch (loopback / private ranges)
_BLOCKED_HOSTS = re.compile(
    r"^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|"
    r"172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|"
    r"\[::1\]|0\.0\.0\.0)$",
    re.IGNORECASE,
)

_MIN_EXTRACTED_CHARS = 200  # minimum chars to consider extraction successful
_MIN_PRIMARY_CHARS = 240

# Patterns that indicate the page is an error / paywall, not real content
_ERROR_PAGE_PATTERN = re.compile(
    r"404|page\s*not\s*found|access\s*denied|forbidden"
    r"|enable\s*javascript|subscribe\s*to\s*continue"
    r"|this\s*page\s*(is|could)\s*not"
    r"|unauthorized|log\s*in\s*to\s*continue",
    re.IGNORECASE,
)


# ── result container ─────────────────────────────────────────────────────

@dataclass
class ExtractionResult:
    extracted: bool
    title: str
    text: str
    source_url: str
    message: str = ""
    extraction_step: str = ""
    meta_description: str = ""


# ── helpers ──────────────────────────────────────────────────────────────

def _is_url(value: str) -> bool:
    """Return True if *value* looks like an HTTP(S) URL."""
    v = value.strip()
    if not (v.startswith("http://") or v.startswith("https://")):
        return False
    parsed = urlparse(v)
    return bool(parsed.scheme in ("http", "https") and parsed.netloc)


def _validate_url(url: str) -> None:
    """Raise ValueError for obviously dangerous or private URLs."""
    parsed = urlparse(url)
    host = parsed.hostname or ""
    if _BLOCKED_HOSTS.match(host):
        raise ValueError(f"Blocked host: {host}")
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Unsupported scheme: {parsed.scheme}")


def _fetch_html(url: str) -> tuple[str, int]:
    """Download the page HTML, respecting size and timeout limits."""
    resp = requests.get(
        url,
        timeout=_REQUEST_TIMEOUT,
        headers={
            "User-Agent": _USER_AGENT,
            "Accept": _ACCEPT,
            "Accept-Language": _ACCEPT_LANGUAGE,
        },
        stream=True,
        allow_redirects=True,
    )
    logger.debug(
        "Fetch response: url=%s status=%d content_type=%s",
        url, resp.status_code, resp.headers.get("Content-Type", ""),
    )
    if resp.status_code >= 400:
        raise ValueError(f"HTTP {resp.status_code} for {url}")

    content_type = resp.headers.get("Content-Type", "")
    if "html" not in content_type and "text" not in content_type:
        raise ValueError(f"Non-HTML content type: {content_type}")

    # Read up to the size limit
    chunks: list[bytes] = []
    total = 0
    for chunk in resp.iter_content(chunk_size=65_536):
        total += len(chunk)
        if total > _MAX_RESPONSE_BYTES:
            break
        chunks.append(chunk)

    return b"".join(chunks).decode(resp.encoding or "utf-8", errors="replace"), resp.status_code


def _looks_like_error_page(html: str) -> bool:
    """Return True if the HTML appears to be an error or paywall page."""
    # Check only the first 2 000 chars of <title> + <body> text
    soup = BeautifulSoup(html[:5000], "html.parser")
    title_text = (soup.title.string or "") if soup.title else ""
    body_tag = soup.find("body")
    body_text = body_tag.get_text(" ", strip=True)[:2000] if body_tag else html[:2000]
    sample = f"{title_text} {body_text}"
    return bool(_ERROR_PAGE_PATTERN.search(sample))


def _clean_text(text: str) -> str:
    """Normalise whitespace, collapse blank lines, strip stray markers."""
    # Replace non-breaking spaces and tabs with regular spaces
    text = text.replace("\xa0", " ").replace("\t", " ")
    # Collapse multiple spaces into one
    text = re.sub(r"[^\S\n]+", " ", text)
    # Collapse 3+ consecutive newlines into 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Strip leading/trailing whitespace from each line
    text = "\n".join(line.strip() for line in text.splitlines())
    # Remove blank lines that are only whitespace
    text = re.sub(r"\n\s*\n", "\n\n", text)
    return text.strip()


def _extract_text_chunks(node) -> list[str]:
    chunks: list[str] = []
    for p in node.find_all(["p", "li"]):
        text = p.get_text(" ", strip=True)
        if len(text) > 35:
            chunks.append(text)
    return chunks


def _extract_article(html: str) -> tuple[str, str, str]:
    """
    Parse *html* and return ``(title, body_text)``.

    Strategy:
      1. Try ``<article>`` tag first (most news sites).
      2. Fall back to common content divs / ``<main>``.
      3. Last resort: largest ``<p>``-rich ``<div>``.
    """
    soup = BeautifulSoup(html, "html.parser")

    # ── title + metadata ─────────────────────────────────────────────
    title = ""
    meta_desc = ""
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        title = og_title["content"].strip()
    elif soup.title and soup.title.string:
        title = soup.title.string.strip()

    og_desc = soup.find("meta", property="og:description")
    meta_desc_tag = soup.find("meta", attrs={"name": "description"})
    if og_desc and og_desc.get("content"):
        meta_desc = og_desc["content"].strip()
    elif meta_desc_tag and meta_desc_tag.get("content"):
        meta_desc = meta_desc_tag["content"].strip()

    # Remove noisy elements before text extraction
    for tag in soup.find_all(["script", "style", "nav", "footer", "aside", "noscript", "iframe", "form", "svg"]):
        tag.decompose()

    # Remove ad-related and social-widget containers
    _AD_PATTERN = re.compile(
        r"ad-|ads-|advert|sponsor|promo|social-share|share-bar|newsletter|signup",
        re.I,
    )
    for tag in soup.find_all(attrs={"class": _AD_PATTERN}):
        tag.decompose()
    for tag in soup.find_all(attrs={"id": _AD_PATTERN}):
        tag.decompose()

    # ── body text (primary extraction) ───────────────────────────────
    body = ""
    extraction_step = "step_1_primary"

    # Strategy 1 — <article> tag
    article = soup.find("article")
    if article:
        chunks = _extract_text_chunks(article)
        body = "\n".join(chunks) if chunks else article.get_text(separator="\n", strip=True)

    # Strategy 2 — common content containers
    if len(body) < _MIN_PRIMARY_CHARS:
        for selector in [
            {"role": "main"},
            {"class_": re.compile(r"article|post-content|entry-content|story-body|story|content|body", re.I)},
            {"id": re.compile(r"article|content|story|main", re.I)},
        ]:
            node = soup.find("div", **selector) or soup.find("section", **selector) or soup.find("main", **selector)
            if node:
                chunks = _extract_text_chunks(node)
                candidate = "\n".join(chunks) if chunks else node.get_text(separator="\n", strip=True)
                if len(candidate) > len(body):
                    body = candidate
                    extraction_step = "step_1_primary"

    # Strategy 3 — largest <p>-rich <div>
    if len(body) < _MIN_PRIMARY_CHARS:
        best_div, best_len = None, 0
        for div in soup.find_all("div"):
            paragraphs = div.find_all("p")
            text_len = sum(len(p.get_text(strip=True)) for p in paragraphs)
            if text_len > best_len:
                best_div, best_len = div, text_len
        if best_div and best_len > 50:
            body = best_div.get_text(separator="\n", strip=True)
            extraction_step = "step_1_primary"

    if len(body) < _MIN_PRIMARY_CHARS:
        paragraphs = soup.find_all("p")
        body = "\n".join(p.get_text(strip=True) for p in paragraphs)
        extraction_step = "step_1_primary"

    body = _clean_text(body)
    return title, meta_desc, body


def _extract_visible_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup.find_all(["script", "style", "nav", "footer", "aside", "noscript", "iframe", "form", "svg"]):
        tag.decompose()

    body = soup.find("body")
    if body:
        return _clean_text(body.get_text(" ", strip=True))
    return _clean_text(soup.get_text(" ", strip=True))


def _slug_tokens(url: str) -> list[str]:
    path = urlparse(url).path or ""
    raw_tokens = re.split(r"[-_/]+", path.lower())
    tokens = [t for t in raw_tokens if t and len(t) > 2 and not t.isdigit()]
    return tokens[:16]


def _build_context(title: str, meta_desc: str, primary_text: str, visible_text: str, slug_tokens: list[str]) -> tuple[str, str]:
    step_used = "step_1_primary"

    if len(primary_text) >= _MIN_PRIMARY_CHARS:
        parts = [title, primary_text]
        if meta_desc and meta_desc.lower() not in primary_text.lower():
            parts.append(meta_desc)
        return _clean_text("\n\n".join(p for p in parts if p)), step_used

    if title or meta_desc:
        step_used = "step_2_title_meta"
        parts = [title, meta_desc, primary_text]
    else:
        parts = [primary_text]

    if len(" ".join(parts)) < _MIN_PRIMARY_CHARS and visible_text:
        step_used = "step_3_visible_text"
        parts.append(visible_text[:3000])

    if len(" ".join(parts)) < _MIN_PRIMARY_CHARS and slug_tokens:
        step_used = "step_4_slug_context"
        parts.append("URL context: " + " ".join(slug_tokens))

    context = _clean_text("\n\n".join(p for p in parts if p))
    return context, step_used


# ── public API ───────────────────────────────────────────────────────────

def extract_article(input_value: str) -> ExtractionResult:
    """
    If *input_value* is a URL, fetch and extract the article text.

    Returns an ``ExtractionResult``.  On failure the ``text`` field
    contains the original *input_value* so the pipeline can continue.
    """
    url = input_value.strip()

    if not _is_url(url):
        logger.debug("Input is not a URL (len=%d), skipping extraction.", len(url))
        return ExtractionResult(
            extracted=False,
            title="",
            text=input_value,
            source_url="",
            message="",
            extraction_step="manual_text",
            meta_description="",
        )

    logger.info("Extraction debug: URL detected=True url=%s", url)

    try:
        _validate_url(url)
        html, status_code = _fetch_html(url)

        title, meta_desc, primary_body = _extract_article(html)
        visible_text = _extract_visible_text(html)
        slug_tokens = _slug_tokens(url)

        context, step_used = _build_context(title, meta_desc, primary_body, visible_text, slug_tokens)

        if _looks_like_error_page(html) and len(context) < _MIN_EXTRACTED_CHARS:
            context = _clean_text("\n\n".join([
                title,
                meta_desc,
                "URL context: " + " ".join(slug_tokens),
            ]))
            step_used = "step_4_slug_context"

        logger.info(
            "Extraction debug: response_status=%d title_len=%d meta_description_len=%d visible_text_len=%d slug_tokens=%s final_context_len=%d fallback_step=%s",
            status_code,
            len(title),
            len(meta_desc),
            len(visible_text),
            slug_tokens,
            len(context),
            step_used,
        )

        extracted_flag = len(primary_body.strip()) >= _MIN_EXTRACTED_CHARS
        return ExtractionResult(
            extracted=extracted_flag,
            title=title,
            text=context,
            source_url=url,
            message="best-effort extraction",
            extraction_step=step_used,
            meta_description=meta_desc,
        )

    except Exception as exc:
        slug_tokens = _slug_tokens(url)
        fallback_context = _clean_text("\n\n".join([
            (urlparse(url).netloc or ""),
            "URL context: " + " ".join(slug_tokens),
        ]))
        logger.warning(
            "Extraction debug: exception=%s url=%s slug_tokens=%s final_context_len=%d fallback_step=step_4_slug_context",
            exc,
            url,
            slug_tokens,
            len(fallback_context),
        )
        return ExtractionResult(
            extracted=False,
            title="",
            text=fallback_context or input_value,
            source_url=url,
            message="best-effort extraction",
            extraction_step="step_4_slug_context",
            meta_description="",
        )
