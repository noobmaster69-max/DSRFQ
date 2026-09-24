"""Does part 6's drawing state a material at all?

Checks the PDF text layer first (cheap and exact); if the title block is
vector-drawn rather than text, falls back to cropping the lower-right corner
of page 1 so the value can be read by eye.
"""
import os
import re

import fitz

PDF = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\6\0023-48968_02_Green_Standard.pdf"
OUT = r"C:\Aizera\DSRFQ\.mssql-scripts\part6-titleblock.png"

doc = fitz.open(PDF)
print("pages: %d" % doc.page_count)

hits = []
for n, page in enumerate(doc, 1):
    text = page.get_text()
    for line in text.splitlines():
        if re.search(r"material|\bUOM\b|units?\b|finish|alloy|\bAL\b|6061|304|316",
                     line, re.I):
            hits.append((n, line.strip()))

print("\nlines mentioning material/units: %d" % len(hits))
for n, line in hits[:40]:
    print("  p%-3d %s" % (n, line[:110]))

page = doc[0]
r = page.rect
# Title block sits in the lower-right of an AMAT sheet.
crop = fitz.Rect(r.x0 + r.width * 0.55, r.y0 + r.height * 0.70, r.x1, r.y1)
pix = page.get_pixmap(matrix=fitz.Matrix(4, 4), clip=crop)
pix.save(OUT)
print("\ntitle-block crop -> %s (%dx%d)" % (OUT, pix.width, pix.height))
doc.close()
