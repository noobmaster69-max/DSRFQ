"""Why does the rendered MBD drawing lose MATERIAL and UOM?

In Adobe the title block shows ALUMINIUM 6061-T651 / ASTM B209 and WEIGHT
0.19 KG REF, but the rendered PNG the OCR sees does not. MBD drawings put those
values in AcroForm widgets, which carry no appearance stream until a viewer
generates one -- PyMuPDF renders nothing for them.
"""
import fitz

PDF = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\5\0023-62709_01_Green_Standard.pdf"

doc = fitz.open(PDF)
print("pages: %d" % doc.page_count)
print("is_form_pdf: %s" % doc.is_form_pdf)
try:
    print("need_appearances: %s" % doc.get_form_font_names.__self__.xref_get_key(
        doc.pdf_catalog(), "AcroForm/NeedAppearances"))
except Exception:
    print("need_appearances: %s" % (doc.xref_get_key(doc.pdf_catalog(), "AcroForm/NeedAppearances"),))

TERMS = ("aluminium", "aluminum", "6061", "b209", "0.19", "kg")

for page_no in range(doc.page_count):
    page = doc[page_no]
    widgets = list(page.widgets())
    annots = list(page.annots())
    if not widgets and not annots:
        continue
    print("\n=== page %d: %d widget(s), %d annot(s) ===" % (
        page_no + 1, len(widgets), len(annots)))

    for a in annots:
        print("  annot type=%s subtype=%r" % (a.type, a.type[1]))

    interesting = 0
    for w in widgets:
        value = (w.field_value or "")
        name = w.field_name or ""
        if value.strip():
            interesting += 1
            marker = ""
            if any(t in value.lower() for t in TERMS):
                marker = "   <-- what OCR is missing"
            print("  field %-28s = %-38r%s" % (name[:28], value[:38], marker))
    print("  (%d of %d widgets carry a value)" % (interesting, len(widgets)))

print("\n=== does the text layer contain the material? ===")
for page_no in range(doc.page_count):
    text = doc[page_no].get_text()
    hits = [t for t in TERMS if t in text.lower()]
    if hits:
        print("  page %d text layer contains: %s" % (page_no + 1, hits))
doc.close()
