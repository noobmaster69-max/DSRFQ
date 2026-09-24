"""What the PDF text layer actually gives us, on a real drawing.

bom_ocr locates the parts list from this and never renders a pixel to do it.
Shows the raw words, how they cluster into lines, and how the header is scored.
"""

import re
import sys

import pymupdf

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import bom_ocr

PDF = sys.argv[1] if len(sys.argv) > 1 else (
    r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\12"
    r"\0043-07547_03_Green_Standard.pdf")

doc = pymupdf.open(PDF)
page = doc[0]
print(f"page 1 is {page.rect.width:.0f} x {page.rect.height:.0f} pt "
      f"({page.rect.width/72:.1f} x {page.rect.height/72:.1f} in)")

raw = page.get_text("words")
print(f"\npage.get_text('words') -> {len(raw)} tuples of "
      f"(x0, y0, x1, y1, text, block, line, word_no)\n")
print("first 6 exactly as returned:")
for t in raw[:6]:
    print(f"  ({t[0]:7.1f},{t[1]:7.1f},{t[2]:7.1f},{t[3]:7.1f})  {t[4]!r}")

drop_re = re.compile(bom_ocr.DROP_WORDS_MATCHING, re.I)
words = bom_ocr.get_words(page, drop_re)
print(f"\nafter dropping watermark words: {len(words)}")

lines, med_h = bom_ocr.group_lines(words)
print(f"clustered into {len(lines)} text lines, median glyph height {med_h:.1f} pt")

idx = bom_ocr.find_header_line(lines)
print(f"\nheader scoring (how many HEADER_VOCAB columns each line matches):")
scored = sorted(((bom_ocr.header_score(l), i, l) for i, l in enumerate(lines)),
                reverse=True, key=lambda t: t[0])
for score, i, ln in scored[:5]:
    text = " ".join(w["text"] for w in ln["words"])
    mark = "  <- chosen" if i == idx else ""
    print(f"  score {score}  y={ln['cy']:7.1f}  {text[:64]!r}{mark}")

print(f"\nMIN_HEADER_MATCHES = {bom_ocr.MIN_HEADER_MATCHES}, so anything below "
      f"that is rejected without rendering anything.")

if idx is not None:
    ln = lines[idx]
    span = bom_ocr.header_span(ln)
    print(f"\nheader line words, with the x-span that defines the table:")
    for w in ln["words"]:
        inside = span[0] - 1 <= w["bbox"][0] and w["bbox"][2] <= span[1] + 1
        print(f"  x={w['bbox'][0]:7.1f}-{w['bbox'][2]:7.1f}  "
              f"{'IN ' if inside else 'out'} {w['text']!r}")
    print(f"  header span: x {span[0]:.1f} -> {span[1]:.1f}")
    print(f"  labels: {bom_ocr.header_labels(ln, span)}")

    bbox, kept = bom_ocr.table_bbox(words, ln, med_h)
    print(f"\ngrown table bbox: {tuple(round(v, 1) for v in bbox)}  "
          f"({kept} lines kept)")
    print("  -> this rectangle is the ONLY thing rendered and sent to the model")

doc.close()
