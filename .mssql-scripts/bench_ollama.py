"""Benchmark a local Ollama model on RFQ's real prompts.

Uses the two prompts function.py actually sends (_llm_is_process and
_llm_extract) rather than a synthetic one, and reports tokens/sec plus where
the model ended up living -- a 12B on an 8 GB card partly spills to CPU, and
that shows up as a large gap between the two.
"""
import argparse
import json
import statistics
import subprocess
import sys
import time
import urllib.request

OLLAMA = "http://localhost:11434"

# Real drawing notes taken from part 5's OCR output.
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


def api(path, payload=None, timeout=600):
    url = OLLAMA + path
    if payload is None:
        req = urllib.request.Request(url)
    else:
        req = urllib.request.Request(
            url, data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def gpu_free_mib():
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=memory.used,memory.free",
             "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=20).stdout.strip()
        used, free = (int(x) for x in out.split(",")[:2])
        return used, free
    except Exception:
        return None, None


def where_loaded():
    """Ollama reports size vs size_vram for a loaded model."""
    try:
        for m in api("/api/ps").get("models", []):
            total = m.get("size", 0)
            vram = m.get("size_vram", 0)
            pct = (100.0 * vram / total) if total else 0
            return m.get("name"), total, vram, pct
    except Exception:
        pass
    return None, 0, 0, 0


def run(model, prompt, num_predict, num_ctx):
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.0, "num_predict": num_predict, "num_ctx": num_ctx},
    }
    t0 = time.perf_counter()
    r = api("/api/generate", payload)
    wall = time.perf_counter() - t0
    return {
        "wall": wall,
        "eval_count": r.get("eval_count", 0),
        "eval_ns": r.get("eval_duration", 0),
        "prompt_eval_count": r.get("prompt_eval_count", 0),
        "prompt_eval_ns": r.get("prompt_eval_duration", 0),
        "load_ns": r.get("load_duration", 0),
        "response": (r.get("response") or "").strip().replace("\n", " ")[:70],
    }


def report(label, results):
    walls = [r["wall"] for r in results]
    gen_tps = [r["eval_count"] / (r["eval_ns"] / 1e9)
               for r in results if r["eval_ns"] and r["eval_count"]]
    pp_tps = [r["prompt_eval_count"] / (r["prompt_eval_ns"] / 1e9)
              for r in results if r["prompt_eval_ns"] and r["prompt_eval_count"]]
    print("\n  %s" % label)
    print("    calls            : %d" % len(results))
    print("    wall per call    : %.2fs median, %.2fs min, %.2fs max"
          % (statistics.median(walls), min(walls), max(walls)))
    if gen_tps:
        print("    generation       : %.1f tok/s median" % statistics.median(gen_tps))
    if pp_tps:
        print("    prompt eval      : %.1f tok/s median" % statistics.median(pp_tps))
    print("    total wall       : %.1fs" % sum(walls))
    print("    sample output    : %s" % results[0]["response"])
    return sum(walls), (statistics.median(gen_tps) if gen_tps else 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="gemma3:12b")
    args = ap.parse_args()

    try:
        tags = api("/api/tags")
    except Exception as exc:
        sys.exit("Ollama not reachable at %s: %s" % (OLLAMA, exc))

    names = [m["name"] for m in tags.get("models", [])]
    if args.model not in names:
        sys.exit("model %r not pulled yet. present: %s" % (args.model, names or "none"))

    size = next(m["size"] for m in tags["models"] if m["name"] == args.model)
    print("=" * 68)
    print("model: %s  (%.1f GB on disk)" % (args.model, size / 1e9))
    used, free = gpu_free_mib()
    if used is not None:
        print("GPU before load: %d MiB used, %d MiB free" % (used, free))
    print("=" * 68)

    # Warm the model so load time is not charged to the first timed call.
    print("\nwarming up (loads weights)...")
    t0 = time.perf_counter()
    run(args.model, "Reply with OK.", 5, 256)
    print("  warm-up wall: %.1fs" % (time.perf_counter() - t0))

    name, total, vram, pct = where_loaded()
    if name:
        print("\nresident: %s" % name)
        print("  total %.1f GB, in VRAM %.1f GB (%.0f%%)" % (total / 1e9, vram / 1e9, pct))
        if pct < 99:
            print("  NOTE: partially on CPU -- generation will be far slower than")
            print("        a fully GPU-resident model.")
    used, free = gpu_free_mib()
    if used is not None:
        print("GPU after load : %d MiB used, %d MiB free" % (used, free))

    # _llm_is_process: short answer, small context. The hot path.
    r1 = [run(args.model, IS_PROCESS_PROMPT % n, 20, 512) for n in NOTES]
    t1, tps = report("_llm_is_process  (num_predict=20, num_ctx=512)", r1)

    # _llm_extract: longer answer, bigger context.
    r2 = [run(args.model, EXTRACT_PROMPT % n, 150, 1024) for n in NOTES[:3]]
    t2, _ = report("_llm_extract     (num_predict=150, num_ctx=1024)", r2)

    print("\n" + "=" * 68)
    print("A part with %d process notes would spend ~%.0fs in _llm_is_process"
          % (len(NOTES), t1))
    print("plus ~%.0fs per note in _llm_extract for those that qualify."
          % (t2 / max(1, len(r2))))
    print("=" * 68)


if __name__ == "__main__":
    main()
