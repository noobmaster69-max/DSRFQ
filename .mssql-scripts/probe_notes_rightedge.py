"""Isolate note text from the dimension callouts sharing its lines.

Restricting to the notes column got the text back but not cleanly: a global
right edge cannot work, because the notes block is left-aligned and ragged
while dimension callouts sit at arbitrary x on the same rows.

Per LINE instead: start at the note's left edge and walk right, keeping words
while the gap to the previous one stays small. Note text is set solid; a
callout is separated by a wide blank. Tries several gap thresholds so the
choice is made from evidence.
"""

import re
import sys

import pymupdf

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import bom_ocr

PDF = sys.argv[1] if len(sys.argv) > 1 else (
    r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\12"
    r"\0043-07547_03_Green_Standard.pdf")

NOTE_NUM = re.compile(r"^(\d{1,2})\.?$")

doc = pymupdf.open(PDF)
page = doc[0]
words = bom_ocr.get_words(page, re.compile(bom_ocr.DROP_WORDS_MATCHING, re.I))
lines, med_h = bom_ocr.group_lines(words)

# The notes column: largest cluster of line-initial small integers.
starts = [(int(NOTE_NUM.match(l["words"][0]["text"]).group(1)),
           l["words"][0]["bbox"][0], l)
          for l in lines if NOTE_NUM.match(l["words"][0]["text"])]
anchor, best = None, 0
for _, x, _ in starts:
    n = sum(1 for _, x2, _ in starts if abs(x2 - x) <= med_h * 2)
    if n > best:
        anchor, best = x, n
col = [t for t in starts if abs(t[1] - anchor) <= med_h * 2]
band = (min(l["cy"] for _, _, l in col) - med_h * 2,
        max(l["cy"] for _, _, l in col) + med_h * 2)
print(f"notes column x~{anchor:.0f}, {len(col)} numbered lines, "
      f"y band {band[0]:.0f}-{band[1]:.0f}")

for gap_mult in (1.5, 2.5, 4.0):
    print(f"\n=== keep words while gap <= {gap_mult} x med_h "
          f"({med_h*gap_mult:.0f} pt) ===")
    out = []
    for ln in lines:
        cy = ln["cy"]
        if not (band[0] <= cy <= band[1]):
            continue
        ws = [w for w in ln["words"] if w["bbox"][0] >= anchor - med_h]
        if not ws:
            continue
        ws.sort(key=lambda w: w["bbox"][0])
        kept = [ws[0]]
        for w in ws[1:]:
            if w["bbox"][0] - kept[-1]["bbox"][2] > med_h * gap_mult:
                break
            kept.append(w)
        text = " ".join(w["text"] for w in kept).strip()
        if text:
            out.append((cy, ws[0]["bbox"][0], text))

    # Join wrapped continuations onto the numbered line above.
    notes, cur = [], None
    for cy, x0, text in sorted(out):
        if NOTE_NUM.match(text.split()[0]) and abs(x0 - anchor) <= med_h * 2:
            if cur:
                notes.append(cur)
            cur = text
        elif cur:
            cur += " " + text
    if cur:
        notes.append(cur)
    for n in notes:
        print(f"  {n[:100]}")

doc.close()
