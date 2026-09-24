"""Would reading the PDF text layer find everything the OCR pass finds?

The OCR pass exists to locate text containing the customer name so it can be
redacted. Replacing it with text-layer extraction is only safe if every region
OCR would redact is still covered. Both sides are normalised to fractions of the
page so the PDF's points and the 4000px render can be compared directly.
"""
import glob
import json
import os
import sys
import tempfile
import time

import fitz

SVC = r"C:\Aizera\RPA\table-recognize-3parts"
sys.path.insert(0, SVC)
os.chdir(SVC)

for _root in [r"C:\Aizera\RPA\PythonLibrary\.venv\Lib\site-packages\nvidia"]:
    if os.path.isdir(_root):
        for _bin in glob.glob(os.path.join(_root, "*", "bin")):
            try:
                os.add_dll_directory(_bin)
            except Exception:
                pass
            os.environ["PATH"] = _bin + os.pathsep + os.environ.get("PATH", "")

import config                    # noqa: E402
from paddleocr import PaddleOCR  # noqa: E402
import preprocess                # noqa: E402

PDF = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\5\0023-62709_01_Green_Standard.pdf"
TERM = config.text_search_term.lower()
PAGES = 7


def textlayer_boxes():
    """Spans containing the term, as page-fraction rects. Mirrors what OCR
    does (a box whose text contains the term), not an exact-phrase search."""
    doc = fitz.open(PDF)
    out = {}
    t0 = time.perf_counter()
    for i in range(min(PAGES, doc.page_count)):
        page = doc[i]
        w, h = page.rect.width, page.rect.height
        found = []
        for block in page.get_text("dict").get("blocks", []):
            for line in block.get("lines", []):
                # Join the spans of a line: the layer often splits a phrase
                # across spans ("APPLIED MATERIALS" + " INC.").
                text = "".join(s.get("text", "") for s in line.get("spans", []))
                if TERM not in text.lower():
                    continue
                x0, y0, x1, y1 = line["bbox"]
                found.append((x0 / w, y0 / h, x1 / w, y1 / h, text.strip()))
        out[i] = found
    elapsed = time.perf_counter() - t0
    doc.close()
    return out, elapsed


def ocr_boxes():
    ocr = PaddleOCR(
        text_detection_model_name=config.model_name_det,
        text_detection_model_dir=config.model_dir_det,
        text_recognition_model_name=config.model_name_rec,
        text_recognition_model_dir=config.model_dir_rec,
        use_doc_orientation_classify=config.use_doc_orientation_classify,
        use_doc_unwarping=config.use_doc_unwarping,
        use_textline_orientation=config.use_textline_orientation,
        device=config.device)
    images = preprocess.process_input_file(
        input_file_path=PDF, session_timestamp=time.strftime("cmp_%H%M%S"))[:PAGES]

    from PIL import Image
    out = {}
    t0 = time.perf_counter()
    for i, res in enumerate(ocr.predict(images)):
        with tempfile.NamedTemporaryFile(mode="w+", delete=False,
                                         suffix=".json", encoding="utf-8") as tmp:
            res.save_to_json(save_path=tmp.name)
            path = tmp.name
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        os.remove(path)
        with Image.open(images[i]) as im:
            w, h = float(im.width), float(im.height)
        found = []
        for text, poly in zip(data.get("rec_texts") or [],
                              data.get("rec_polys") or data.get("dt_polys") or []):
            if TERM not in (text or "").lower():
                continue
            xs = [p[0] for p in poly]
            ys = [p[1] for p in poly]
            found.append((min(xs) / w, min(ys) / h, max(xs) / w, max(ys) / h, text.strip()))
        out[i] = found
    return out, time.perf_counter() - t0


def overlaps(a, b, slack=0.012):
    """Do two page-fraction rects overlap enough to redact the same place?"""
    ax0, ay0, ax1, ay1 = a[:4]
    bx0, by0, bx1, by1 = b[:4]
    return not (bx1 < ax0 - slack or bx0 > ax1 + slack or
                by1 < ay0 - slack or by0 > ay1 + slack)


print("extracting text layer ...")
tl, tl_time = textlayer_boxes()
print("running OCR (this is the ~4 minute pass) ...")
oc, oc_time = ocr_boxes()

tl_total = sum(len(v) for v in tl.values())
oc_total = sum(len(v) for v in oc.values())

print("\n" + "=" * 76)
print("%-26s %10s %10s" % ("", "text layer", "OCR"))
print("-" * 76)
print("%-26s %10.2fs %9.1fs" % ("time", tl_time, oc_time))
print("%-26s %10d %10d" % ("regions containing term", tl_total, oc_total))
print("-" * 76)

covered = missed = 0
misses = []
for page, ocr_found in oc.items():
    for box in ocr_found:
        if any(overlaps(box, t) for t in tl.get(page, [])):
            covered += 1
        else:
            missed += 1
            misses.append((page + 1, box[4]))

pct = 100.0 * covered / max(1, oc_total)
print("OCR regions also covered by the text layer: %d/%d (%.0f%%)"
      % (covered, oc_total, pct))
if misses:
    print("\nregions the text layer would MISS:")
    for page, text in misses[:10]:
        print("  page %d: %r" % (page, text[:66]))
else:
    print("\nNothing missed: the text layer covers every region OCR found.")

print("\nspeedup: %.0fx" % (oc_time / max(tl_time, 1e-6)))
print("=" * 76)
