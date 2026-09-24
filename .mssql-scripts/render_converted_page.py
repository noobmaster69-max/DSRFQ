"""Render a page of the converted drawing so the redaction can be eyeballed."""
import sys

import fitz

PDF = r"C:\Aizera\RPA\RFQ\ConvertedDrawing\5\0023-62709_01_Green_Standard.pdf"
PAGE = int(sys.argv[1]) if len(sys.argv) > 1 else 3
OUT = r"C:\Aizera\DSRFQ\.mssql-scripts\converted-page-%d.png" % PAGE

doc = fitz.open(PDF)
page = doc[PAGE - 1]
pix = page.get_pixmap(dpi=110)
pix.save(OUT)
print("rendered page %d -> %s (%dx%d)" % (PAGE, OUT, pix.width, pix.height))

# Any customer name left in the text layer of the converted file?
text = page.get_text()
for term in ("APPLIED MATERIALS", "TSH"):
    print("  %-20s occurrences in text layer: %d" % (term, text.upper().count(term)))
doc.close()
