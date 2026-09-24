"""Does the source PDF carry an extractable text layer?

The 3600 request spends ~91% of its time running full-page OCR whose only
product is the set of text boxes containing the customer name, for redaction.
If the PDF already has real text, that can be read exactly and instantly --
faster AND more accurate than OCR, which is currently misreading things like
REQUIREMENTS -> RECUIREMENTS and 0250 -> O25O.
"""
import time

import fitz

PDF = r"C:\Aizera\RPA\RFQ\ConvertedDrawing\5\0023-62709_01_Green_Standard.pdf"
SRC = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\5\0023-62709_01_Green_Standard.pdf"
TERM = "applied materials"

for label, path in (("converted output", PDF), ("original upload", SRC)):
    print("=" * 74)
    print("%s\n  %s" % (label, path))
    print("=" * 74)
    try:
        doc = fitz.open(path)
    except Exception as exc:
        print("  cannot open: %r\n" % exc)
        continue

    t0 = time.perf_counter()
    total_chars = 0
    hits = []
    for page_no in range(doc.page_count):
        page = doc[page_no]
        text = page.get_text()
        total_chars += len(text)
        # Rectangles for the search term, which is what redaction needs.
        for rect in page.search_for(TERM, quads=False):
            hits.append((page_no + 1, rect))
    elapsed = time.perf_counter() - t0

    print("  pages              : %d" % doc.page_count)
    print("  extractable chars  : %d" % total_chars)
    print("  '%s' rects: %d" % (TERM, len(hits)))
    print("  extraction time    : %.2fs  (OCR pass currently ~267s)" % elapsed)

    if hits:
        print("\n  first few matches:")
        for page_no, rect in hits[:6]:
            print("    page %d  (%.0f, %.0f)-(%.0f, %.0f)"
                  % (page_no, rect.x0, rect.y0, rect.x1, rect.y1))

    if total_chars > 200:
        print("\n  sample of the text layer:")
        for line in (doc[0].get_text().splitlines())[:8]:
            if line.strip():
                print("    %s" % line.strip()[:78])
    else:
        print("\n  -> no usable text layer (scanned/raster PDF); OCR is required")
    doc.close()
    print()
