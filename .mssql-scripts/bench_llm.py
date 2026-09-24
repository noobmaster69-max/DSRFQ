"""Benchmark every LLM backend RFQ can use, on RFQ's own prompts.

Covers the remote model REPLACE-api-v2 uses (gemini-2.5-flash-lite via
aihubmix) and any local Ollama models, so "is local better?" is answered with
one comparable set of numbers instead of two separate impressions.

Writes results to llm-benchmark.json for the UI to render.
"""
import json
import os
import statistics
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, r"C:\Aizera\RPA\REPLACE-api-v2\REPLACE-api-v2")
import config as replace_config  # noqa: E402

OLLAMA = "http://localhost:11434"
OUT = r"C:\Aizera\DSRFQ\.mssql-scripts\llm-benchmark.json"

# Real drawing notes from part 5's OCR output.
NOTES = [
    "CLEAN PER APPLIED MATERIALS O250-29357, TYPE I .",
    "ALTERNATE MATERIALS ALLOWED PER APPLIED MATERIALS O25O-46767.",
    "COSMETIC PER APPLIED MATERIALS O25O-O1O19,",
    "PACKAGE PER APPLIED MATERIALS OZ5O-O0O98.",
    "1. UNLESS OTHERWISE SPECIFIED ALL DIMENSIONS ARE IN MM. "
    "TOLERANCE: REMOVE BURRS AND SHARP EDGES.",
]

IS_PROCESS_PROMPT = """Is this engineering drawing note a manufacturing/finishing/inspection process step?
Answer with JSON only: {"is_process": true} or {"is_process": false}

Input: "%s"
"""

EXTRACT_PROMPT = """Extract the process name and any specification code from this
engineering drawing note. Answer with JSON only:
{"process": "...", "spec": "..."}

Input: "%s"
"""

WORKLOADS = [
    ("is_process", IS_PROCESS_PROMPT, 20),
    ("extract", EXTRACT_PROMPT, 150),
]


def post(url, payload, headers=None, timeout=180):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


# ── backends ──────────────────────────────────────────────────────────────

def call_ollama(model, prompt, num_predict):
    r = post(OLLAMA + "/api/generate", {
        "model": model, "prompt": prompt, "stream": False,
        "options": {"temperature": 0.0, "num_predict": num_predict, "num_ctx": 1024},
    })
    return (r.get("response") or "").strip(), r.get("eval_count", 0)


def call_gemini(model, prompt, num_predict):
    r = post(replace_config.llm_api_base_url.rstrip("/") + "/chat/completions", {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.0,
        "max_tokens": num_predict,
    }, headers={"Authorization": "Bearer " + replace_config.llm_api_key})
    choice = (r.get("choices") or [{}])[0]
    text = ((choice.get("message") or {}).get("content") or "").strip()
    used = (r.get("usage") or {}).get("completion_tokens", 0)
    return text, used


def available_ollama():
    try:
        with urllib.request.urlopen(OLLAMA + "/api/tags", timeout=8) as r:
            return [m["name"] for m in json.load(r).get("models", [])]
    except Exception:
        return []


# ── run ───────────────────────────────────────────────────────────────────

def bench(label, fn, model):
    print("\n=== %s ===" % label)
    entry = {"backend": label, "model": model, "workloads": {}}

    # One warm-up so weight loading / connection setup is not timed.
    try:
        fn(model, "Reply with OK.", 5)
    except Exception as exc:
        print("  unavailable: %r" % exc)
        entry["error"] = str(exc)[:200]
        return entry

    for name, template, num_predict in WORKLOADS:
        walls, sample = [], ""
        notes = NOTES if name == "is_process" else NOTES[:3]
        for note in notes:
            t0 = time.perf_counter()
            try:
                text, _ = fn(model, template % note, num_predict)
            except Exception as exc:
                print("  %-12s FAILED: %r" % (name, exc))
                entry["workloads"][name] = {"error": str(exc)[:200]}
                walls = []
                break
            walls.append(time.perf_counter() - t0)
            sample = sample or text.replace("\n", " ")[:60]
        if not walls:
            continue
        entry["workloads"][name] = {
            "calls": len(walls),
            "median_s": round(statistics.median(walls), 2),
            "total_s": round(sum(walls), 1),
            "sample": sample,
        }
        print("  %-12s %d calls  median %.2fs  total %.1fs  | %s"
              % (name, len(walls), statistics.median(walls), sum(walls), sample))
    return entry


results = {"generated": time.strftime("%Y-%m-%d %H:%M:%S"), "backends": []}

results["backends"].append(bench(
    "aihubmix (remote)", call_gemini, replace_config.llm_model_name))

for model in available_ollama():
    results["backends"].append(bench("ollama (local)", call_ollama, model))

# Per-part projection: the cost of classifying every note on a drawing.
print("\n" + "=" * 74)
print("%-22s %-22s %10s %10s" % ("backend", "model", "is_process", "extract"))
print("-" * 74)
for b in results["backends"]:
    w = b.get("workloads", {})
    ip = w.get("is_process", {}).get("median_s")
    ex = w.get("extract", {}).get("median_s")
    print("%-22s %-22s %10s %10s" % (
        b["backend"], b["model"],
        ("%.2fs" % ip) if ip else "-", ("%.2fs" % ex) if ex else "-"))
print("=" * 74)

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)
print("\nwrote %s" % OUT)
