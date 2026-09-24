"""Run the notes extractor over part 15's drawing, page by page.

Part 15 is an Anark MBD file, and those behave differently from part 12's plain
2D drawing: the earlier survey found only 130 words on page 1 against part 12's
616, because on an MBD sheet much of the content is injected by the 3D viewer.
So the interesting question is not just "what did it extract" but "is the notes
block even on the page".
"""

import os
import re
import sys

import pymupdf

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import bom_ocr
import notes_ocr

PART = sys.argv[1] if len(sys.argv) > 1 else "15"
UP = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing"
folder = os.path.join(UP, PART)
pdf = next((os.path.join(folder, f) for f in os.listdir(folder)
            if f.lower().endswith(".pdf")), None)
if not pdf:
    sys.exit(f"no PDF for part {PART}")

print(f"part {PART}: {os.path.basename(pdf)}")
data = open(pdf, "rb").read()

doc = pymupdf.open(stream=data, filetype="pdf")
drop = re.compile(notes_ocr.DROP_WORDS_MATCHING, re.I)
print(f"\n{'page':>5}{'words':>7}{'lines':>7}  note-number candidates")
print("-" * 60)
for pno in range(doc.page_count):
    words = bom_ocr.get_words(doc[pno], drop)
    if not words:
        print(f"{pno+1:>5}{0:>7}{0:>7}  (no text layer)")
        continue
    lines, med_h = bom_ocr.group_lines(words)
    cands = [l for l in lines
             if notes_ocr._NOTE_NUM.match(l["words"][0]["text"])]
    print(f"{pno+1:>5}{len(words):>7}{len(lines):>7}  {len(cands)}")
doc.close()

notes = notes_ocr.extract_notes(data)
print(f"\n=== {len(notes)} notes extracted ===")
for n in notes:
    flag = "PROCESS" if notes_ocr.looks_like_process(n) else "       "
    print(f"  {flag}  {n[:100]}")

processes = [notes_ocr.strip_note_number(n)
             for n in notes if notes_ocr.looks_like_process(n)]
print(f"\n=== {len(processes)} would be written to "
      f"CostingPartSpecialProcessResults ===")
for p in processes:
    print(f"  {p[:96]}")
