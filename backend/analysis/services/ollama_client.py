"""
ollama_client.py — Direct HTTP client for the Ollama REST API.

Connects to Ollama at http://localhost:11434 (configurable via settings).
Uses the Python ``requests`` library for HTTP calls.

This is the ONLY LLM integration point. No mock providers, no fallbacks.
If Ollama is unreachable, callers get a clear ``OllamaClientError``.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class OllamaClientError(Exception):
    """Raised when the Ollama HTTP call fails for any reason."""


class OllamaClient:
    """
    Thin wrapper around the Ollama ``/api/generate`` endpoint.

    Usage::

        client = OllamaClient()
        envelope = client.generate(prompt="Analyse this.", system="You are TruthLens AI.")
    """

    def __init__(self) -> None:
        self.base_url: str = getattr(settings, "OLLAMA_URL", "http://localhost:11434")
        self.model: str = getattr(settings, "LLM_MODEL", "llama3")
        self.timeout: int = getattr(settings, "LLM_TIMEOUT_SECONDS", 60)

    # ── health check ─────────────────────────────────────────────────

    def check_connection(self) -> dict[str, Any]:
        """
        GET ``/api/tags`` to verify Ollama is running and list models.

        Returns the parsed JSON response.
        Raises ``OllamaClientError`` on any failure.
        """
        url = f"{self.base_url.rstrip('/')}/api/tags"
        try:
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            return resp.json()
        except requests.ConnectionError as exc:
            raise OllamaClientError(
                f"Ollama server unreachable at {url}: {exc}"
            ) from exc
        except requests.Timeout as exc:
            raise OllamaClientError(
                f"Ollama health-check timed out: {exc}"
            ) from exc
        except Exception as exc:
            raise OllamaClientError(
                f"Ollama health-check failed: {exc}"
            ) from exc

    # ── generation ───────────────────────────────────────────────────

    def generate(
        self,
        prompt: str,
        system: str = "",
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> dict[str, Any]:
        """
        POST to ``/api/generate`` and return the parsed JSON envelope.

        Raises
        ------
        OllamaClientError
            On network failure, timeout, or non-200 status.
        """
        url = f"{self.base_url.rstrip('/')}/api/generate"
        body: dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }
        if system:
            body["system"] = system

        logger.info("OllamaClient: POST %s  model=%s", url, self.model)

        try:
            resp = requests.post(url, json=body, timeout=self.timeout)
            resp.raise_for_status()
        except requests.ConnectionError as exc:
            raise OllamaClientError(
                f"Ollama server unreachable at {url}: {exc}"
            ) from exc
        except requests.Timeout as exc:
            raise OllamaClientError(
                f"Ollama request timed out after {self.timeout}s: {exc}"
            ) from exc
        except requests.HTTPError as exc:
            raise OllamaClientError(
                f"Ollama returned HTTP {resp.status_code}: {resp.text[:300]}"
            ) from exc
        except requests.RequestException as exc:
            raise OllamaClientError(f"Ollama request failed: {exc}") from exc

        try:
            envelope = resp.json()
        except (json.JSONDecodeError, ValueError) as exc:
            raise OllamaClientError(
                f"Ollama returned non-JSON response: {resp.text[:300]}"
            ) from exc

        return envelope
