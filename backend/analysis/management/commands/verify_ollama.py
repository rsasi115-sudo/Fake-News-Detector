"""
verify_ollama — Management command to check Ollama connectivity.

Usage:
    python manage.py verify_ollama
"""

from django.core.management.base import BaseCommand
from django.conf import settings

from analysis.services.ollama_client import OllamaClient, OllamaClientError


class Command(BaseCommand):
    help = "Verify Ollama is running and the configured model is available."

    def handle(self, *args, **options):
        url = getattr(settings, "OLLAMA_URL", "http://localhost:11434")
        model = getattr(settings, "LLM_MODEL", "llama3")

        self.stdout.write(f"\nChecking Ollama at {url} ...")

        client = OllamaClient()

        # ── Step 1: check connection ─────────────────────────────────
        try:
            tags_response = client.check_connection()
        except OllamaClientError as exc:
            self.stderr.write(self.style.ERROR(f"\n  FAILED: {exc}"))
            self.stderr.write(self.style.ERROR(
                "\n  Make sure Ollama is running: ollama serve\n"
            ))
            return

        self.stdout.write(self.style.SUCCESS("  Connection OK"))

        # ── Step 2: check model exists ───────────────────────────────
        models_list = tags_response.get("models", [])
        model_names = [m.get("name", "") for m in models_list]
        # Ollama model names can include tags like "llama3:latest"
        found = any(
            model == name or name.startswith(f"{model}:")
            for name in model_names
        )

        if found:
            self.stdout.write(self.style.SUCCESS(f"  Model '{model}' is available"))
        else:
            available = ", ".join(model_names) if model_names else "(none)"
            self.stderr.write(self.style.WARNING(
                f"  Model '{model}' NOT found. Available: {available}"
            ))
            self.stderr.write(self.style.WARNING(
                f"  Pull it with: ollama pull {model}\n"
            ))
            return

        self.stdout.write(self.style.SUCCESS("\n  Ollama is ready for TruthLens!\n"))
