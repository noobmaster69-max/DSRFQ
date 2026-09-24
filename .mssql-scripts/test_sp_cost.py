"""calculate_sp_cost() calls ollama.chat(gemma3:12b) via _llm_is_process.

Ollama was not installed until now, so this path raised on every call. Confirm
it works, and time it on real drawing notes from part 5.
"""
import os
import sys
import time

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
os.chdir(r"C:\Aizera\RPA\RFQ")

import function  # noqa: E402

NOTES = [
    "CLEAN PER APPLIED MATERIALS O250-29357, TYPE I .",
    "COSMETIC PER APPLIED MATERIALS O25O-O1O19,",
    "1. UNLESS OTHERWISE SPECIFIED ALL DIMENSIONS ARE IN MM.",
]

print("model referenced in function.py:",
      "gemma3:12b" if "gemma3:12b" in open("function.py", encoding="utf-8").read()
      else "(changed)")

total = 0.0
for note in NOTES:
    t0 = time.perf_counter()
    try:
        price = function.calculate_sp_cost(note)
        took = time.perf_counter() - t0
        total += took
        print("  %-52s -> %-10s %5.1fs" % (note[:52], price, took))
    except Exception as exc:
        took = time.perf_counter() - t0
        total += took
        print("  %-52s -> FAILED after %.1fs: %r" % (note[:52], took, exc))

print("\ntotal %.1fs for %d notes (%.1fs each)" % (total, len(NOTES), total / len(NOTES)))
