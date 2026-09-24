"""Where does 'ALUMINIUM 6061-T651 / ASTM B209' live in this PDF?

It shows in Adobe's title block but neither the widget values nor the page text
layer appear to hold it. Dump every widget and every text span near the title
block so the real source is identifiable.
"""
import fitz

PDF = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\5\0023-62709_01_Green_Standard.pdf"
doc = fitz.open(PDF)
page = doc[0]
w, h = page.rect.width, page.rect.height
print("page 1 size: %.0f x %.0f" % (w, h))

print("\n=== all widgets on page 1 (name, type, value, rect) ===")
for widget in page.widgets():
    r = widget.rect
    print("  %-30s type=%-2s value=%-18r  (%.0f,%.0f)-(%.0f,%.0f)" % (
        (widget.field_name or "")[:30], widget.field_type,
        (widget.field_value or "")[:18], r.x0, r.y0, r.x1, r.y1))

# The title block sits in the lower-right corner in the reference screenshot.
tb = fitz.Rect(w * 0.60, h * 0.78, w, h)
print("\n=== text spans inside the title-block region %s ===" % [round(v) for v in tb])
found = False
for block in page.get_text("dict", clip=tb).get("blocks", []):
    for line in block.get("lines", []):
        text = "".join(s.get("text", "") for s in line.get("spans", [])).strip()
        if text:
            found = True
            x0, y0, x1, y1 = line["bbox"]
            print("  (%4.0f,%4.0f) %r" % (x0, y0, text[:70]))
if not found:
    print("  (no text spans -- the title block is not in the text layer)")

print("\n=== searching every page for the material string ===")
for i in range(doc.page_count):
    for term in ("ALUMINIUM", "ALUMINUM", "6061", "B209", "MATERIAL"):
        hits = doc[i].search_for(term)
        if hits:
            print("  page %d: %-10s x%d  first at (%.0f,%.0f)" % (
                i + 1, term, len(hits), hits[0].x0, hits[0].y0))

print("\n=== embedded files / 3D streams ===")
try:
    print("  embfile count: %d" % doc.embfile_count())
    for n in range(doc.embfile_count()):
        info = doc.embfile_info(n)
        print("    %s (%s bytes)" % (info.get("filename"), info.get("size")))
except Exception as exc:
    print("  %r" % exc)
doc.close()
