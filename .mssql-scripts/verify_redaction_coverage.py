"""Can the OCR pass run cheaper without leaking the customer's name?

The pass exists to locate text containing config.text_search_term so it can be
redacted. Comparing exact strings across resolutions is too strict -- OCR may
read 'APPLIED MATERIALS*' at one size and 'APPLIED MATERIALS' at another while
covering the same rectangle, and redaction only cares about the rectangle.

So this measures REGION coverage: for every area the current configuration
would redact, is that area still covered at the cheaper setting? Anything less
than full coverage means the customer's name survives onto a converted drawing.
"""
import glob
import json
import os
import sys
import tempfile
import time

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

PDF = r"C:\Aizera\RPA\RFQ\ConvertedDrawing\5\0023-62709_01_Green_Standard.pdf"
TERM = config.text_search_term.lower()
PAGES = 3
# None = leave the detector at its default (what the service does today).
CANDIDATES = [None, 2496, 1920, 1536, 960]


def build(limit_side_len):
    kwargs = dict(
        text_detection_model_name=config.model_name_det,
        text_detection_model_dir=config.model_dir_det,
        text_recognition_model_name=config.model_name_rec,
        text_recognition_model_dir=config.model_dir_rec,
        use_doc_orientation_classify=config.use_doc_orientation_classify,
        use_doc_unwarping=config.use_doc_unwarping,
        use_textline_orientation=config.use_textline_orientation,
        device=config.device)
    if limit_side_len is not None:
        kwargs["text_det_limit_side_len"] = limit_side_len
        kwargs["text_det_limit_type"] = "max"
    return PaddleOCR(**kwargs)


def boxes_for(ocr, images):
    """{page: [(x0,y0,x1,y1) normalised 0..1]} for matching text."""
    out = {}
    for page_index, res in enumerate(ocr.predict(images)):
        with tempfile.NamedTemporaryFile(mode="w+", delete=False,
                                         suffix=".json", encoding="utf-8") as tmp:
            res.save_to_json(save_path=tmp.name)
            path = tmp.name
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        os.remove(path)

        texts = data.get("rec_texts") or []
        polys = data.get("rec_polys") or data.get("dt_polys") or []
        shape = data.get("input_img_shape") or data.get("img_shape")
        # Fall back to the page's own pixel size when the json omits it.
        if shape and len(shape) >= 2:
            height, width = float(shape[0]), float(shape[1])
        else:
            from PIL import Image
            with Image.open(images[page_index]) as im:
                width, height = float(im.width), float(im.height)

        found = []
        for text, poly in zip(texts, polys):
            if TERM not in (text or "").lower():
                continue
            xs = [float(p[0]) for p in poly]
            ys = [float(p[1]) for p in poly]
            found.append((min(xs) / width, min(ys) / height,
                          max(xs) / width, max(ys) / height))
        out[page_index] = found
    return out


def covered(target, candidates, slack=0.01):
    """Is `target` contained in any candidate box (with a little slack)?"""
    tx0, ty0, tx1, ty1 = target
    for cx0, cy0, cx1, cy1 in candidates:
        if (cx0 <= tx0 + slack and cy0 <= ty0 + slack
                and cx1 >= tx1 - slack and cy1 >= ty1 - slack):
            return True
    return False


images = preprocess.process_input_file(
    input_file_path=PDF, session_timestamp=time.strftime("cov_%H%M%S"))[:PAGES]
print("\n%d page(s) under test\n" % len(images))

rows = []
baseline = None
for limit in CANDIDATES:
    label = "default (current)" if limit is None else "limit_side_len=%d" % limit
    print("running %s ..." % label, flush=True)
    try:
        ocr = build(limit)
    except TypeError as exc:
        print("  unsupported parameter: %s" % exc)
        continue
    t0 = time.perf_counter()
    found = boxes_for(ocr, images)
    secs = time.perf_counter() - t0

    total = sum(len(v) for v in found.values())
    if baseline is None:
        baseline = found
        coverage = 100.0
        missed = 0
    else:
        need = sum(len(v) for v in baseline.values())
        hit = sum(1 for page, targets in baseline.items()
                  for t in targets if covered(t, found.get(page, [])))
        coverage = 100.0 * hit / max(1, need)
        missed = need - hit
    rows.append((label, secs, total, coverage, missed))
    print("  %.1fs, %d matched region(s), %.0f%% of current coverage"
          % (secs, total, coverage))

print("\n" + "=" * 84)
print("%-22s %9s %9s %11s %8s %10s" % (
    "configuration", "sec/3pg", "regions", "coverage", "missed", "7-page est"))
print("-" * 84)
for label, secs, total, coverage, missed in rows:
    flag = "" if coverage >= 100 else "  <-- LEAKS"
    print("%-22s %9.1f %9d %10.0f%% %8d %9.0fs%s" % (
        label, secs, total, coverage, missed, secs / len(images) * 7, flag))
print("=" * 84)
print("\nAnything below 100%% coverage means a region the current setup redacts")
print("would be left visible. Only a 100%% row is safe to adopt.")
