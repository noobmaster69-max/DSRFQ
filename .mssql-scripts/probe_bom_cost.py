"""How much time would text-layer BOM extraction actually add?

extract_bom.py has two very different halves:
  * locating the table from the PDF text layer  -- pure PyMuPDF, no models
  * reading the crop with an Ollama vision model -- seconds to tens of seconds

The integration only makes sense if the cheap half can be used as a gate for
the expensive one. This times them separately on the non-3D drawings actually
in the system, and reports which pages even have a locatable parts list.
"""

import importlib.util
import os
import re
import sys
import time

import pymupdf

TT = r"C:\Aizera\RPA\table-transformer"
UP = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing"

TARGETS = []
for part in ("8", "9", "10", "11", "12"):
    d = os.path.join(UP, part)
    if os.path.isdir(d):
        for f in os.listdir(d):
            if f.lower().endswith(".pdf"):
                TARGETS.append((part, os.path.join(d, f)))
if len(sys.argv) > 1:
    TARGETS = [("arg", a) for a in sys.argv[1:]]

# Import extract_bom without running main(); it pulls torch in at import time
# via detr/inference, so time that too -- it is part of the real cost.
t0 = time.time()
sys.path.insert(0, TT)
spec = importlib.util.spec_from_file_location("extract_bom",
                                              os.path.join(TT, "extract_bom.py"))
eb = importlib.util.module_from_spec(spec)
try:
    spec.loader.exec_module(eb)
    import_secs = time.time() - t0
    print(f"import extract_bom (incl. torch/TATR): {import_secs:.1f}s")
except Exception as exc:
    print(f"could not import extract_bom: {exc}")
    sys.exit(1)

drop_re = re.compile(eb.DROP_WORDS_MATCHING, re.I) if eb.DROP_WORDS_MATCHING else None

print(f"\n{'part':<6}{'file':<40}{'page':>5}{'words':>7}{'hdr?':>6}"
      f"{'score':>6}{'detect ms':>11}")
print("-" * 84)

for part, path in TARGETS:
    doc = pymupdf.open(path)
    for pno in range(doc.page_count):
        page = doc[pno]
        t = time.time()
        words = eb.get_words(page, drop_re)
        if not words:
            print(f"{part:<6}{os.path.basename(path)[:38]:<40}{pno+1:>5}"
                  f"{0:>7}{'-':>6}{'-':>6}{(time.time()-t)*1000:>10.0f}ms"
                  "   (no text layer)")
            continue
        lines, med_h = eb.group_lines(words)
        idx = eb.find_header_line(lines)
        score = eb.header_score(lines[idx]) if idx is not None else 0
        ms = (time.time() - t) * 1000
        print(f"{part:<6}{os.path.basename(path)[:38]:<40}{pno+1:>5}"
              f"{len(words):>7}{'YES' if idx is not None else '-':>6}"
              f"{score:>6}{ms:>10.0f}ms")
        if idx is not None:
            hdr = " | ".join(w["text"] for w in lines[idx]["words"][:12])
            print(f"       header: {hdr[:96]}")
    doc.close()

print("\n--- Ollama ---")
import json
import urllib.request
try:
    with urllib.request.urlopen(f"{eb.OLLAMA_URL}/api/tags", timeout=8) as r:
        tags = json.loads(r.read().decode())
    names = [m["name"] for m in tags.get("models", [])]
    print(f"reachable. models: {', '.join(names[:8]) or 'none'}")
    print(f"configured model {eb.OLLAMA_MODEL!r} present: {eb.OLLAMA_MODEL in names}")
except Exception as exc:
    print(f"NOT reachable at {eb.OLLAMA_URL}: {exc}")
