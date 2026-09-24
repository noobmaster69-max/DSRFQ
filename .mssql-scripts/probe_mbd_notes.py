"""Where are the notes on an MBD drawing?

Part 15's page carries 129 words and no numbered notes, so the notes block is
not page content -- the same reason its MATERIAL cell renders empty. This looks
for the notes in the two other places they could be: the page text that IS
there, and the Anark CAD entity map that mbd.py already reads.
"""

import os
import re
import sys

import pymupdf

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import bom_ocr
import mbd
import notes_ocr

UP = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing"
PART = sys.argv[1] if len(sys.argv) > 1 else "15"
folder = os.path.join(UP, PART)
pdf = next(os.path.join(folder, f) for f in os.listdir(folder)
           if f.lower().endswith(".pdf"))
data = open(pdf, "rb").read()

print(f"part {PART}: {os.path.basename(pdf)}")

print("\n=== page 1 text, in full (129 words) ===")
doc = pymupdf.open(stream=data, filetype="pdf")
words = bom_ocr.get_words(doc[0], re.compile(notes_ocr.DROP_WORDS_MATCHING, re.I))
lines, _ = bom_ocr.group_lines(words)
for ln in lines:
    print("  " + " ".join(w["text"] for w in ln["words"])[:104])
doc.close()

print("\n=== does the entity map carry note text? ===")
got = mbd.extract(data)
part = got.get("part") or {}
print(f"  entity-map fields: {sorted(part.keys())}")
for k, v in sorted(part.items()):
    if re.search(r"note|finish|surface|process|treat|spec", k, re.I):
        print(f"    {k:<22} {str(v)[:80]}")

# Raw scan: any attribute whose VALUE reads like a process note.
print("\n=== raw entity records mentioning a process verb ===")
doc = pymupdf.open(stream=data, filetype="pdf")
seen = set()
try:
    for chunk in list(mbd.iter_streams(doc)) + list(mbd.iter_objects(doc)):
        if b"cadEntityId" not in chunk and b"DB_PART_NAME" not in chunk:
            continue
        text = chunk.decode("utf-8", "replace")
        for m in re.finditer(
                r'"([A-Za-z0-9_ .\-]{2,40})"\s*:\s*"([^"]{0,200})"', text):
            k, v = m.group(1), m.group(2)
            if notes_ocr.PROCESS_VERBS.search(v) and len(v) > 12:
                key = (k, v[:60])
                if key not in seen:
                    seen.add(key)
                    print(f"    {k:<24} {v[:76]}")
finally:
    doc.close()
if not seen:
    print("    none - no attribute value reads like a process note")
