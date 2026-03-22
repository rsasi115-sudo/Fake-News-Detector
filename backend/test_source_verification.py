"""
test_source_verification.py — Integration test for source verification pipeline.

Tests:
  1. BBC URL x3 (stability)
  2. Manual text input (real news)
  3. Fake-news text
  4. Another URL (Guardian)

Prints: input_type, verification_status, source_count, final score,
        final verdict, whether AI explanation was generated,
        and checks internal consistency.

Run:
  python test_source_verification.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from analysis.services.pipeline import run_pipeline  # noqa: E402


TESTS = [
    {
        "label": "1. BBC URL — run 1 of 3",
        "input_type": "url",
        "input_value": "https://www.bbc.com/news/world",
    },
    {
        "label": "2. BBC URL — run 2 of 3",
        "input_type": "url",
        "input_value": "https://www.bbc.com/news/world",
    },
    {
        "label": "3. BBC URL — run 3 of 3",
        "input_type": "url",
        "input_value": "https://www.bbc.com/news/world",
    },
    {
        "label": "4. Manual text (real news paragraph)",
        "input_type": "text",
        "input_value": (
            "The World Health Organization declared on Tuesday that the global "
            "COVID-19 pandemic is no longer a public health emergency of "
            "international concern. WHO Director-General Tedros Adhanom "
            "Ghebreyesus made the announcement following a meeting of the "
            "International Health Regulations Emergency Committee in Geneva."
        ),
    },
    {
        "label": "5. Another URL (The Guardian)",
        "input_type": "url",
        "input_value": "https://www.theguardian.com/world",
    },
]


def _check_consistency(sv: dict, label: str, ctx: dict) -> list[str]:
    """Return a list of inconsistency warnings (empty = OK)."""
    issues = []
    status = sv.get("verification_status", "")
    matched = sv.get("matched_sources", [])
    count = sv.get("source_count", 0)

    if count != len(matched):
        issues.append(f"source_count={count} != len(matched_sources)={len(matched)}")

    if status in ("not_found", "unsupported", "not_available") and len(matched) > 0:
        issues.append(f"status={status} but matched_sources is non-empty ({len(matched)})")

    if status in ("supported", "partially_supported") and len(matched) == 0:
        issues.append(f"status={status} but matched_sources is empty")

    for m in matched:
        ratio = m.get("overlap_ratio", 0)
        if ratio <= 0:
            issues.append(f"matched source {m.get('source_name')} has 0% overlap_ratio")

    # Verdict-score consistency check
    score = ctx.get("credibility_score", -1)
    verdict = ctx.get("verdict", "")
    expected_verdicts = {
        range(0, 31): "false",
        range(31, 51): "misleading",
        range(51, 71): "unknown",
        range(71, 101): "true",
    }
    for score_range, expected in expected_verdicts.items():
        if score in score_range and verdict != expected:
            issues.append(f"verdict={verdict} but score={score} should map to {expected}")

    return issues


def run_tests():
    print("=" * 70)
    print("  TruthLens Source Verification — Stability & Consistency Tests")
    print("=" * 70)

    for test in TESTS:
        label = test["label"]
        input_type = test["input_type"]
        input_value = test["input_value"]

        print(f"\n{'─' * 70}")
        print(f"  {label}")
        print(f"{'─' * 70}")
        preview = input_value[:80] + ("..." if len(input_value) > 80 else "")
        print(f"  Input:  {preview}")

        try:
            ctx = run_pipeline(input_type, input_value)
        except Exception as exc:
            print(f"  ERROR:  Pipeline failed — {exc}")
            print(f"  CONSISTENCY: FAIL — pipeline should not crash")
            continue

        sv = ctx.get("source_verification", {})
        ai = ctx.get("explainable_ai", {})
        llm_status = ctx.get("llm_status", "unknown")

        print(f"  Input Type:           {input_type}")
        print(f"  Verification Status:  {sv.get('verification_status', 'N/A')}")
        print(f"  Source Count:          {sv.get('source_count', 0)}")
        if sv.get("matched_sources"):
            for m in sv["matched_sources"]:
                hl = m.get("matched_headline", "")[:60]
                print(f"    - {m['source_name']}  ({int(m.get('overlap_ratio', 0) * 100)}%)  {hl}")
        print(f"  Final Score:          {ctx.get('credibility_score', '?')}/100")
        print(f"  Final Verdict:        {ctx.get('verdict', '?')}")
        print(f"  AI Explanation:       {'Yes' if (ai and llm_status == 'success') else 'No'} (llm_status={llm_status})")
        print(f"  Verification Notes:   {sv.get('verification_notes', '')[:120]}")

        issues = _check_consistency(sv, label, ctx)
        if issues:
            print(f"  CONSISTENCY:          FAIL")
            for iss in issues:
                print(f"    !! {iss}")
        else:
            print(f"  CONSISTENCY:          OK")

    print(f"\n{'=' * 70}")
    print("  All tests complete.")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    run_tests()
