"""Which page actually renders title-block values?

Page 1 renders labels with empty cells. The OCR nonetheless recovered PART
NUMBER and WEIGHT, so some other page must carry filled values.
"""
import fitz

PDF = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\5\0023-62709_01_Green_Standard.pdf"
doc = fitz.open(PDF)

TERMS = ("aluminium", "aluminum", "6061", "b209", "0.19", "0023-62709",
         "bridge", "kg")

for i in range(doc.page_count):
    page = doc[i]
    w, h = page.rect.width, page.rect.height
    clip = fitz.Rect(w * 0.60, h * 0.78, w, h)

    text = page.get_text(clip=clip)
    hits = sorted({t for t in TERMS if t in text.lower()})
    print("page %d title block: %s" % (i + 1, hits or "(no value terms)"))

    out = r"C:\Aizera\DSRFQ\.mssql-scripts\tb-page%d.png" % (i + 1)
    page.get_pixmap(clip=clip, dpi=170).save(out)

print("\nrendered per-page title-block crops to .mssql-scripts/tb-page*.png")
doc.close()
