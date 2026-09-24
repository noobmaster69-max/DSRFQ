"""Dump every annotation `text` value in an MBD drawing's entity map.

Part 15's notes are not page content -- they are PMI annotation text inside the
CAD entity map. This lists them all so the extraction rule can be written
against what is actually there, including how they wrap and escape.
"""

import os
import re
import sys

import pymupdf

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import mbd

UP = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing"
PART = sys.argv[1] if len(sys.argv) > 1 else "15"
folder = os.path.join(UP, PART)
pdf = next(os.path.join(folder, f) for f in os.listdir(folder)
           if f.lower().endswith(".pdf"))
data = open(pdf, "rb").read()

doc = pymupdf.open(stream=data, filetype="pdf")
values, seen = [], set()
try:
    for chunk in list(mbd.iter_streams(doc)) + list(mbd.iter_objects(doc)):
        if b'"text"' not in chunk:
            continue
        text = chunk.decode("utf-8", "replace")
        for m in re.finditer(r'"text"\s*:\s*"((?:[^"\\]|\\.)*)"', text):
            raw = m.group(1)
            if raw not in seen:
                seen.add(raw)
                values.append(raw)
finally:
    doc.close()

print(f"part {PART}: {len(values)} distinct 'text' values\n")

NOTE_START = re.compile(r"^\s*(\d{1,2})[.\s]")
notes, other = [], []
for v in values:
    # \\n is a literal backslash-n in the JSON, and notes wrap on it.
    clean = re.sub(r"\\+n", " ", v)
    clean = re.sub(r"\\(.)", r"\1", clean)
    clean = " ".join(clean.split())
    (notes if NOTE_START.match(clean) else other).append(clean)

print(f"=== {len(notes)} look like numbered notes ===")
for n in sorted(notes, key=lambda s: int(NOTE_START.match(s).group(1))):
    print(f"  {n[:110]}")

print(f"\n=== {len(other)} other text values (first 20) ===")
for o in other[:20]:
    print(f"  {o[:96]}")
