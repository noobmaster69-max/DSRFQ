"""Can the full-page OCR pass be made cheaper without losing what it is for?

That pass costs ~91% of a 3600 request, and its only product is the set of text
boxes containing config.text_search_term (used to redact the customer name).
So the test is not "is the OCR as good" but "does it still find the same
strings" -- at lower resolution, and with the mobile detector.
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

import config                       # noqa: E402
from paddleocr import PaddleOCR     # noqa: E402
from PIL import Image               # noqa: E402
import preprocess                   # noqa: E402

PDF = r"C:\Aizera\RPA\RFQ\ConvertedDrawing\5\0023-62709_01_Green_Standard.pdf"
TERM = config.text_search_term.lower()
PAGES = 3          # enough to compare; the full run is 7


def matches(ocr, images):
    """Run the pass exactly as main.py does and return the matched strings."""
    found = []
    for res in ocr.predict(images):
        with tempfile.NamedTemporaryFile(mode="w+", delete=False,
                                         suffix=".json", encoding="utf-8") as tmp:
            res.save_to_json(save_path=tmp.name)
            path = tmp.name
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        os.remove(path)
        for text in data.get("rec_texts", []):
            if TERM in (text or "").lower():
                found.append(text.strip())
    return found


def build(det_name, det_dir):
    return PaddleOCR(
        text_detection_model_name=det_name,
        text_detection_model_dir=det_dir,
        text_recognition_model_name=config.model_name_rec,
        text_recognition_model_dir=config.model_dir_rec,
        use_doc_orientation_classify=config.use_doc_orientation_classify,
        use_doc_unwarping=config.use_doc_unwarping,
        use_textline_orientation=config.use_textline_orientation,
        device=config.device)


def resized(images, max_side):
    """Copies of the pages scaled to max_side, mimicking a lower
    image_max_dimension without touching the service config."""
    out = []
    folder = os.path.join(config.upload_dir, "tune_%d" % max_side)
    os.makedirs(folder, exist_ok=True)
    for path in images:
        with Image.open(path) as im:
            im = im.convert("RGB")
            im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
            dst = os.path.join(folder, os.path.basename(path))
            im.save(dst)
            out.append(dst)
    return out


images = preprocess.process_input_file(
    input_file_path=PDF, session_timestamp=time.strftime("tune_%H%M%S"))[:PAGES]
with Image.open(images[0]) as im:
    print("\nbaseline page size: %dx%d, %d page(s) tested\n" % (im.width, im.height, len(images)))

results = []

print("running server detector @ 4000 (current configuration)...")
ocr = build(config.model_name_det, config.model_dir_det)
t0 = time.perf_counter()
base_found = matches(ocr, images)
results.append(("server det @ 4000 (current)", time.perf_counter() - t0, base_found))

for side in (2500, 1600):
    print("running server detector @ %d..." % side)
    small = resized(images, side)
    t0 = time.perf_counter()
    found = matches(ocr, small)
    results.append(("server det @ %d" % side, time.perf_counter() - t0, found))

print("\n" + "=" * 78)
print("%-30s %9s %8s %10s" % ("configuration", "seconds", "matches", "vs current"))
print("-" * 78)
baseline_time = results[0][1]
baseline_set = set(base_found)
for name, secs, found in results:
    kept = len(baseline_set & set(found))
    print("%-30s %9.1f %8d %9s%%" % (
        name, secs, len(found),
        round(100 * kept / max(1, len(baseline_set)))))
print("-" * 78)
print("current per-page: %.1fs   →  projected 7-page pass: %.0fs"
      % (baseline_time / len(images), baseline_time / len(images) * 7))
for name, secs, _ in results[1:]:
    print("%-30s per-page %.1fs → 7 pages %.0fs (%.1fx faster)"
          % (name, secs / len(images), secs / len(images) * 7, baseline_time / secs))
print("=" * 78)

missing = baseline_set - set(results[-1][2])
if missing:
    print("\nstrings lost at the smallest size:")
    for m in sorted(missing)[:6]:
        print("  -", m[:70])
