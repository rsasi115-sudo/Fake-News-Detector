"""
preprocess.py — Text cleaning, normalisation & stopword removal.

Called as the first step of the verification pipeline.
All operations are deterministic with no external dependencies.
"""

import re
import logging
import unicodedata
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# ── English stopwords (compact, no NLTK needed) ─────────────────────────

STOPWORDS: frozenset[str] = frozenset({
    "a", "about", "above", "after", "again", "against", "all", "am", "an",
    "and", "any", "are", "aren't", "as", "at", "be", "because", "been",
    "before", "being", "below", "between", "both", "but", "by", "can",
    "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't",
    "doing", "don't", "down", "during", "each", "few", "for", "from",
    "further", "get", "got", "had", "hadn't", "has", "hasn't", "have",
    "haven't", "having", "he", "her", "here", "hers", "herself", "him",
    "himself", "his", "how", "i", "if", "in", "into", "is", "isn't", "it",
    "its", "itself", "just", "let", "me", "might", "more", "most", "mustn't",
    "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only",
    "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
    "re", "s", "same", "shall", "shan't", "she", "should", "shouldn't", "so",
    "some", "such", "t", "than", "that", "the", "their", "theirs", "them",
    "themselves", "then", "there", "these", "they", "this", "those", "through",
    "to", "too", "under", "until", "up", "us", "very", "was", "wasn't", "we",
    "were", "weren't", "what", "when", "where", "which", "while", "who",
    "whom", "why", "will", "with", "won't", "would", "wouldn't", "you",
    "your", "yours", "yourself", "yourselves",
})

# ── common contraction expansions ────────────────────────────────────────

_CONTRACTIONS: dict[str, str] = {
    "won't": "will not", "can't": "cannot", "couldn't": "could not",
    "shouldn't": "should not", "wouldn't": "would not", "didn't": "did not",
    "doesn't": "does not", "don't": "do not", "isn't": "is not",
    "aren't": "are not", "wasn't": "was not", "weren't": "were not",
    "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
    "it's": "it is", "i'm": "i am", "you're": "you are",
    "they're": "they are", "we're": "we are", "he's": "he is",
    "she's": "she is", "that's": "that is", "there's": "there is",
    "what's": "what is", "who's": "who is", "let's": "let us",
    "i've": "i have", "you've": "you have", "we've": "we have",
    "they've": "they have", "i'll": "i will", "you'll": "you will",
    "he'll": "he will", "she'll": "she will", "we'll": "we will",
    "they'll": "they will", "i'd": "i would", "you'd": "you would",
    "he'd": "he would", "she'd": "she would", "we'd": "we would",
    "they'd": "they would",
}


# ── helpers ──────────────────────────────────────────────────────────────

def _normalize_unicode(text: str) -> str:
    """Convert smart quotes, em-dashes, etc. to ASCII equivalents."""
    text = unicodedata.normalize("NFKD", text)
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    text = text.replace("\u2026", "...")
    return text


def _expand_contractions(text: str) -> str:
    """Expand common English contractions."""
    for contraction, expansion in _CONTRACTIONS.items():
        text = text.replace(contraction, expansion)
    return text


def _extract_embedded_urls(text: str) -> list[str]:
    """Pull all URLs out of the text and return them."""
    return re.findall(r"https?://\S+", text)


def clean_text(text: str) -> str:
    """
    Full text cleaning pipeline:
      1. Unicode normalisation
      2. Strip HTML tags
      3. Lowercase
      4. Expand contractions
      5. Remove embedded URLs
      6. Remove special characters (keep basic punctuation)
      7. Collapse whitespace
    """
    text = _normalize_unicode(text)
    text = re.sub(r"<[^>]+>", " ", text)       # strip HTML
    text = text.lower()
    text = _expand_contractions(text)
    text = re.sub(r"https?://\S+", " ", text)   # remove URLs
    text = re.sub(r"[^\w\s.,;:!?'\"-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def remove_stopwords(tokens: list[str]) -> list[str]:
    """Remove stopwords from a token list, preserving order."""
    return [t for t in tokens if t not in STOPWORDS]


def split_sentences(text: str) -> list[str]:
    """Split cleaned text into sentences (rule-based)."""
    raw = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in raw if s.strip()]


def extract_url_domain(url: str) -> str | None:
    """Extract the domain from a URL, or ``None`` if invalid."""
    try:
        parsed = urlparse(url)
        return parsed.netloc or None
    except Exception:
        return None


def extract_url_path(url: str) -> str:
    """Extract the path component from a URL."""
    try:
        return urlparse(url).path or ""
    except Exception:
        return ""


# ── public entry-point ───────────────────────────────────────────────────

def preprocess(input_type: str, input_value: str) -> dict:
    """
    Return a preprocessed context dict consumed by downstream stages.

    Keys:
        original_text, cleaned_text, input_type, domain, url_path,
        embedded_urls, tokens, tokens_no_stop, sentences,
        word_count, char_count
    """
    if not input_value or not input_value.strip():
        raise ValueError("input_value must be a non-empty string")

    original = input_value.strip()
    embedded_urls = _extract_embedded_urls(original)

    if input_type == "url":
        domain = extract_url_domain(original)
        url_path = extract_url_path(original)
        cleaned = clean_text(original)
    else:
        domain = None
        url_path = ""
        cleaned = clean_text(original)

    tokens = cleaned.split()
    tokens_no_stop = remove_stopwords(tokens)
    sentences = split_sentences(cleaned)

    ctx: dict = {
        "original_text": original,
        "cleaned_text": cleaned,
        "input_type": input_type,
        "domain": domain,
        "url_path": url_path,
        "embedded_urls": embedded_urls,
        "tokens": tokens,
        "tokens_no_stop": tokens_no_stop,
        "sentences": sentences,
        "word_count": len(tokens),
        "char_count": len(cleaned),
    }

    logger.debug(
        "Preprocessed: words=%d  chars=%d  sentences=%d  stopwords_removed=%d",
        ctx["word_count"], ctx["char_count"], len(sentences),
        len(tokens) - len(tokens_no_stop),
    )
    return ctx
