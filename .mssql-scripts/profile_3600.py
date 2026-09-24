"""Time each phase inside table-recognize (3600) on the real part-5 drawing.

Replicates run_detection_process phase by phase rather than modifying the
service, so the ~5 minutes can be attributed to a specific stage.
"""
import os
import sys
import time

SVC = r"C:\Aizera\RPA\table-recognize-3parts"
sys.path.insert(0, SVC)
os.chdir(SVC)

import config                                    # noqa: E402
import preprocess                                # noqa: E402
from paddleocr import LayoutDetection, PaddleOCR  # noqa: E402
from replace_table.recognize import (            # noqa: E402
    recognize_table_content, recognize_extra_info, recognize_title_block)
from main import (                               # noqa: E402
    detect_table_coordinates, detect_icon_coordinates, _crop_table_for_recognition)

PDF = r"C:\Aizera\RPA\RFQ\ConvertedDrawing\5\0023-62709_01_Green_Standard.pdf"
SRC = os.environ.get("PROFILE_PDF", PDF)

marks = []


class phase:
    def __init__(self, name):
        self.name = name

    def __enter__(self):
        print("  running %-42s" % self.name, end="", flush=True)
        self.t0 = time.perf_counter()
        return self

    def __exit__(self, *exc):
        secs = time.perf_counter() - self.t0
        marks.append((self.name, secs))
        print("  %8.1fs" % secs)
        return False


print("profiling table-recognize phases on:")
print("  %s\n" % SRC)
print("  device=%s  det=%s  rec=%s" % (
    config.device, config.model_name_det, config.model_name_rec))
print("  llm=%s\n" % getattr(config, "llm_model_name", "(none)"))

with phase("load models (startup, not per request)"):
    table_model = LayoutDetection(model_name=config.model_name_table,
                                  model_dir=config.model_dir_table, device=config.device)
    icon_model = LayoutDetection(model_name=config.model_name_icon,
                                 model_dir=config.model_dir_icon, device=config.device)
    ocr_model = PaddleOCR(
        text_detection_model_name=config.model_name_det,
        text_detection_model_dir=config.model_dir_det,
        text_recognition_model_name=config.model_name_rec,
        text_recognition_model_dir=config.model_dir_rec,
        use_doc_orientation_classify=config.use_doc_orientation_classify,
        use_doc_unwarping=config.use_doc_unwarping,
        use_textline_orientation=config.use_textline_orientation,
        device=config.device)

startup = marks.pop()[1]

with phase("1. preprocess (PDF -> PNG)"):
    images = preprocess.process_input_file(
        input_file_path=SRC, session_timestamp=time.strftime("profile_%H%M%S"))
print("     -> %d page(s)" % len(images))

with phase("2. table detection (PicoDet)"):
    table_coords = detect_table_coordinates(table_model, images)

with phase("3. crop table regions"):
    cropped = []
    valid = [(p, c) for p, c in table_coords.items() if c is not None]
    for p, c in valid[:2]:
        cp = _crop_table_for_recognition(p, c)
        if cp:
            cropped.append(cp)

with phase("4. LLM: table content (vision)"):
    if cropped:
        recognize_table_content(cropped)

with phase("5. LLM: extra info (vision, 2 pages)"):
    recognize_extra_info(images[:2])

with phase("6. LLM: title block (vision, 2 pages)"):
    recognize_title_block(images[:2])

with phase("7. icon detection (PicoDet)"):
    detect_icon_coordinates(icon_model, images)

with phase("8. full-page OCR (det+rec, all pages)"):
    ocr_model.predict(images)

total = sum(s for _, s in marks)
print("\n" + "=" * 66)
print("%-46s %8s %6s" % ("phase", "seconds", "share"))
print("-" * 66)
for name, secs in marks:
    print("%-46s %8.1f %5.0f%%" % (name, secs, 100 * secs / total if total else 0))
print("-" * 66)
print("%-46s %8.1f" % ("TOTAL (per request)", total))
print("%-46s %8.1f" % ("model load (once, at service start)", startup))
print("=" * 66)
