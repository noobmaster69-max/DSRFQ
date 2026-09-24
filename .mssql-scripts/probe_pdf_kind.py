"""Is a PDF a scan, vector-outline text, or a normal text-layer drawing?

bom_ocr's locate step needs characters in the file. When there are none the
reason matters: a raster scan and a vector drawing whose text was converted to
outlines both give 0 words, but they call for different fixes.

  scan            -> one big image covering the page, few or no drawing ops
  vector outlines -> thousands of path ops, no text, little or no image
  normal          -> words present
"""

import os
import sys

import pymupdf

UP = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing"
TARGETS = sys.argv[1:]
if not TARGETS:
    for part in sorted(os.listdir(UP), key=lambda s: int(s) if s.isdigit() else 0):
        d = os.path.join(UP, part)
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if f.lower().endswith(".pdf"):
                TARGETS.append(os.path.join(d, f))
                break

print(f"{'part':<6}{'file':<38}{'words':>7}{'imgs':>6}{'img cover':>11}"
      f"{'paths':>8}  verdict")
print("-" * 96)
for path in TARGETS:
    part = os.path.basename(os.path.dirname(path))
    try:
        doc = pymupdf.open(path)
    except Exception as exc:
        print(f"{part:<6}{os.path.basename(path)[:36]:<38}  unreadable: {exc}")
        continue
    page = doc[0]
    words = len(page.get_text("words"))
    images = page.get_images(full=True)
    area = page.rect.width * page.rect.height

    covered = 0.0
    for img in images:
        try:
            for r in page.get_image_rects(img[0]):
                covered = max(covered, (r.width * r.height) / area)
        except Exception:
            pass

    try:
        paths = len(page.get_drawings())
    except Exception:
        paths = -1

    if words > 50:
        verdict = "text layer - locate works"
    elif covered > 0.5:
        verdict = "SCANNED (raster page) - needs OCR"
    elif paths > 500:
        verdict = "vector outlines - no characters"
    else:
        verdict = "no text, no big image - unclear"

    print(f"{part:<6}{os.path.basename(path)[:36]:<38}{words:>7}{len(images):>6}"
          f"{covered*100:>10.0f}%{paths:>8}  {verdict}")
    doc.close()
