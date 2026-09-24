"""Exactly how the table rectangle is found - every decision, with the numbers.

PyMuPDF contributes nothing but (bbox, text) per word. Everything that looks
like "table detection" is four geometric rules applied to those boxes, and the
result is only an EXTENT. No cell, no column boundary, no row is ever
determined here -- that is what the vision model is for.
"""

import re
import sys

import pymupdf

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import bom_ocr

PDF = (r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\12"
       r"\0043-07547_03_Green_Standard.pdf")

doc = pymupdf.open(PDF)
page = doc[0]
words = bom_ocr.get_words(page, re.compile(bom_ocr.DROP_WORDS_MATCHING, re.I))
lines, med_h = bom_ocr.group_lines(words)
hidx = bom_ocr.find_header_line(lines)
header = lines[hidx]

print("RULE 1 - cluster words into lines by vertical overlap")
print(f"  {len(words)} words -> {len(lines)} lines, tolerance = "
      f"{med_h:.1f} * 0.6 = {med_h*0.6:.1f} pt")

print("\nRULE 2 - the header's column labels define the horizontal span")
x0, x1 = bom_ocr.header_span(header)
print(f"  span x {x0:.1f} -> {x1:.1f}  (width {x1-x0:.0f} pt of a "
      f"{page.rect.width:.0f} pt sheet = {(x1-x0)/page.rect.width*100:.0f}%)")

inside = [w for w in words if x0 <= (w["bbox"][0] + w["bbox"][2]) / 2 <= x1]
print(f"  words whose centre falls in that span: {len(inside)} of {len(words)}")
sub, _ = bom_ocr.group_lines(inside)
print(f"  re-clustered into {len(sub)} lines within the span")

print("\nRULE 3 + 4 - walk away from the header row while BOTH hold:")
print(f"  gap <= {med_h * bom_ocr.MAX_LINE_GAP:.1f} pt   and   a digit sits in "
      f"the ITEM column")

key_pat = re.compile(r"^(%s)" % bom_ocr.ITEM_COLUMN_PATTERN, re.I)
key_span = None
for w in header["words"]:
    if key_pat.match(w["text"]):
        key_span = (w["bbox"][0], w["bbox"][2])
        break
print(f"  ITEM column x-span: {key_span[0]:.1f} -> {key_span[1]:.1f}")

hi = min(range(len(sub)), key=lambda i: abs(sub[i]["cy"] - header["cy"]))


def has_key(ln):
    for w in ln["words"]:
        if w["bbox"][2] >= key_span[0] - med_h and w["bbox"][0] <= key_span[1] + med_h:
            if w["text"].strip().isdigit():
                return True
    return False


for direction, label in ((1, "DOWN from header"), (-1, "UP from header")):
    print(f"\n  --- walking {label} ---")
    i, prev = hi + direction, sub[hi]
    while 0 <= i < len(sub):
        ln = sub[i]
        gap = (ln["y0"] - prev["y1"]) if direction == 1 else (prev["y0"] - ln["y1"])
        ok_gap = gap <= med_h * bom_ocr.MAX_LINE_GAP
        ok_key = has_key(ln)
        text = " ".join(w["text"] for w in ln["words"])[:52]
        verdict = "keep" if (ok_gap and ok_key) else "STOP"
        why = "" if (ok_gap and ok_key) else (
            " (gap too big)" if not ok_gap else " (no item number)")
        print(f"    gap={gap:6.1f} key={'Y' if ok_key else 'N'}  {verdict}{why}"
              f"  {text!r}")
        if not (ok_gap and ok_key):
            break
        prev = ln
        i += direction

bbox, kept = bom_ocr.table_bbox(words, header, med_h)
print(f"\nRESULT: rectangle {tuple(round(v) for v in bbox)}, {kept} lines")
print(f"  area = {(bbox[2]-bbox[0])*(bbox[3]-bbox[1])/1e3:.0f}k pt2 of "
      f"{page.rect.width*page.rect.height/1e3:.0f}k = "
      f"{(bbox[2]-bbox[0])*(bbox[3]-bbox[1])/(page.rect.width*page.rect.height)*100:.1f}% of the sheet")
print("\nNOT determined by any of this: column boundaries, cell contents,")
print("which value belongs to which column, how many data rows there are.")
doc.close()
