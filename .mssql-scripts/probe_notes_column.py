"""Can the notes block be isolated the same way the BOM table was?

Naive line extraction shreds the notes: group_lines clusters purely on y, so
dimension callouts sitting at the same height anywhere on a 34-inch sheet join
the note text. The BOM solved this by restricting to the header's x-span.
Notes have no header, but the numbered prefixes (1. 2. 3. ...) are left-aligned,
so their x positions give the same anchor.

This tests that idea end to end: find the note-number column, restrict,
re-cluster, join wrapped continuation lines, and print the result.
"""

import re
import statistics
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

# 1. Candidate note numbers: a small integer that STARTS its line.
starts = []
for ln in lines:
    first = ln["words"][0]
    if NOTE_NUM.match(first["text"]):
        starts.append((int(NOTE_NUM.match(first["text"]).group(1)),
                       first["bbox"][0], ln))

print(f"lines beginning with a small integer: {len(starts)}")
for n, x, ln in sorted(starts, key=lambda t: t[1]):
    txt = " ".join(w["text"] for w in ln["words"])[:56]
    print(f"    n={n:<3} x0={x:7.1f} y={ln['cy']:7.1f}  {txt}")
xs = [x for _, x, _ in starts]
if not xs:
    sys.exit("no note numbers found")

# 2. The notes column is the LARGEST cluster of those x positions, not the
#    median: balloon numbers and "4X"-style callouts elsewhere on the sheet also
#    start a line with a small integer, and they drag a median away from the
#    real column.
best, best_n = None, 0
for anchor in xs:
    near = [t for t in starts if abs(t[1] - anchor) <= med_h * 2]
    if len(near) > best_n:
        best, best_n = anchor, len(near)
median_x = best
col = [t for t in starts if abs(t[1] - median_x) <= med_h * 2]
print(f"\nnote-number column near x={median_x:.0f}: {len(col)} of {len(starts)} "
      f"(numbers {sorted(n for n, _, _ in col)})")

left = min(x for _, x, _ in col) - med_h
print(f"notes column starts at x >= {left:.0f}")

# 3. Right edge: notes run to the first big horizontal gap after the text.
#    Take the widest note line's own extent as the span.
note_ys = [ln["cy"] for _, _, ln in col]
band = (min(note_ys) - med_h * 2, max(note_ys) + med_h * 2)
in_band = [w for w in words
           if band[0] <= (w["bbox"][1] + w["bbox"][3]) / 2 <= band[1]
           and w["bbox"][0] >= left]

# Words in the band, sorted by x; the notes block ends at the first gap wider
# than ~8 glyph heights (dimension callouts sit well to the right).
in_band.sort(key=lambda w: w["bbox"][0])
right = left
for w in in_band:
    if w["bbox"][0] - right > med_h * 8:
        break
    right = max(right, w["bbox"][2])
print(f"notes column ends at x <= {right:.0f}  (width {right-left:.0f} pt)")

# 4. Restrict, re-cluster, and join wrapped continuation lines.
inside = [w for w in words
          if left <= (w["bbox"][0] + w["bbox"][2]) / 2 <= right
          and band[0] <= (w["bbox"][1] + w["bbox"][3]) / 2 <= band[1]]
sub, _ = bom_ocr.group_lines(inside)

notes, current = [], None
for ln in sub:
    text = " ".join(w["text"] for w in ln["words"]).strip()
    if not text:
        continue
    m = NOTE_NUM.match(ln["words"][0]["text"])
    if m and abs(ln["words"][0]["bbox"][0] - median_x) <= med_h * 2:
        if current:
            notes.append(current)
        current = text
    elif current:
        current += " " + text
if current:
    notes.append(current)

print(f"\n=== {len(notes)} notes, column-restricted and unwrapped ===")
for n in notes:
    print(f"  {n[:104]}")
doc.close()
