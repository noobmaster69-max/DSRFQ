"""Crop the title block from part 6's CONVERTED drawing.

The raw MBD PDF has an empty title block -- the values are injected at view
time. What matters is whether the conversion step baked them in, because
that rendered image is what the recogniser actually reads.
"""
import fitz

PDF = (r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\6\ConvertedDrawing"
       r"\0023-48968_02_Green_Standard.pdf")
OUT = r"C:\Aizera\DSRFQ\.mssql-scripts\part6-converted-titleblock.png"

doc = fitz.open(PDF)
page = doc[0]
r = page.rect
crop = fitz.Rect(r.x0 + r.width * 0.55, r.y0 + r.height * 0.70, r.x1, r.y1)
pix = page.get_pixmap(matrix=fitz.Matrix(4, 4), clip=crop)
pix.save(OUT)
print("%s (%dx%d)" % (OUT, pix.width, pix.height))

text = page.get_text()
print("\npage 1 text-layer lines: %d" % len(text.splitlines()))
for line in text.splitlines():
    s = line.strip()
    if s:
        print("  %s" % s[:110])
doc.close()
