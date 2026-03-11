"""Quick test to measure real Ollama response time."""
import requests
import time
import json

sys_prompt = (
    "You are TruthLens AI. Produce ONLY a single JSON object with keys: "
    "summary (string), reasoning (array of strings), inconsistencies (array of strings), "
    "recommendations (array of strings), confidence (number 0-1). No markdown."
)
user_prompt = (
    "INPUT TEXT:\n"
    "Breaking news reports claim a major earthquake has struck downtown. "
    "Multiple sources report conflicting information about casualties.\n\n"
    "NLP PIPELINE RESULTS:\n"
    "  verdict: unverified\n"
    "  credibility_score: 42/100\n"
    "  metrics: word_count: 20, claim_count: 2, emotional_count: 1\n\n"
    "Based on the above, produce the JSON analysis now."
)

t0 = time.time()
r = requests.post(
    "http://localhost:11434/api/generate",
    json={
        "model": "llama3",
        "prompt": user_prompt,
        "system": sys_prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.3, "num_predict": 512},
    },
    timeout=300,
)
elapsed = time.time() - t0
data = r.json()

resp_text = data.get("response", "")
print(f"Time: {elapsed:.1f}s")
print(f"Eval count: {data.get('eval_count', '?')}")
print(f"Response:\n{resp_text}")

# Try parsing
try:
    parsed = json.loads(resp_text)
    print(f"\nParsed keys: {list(parsed.keys())}")
    print(f"Valid JSON: YES")
except json.JSONDecodeError as e:
    print(f"\nJSON parse error: {e}")
