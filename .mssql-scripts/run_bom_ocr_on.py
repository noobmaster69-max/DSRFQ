"""Run bom_ocr.extract() against one drawing and print what came back.

    python .mssql-scripts/run_bom_ocr_on.py 659306.PDF

The argument is matched against filenames under the upload root, newest first.
This makes the real vision calls, so a rules-path page can take a few minutes.
"""

import json
import os
import sys
import time
import urllib.request

RFQ = r"C:\Aizera\RPA\RFQ"
UPLOAD = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload"
sys.path.insert(0, RFQ)
os.chdir(RFQ)

import bom_ocr as b                                     # noqa: E402

arg = sys.argv[1] if len(sys.argv) > 1 else ""
if os.path.isfile(arg):
    path = arg
else:
    # Match on the path under the upload root, not just the filename, so
    # "20\0023" picks the original and "20\Converted" picks the converted one -
    # they share a name.
    want = arg.lower().replace("/", os.sep)
    hits = []
    for root, _dirs, files in os.walk(UPLOAD):
        for fn in files:
            full = os.path.join(root, fn)
            if fn.lower().endswith(".pdf") and want in full.lower():
                hits.append(full)
    if not hits:
        sys.exit(f"no PDF matching {arg!r} under {UPLOAD}")
    hits.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    path = hits[0]

try:
    with urllib.request.urlopen(f"{b.OLLAMA_URL}/api/tags", timeout=10) as r:
        names = [m["name"] for m in json.loads(r.read().decode()).get("models", [])]
except Exception as exc:
    sys.exit(f"Ollama unreachable at {b.OLLAMA_URL}: {exc}\nStart it with: ollama serve")
if b.OLLAMA_MODEL not in names:
    sys.exit(f"model {b.OLLAMA_MODEL!r} not loaded. have: {', '.join(names)}")

print(f"{path}\n  {os.path.getsize(path) / 1024:.0f} KB, model {b.OLLAMA_MODEL}\n")
with open(path, "rb") as fh:
    pdf = fh.read()

t0 = time.time()
rows = b.extract(pdf)
print(f"\n{len(rows)} row(s) in {time.time() - t0:.1f}s\n")

if rows:
    w = {f: max(len(f), max(len(str(r.get(f) or "")) for r in rows))
         for f in ("item", "quantity", "unit", "material", "part_no",
                   "description")}
    hdr = "  ".join(f"{f.upper():<{w[f]}}" for f in w)
    print(hdr)
    print("-" * len(hdr))
    for r in rows:
        print("  ".join(f"{str(r.get(f) or ''):<{w[f]}}" for f in w)
              + (f"   [{r['extra']}]" if r.get("extra") else "")
              + f"   p{r.get('pages')}")
