"""Can text layer + a cheaper OCR pass match full-resolution OCR coverage?

Baseline is the current configuration: server detector at the full 4000px
render. A candidate is only acceptable at 100% coverage -- every region the
baseline would redact must still be covered, or the customer's name survives
onto a converted drawing.

The text layer is free (<1s) and exact but misses vectorised text, so it is
unioned with each OCR setting rather than replacing it.
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
from PIL import Image            # noqa: E402

PDF = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\5\0023-62709_01_Green_Standard.pdf"
TERM = config.text_search_term.lower()
PAGES = 7
CANDIDATES = [None, 2496, 1920, 1536]      # None = detector default


def textlayer():
    doc = fitz.open(PDF)
    out, t0 = {}, time.perf_counter()
    for i in range(min(PAGES, doc.page_count)):
        page = doc[i]
        w, h = page.rect.width, page.rect.height
        found = []
        for block in page.get_text("dict").get("blocks", []):
            for line in block.get("lines", []):
                text = "".join(s.get("text", "") for s in line.get("spans", []))
                if TERM in text.lower():
                    x0, y0, x1, y1 = line["bbox"]
                    found.append((x0 / w, y0 / h, x1 / w, y1 / h, text.strip()))
        out[i] = found
    elapsed = time.perf_counter() - t0
    doc.close()
    return out, elapsed


def build(limit):
    kwargs = dict(
        text_detection_model_name=config.model_name_det,
        text_detection_model_dir=config.model_dir_det,
        text_recognition_model_name=config.model_name_rec,
        text_recognition_model_dir=config.model_dir_rec,
        use_doc_orientation_classify=config.use_doc_orientation_classify,
        use_doc_unwarping=config.use_doc_unwarping,
        use_textline_orientation=config.use_textline_orientation,
        device=config.device)
    if limit is not None:
        kwargs["text_det_limit_side_len"] = limit
        kwargs["text_det_limit_type"] = "max"
    return PaddleOCR(**kwargs)


def ocr_pass(ocr, images):
    out, t0 = {}, time.perf_counter()
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
            if TERM in (text or "").lower():
                xs = [p[0] for p in poly]
                ys = [p[1] for p in poly]
                found.append((min(xs) / w, min(ys) / h, max(xs) / w, max(ys) / h, text.strip()))
        out[i] = found
    return out, time.perf_counter() - t0


def overlaps(a, b, slack=0.012):
    ax0, ay0, ax1, ay1 = a[:4]
    bx0, by0, bx1, by1 = b[:4]
    return not (bx1 < ax0 - slack or bx0 > ax1 + slack or
                by1 < ay0 - slack or by0 > ay1 + slack)


def coverage(baseline, candidate):
    need = hit = 0
    misses = []
    for page, boxes in baseline.items():
        for box in boxes:
            need += 1
            if any(overlaps(box, c) for c in candidate.get(page, [])):
                hit += 1
            else:
                misses.append((page + 1, box[4]))
    return (100.0 * hit / max(1, need)), misses


images = preprocess.process_input_file(
    input_file_path=PDF, session_timestamp=time.strftime("hyb_%H%M%S"))[:PAGES]

tl, tl_time = textlayer()
print("text layer: %d region(s) in %.2fs\n" % (sum(len(v) for v in tl.values()), tl_time))

rows = []
baseline = None
for limit in CANDIDATES:
    label = "default (current)" if limit is None else "limit=%d" % limit
    print("running OCR %s ..." % label, flush=True)
    found, secs = ocr_pass(build(limit), images)
    if baseline is None:
        baseline = found
        rows.append((label, secs, 100.0, 100.0, []))
        continue

    ocr_only, _ = coverage(baseline, found)
    union = {p: found.get(p, []) + tl.get(p, []) for p in baseline}
    hybrid, misses = coverage(baseline, union)
    rows.append((label, secs, ocr_only, hybrid, misses))
    print("  %.1fs  OCR-only %.0f%%  +text-layer %.0f%%" % (secs, ocr_only, hybrid))

print("\n" + "=" * 84)
print("%-20s %9s %12s %14s %10s" % (
    "configuration", "OCR sec", "OCR only", "+ text layer", "verdict"))
print("-" * 84)
for label, secs, ocr_only, hybrid, misses in rows:
    verdict = "SAFE" if hybrid >= 100 else "loses %d" % len(misses)
    print("%-20s %9.1f %11.0f%% %13.0f%% %10s" % (
        label, secs, ocr_only, hybrid, verdict))
print("=" * 84)

best = [r for r in rows[1:] if r[3] >= 100]
if best:
    fastest = min(best, key=lambda r: r[1])
    base_secs = rows[0][1]
    print("\nFastest safe option: %s" % fastest[0])
    print("  OCR %.1fs + text layer %.2fs = %.1fs vs %.1fs now (%.1fx faster)"
          % (fastest[1], tl_time, fastest[1] + tl_time, base_secs,
             base_secs / (fastest[1] + tl_time)))
else:
    print("\nNo cheaper setting reached full coverage; keep the current one.")
    for label, secs, ocr_only, hybrid, misses in rows[1:]:
        if misses:
            print("  %s would lose: %s" % (label, misses[0][1][:56]))
