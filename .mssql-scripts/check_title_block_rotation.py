"""Replaced title block follows a turned drawing (RFQ function.py).

  1. unit: _content_rotation reads the PDF text direction, falls back on the
     box shape and position, and leaves an upright drawing at 0
  2. live: part 31 (landscape sheet turned onto a portrait page) converts with
     the table turned 270, and its text reads the same way as the drawing's
  3. live: part 12 (ordinary landscape sheet) still converts upright

Runs the conversion in results/title_block_rotation, never over the part's files.
Needs table-recognize (3600) up.

    C:\\Aizera\\RPA\\PythonLibrary\\.venv\\Scripts\\python.exe check_title_block_rotation.py
"""
import io
import os
import shutil
import sys
from contextlib import redirect_stdout

import fitz
import requests

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, "results", "title_block_rotation")
os.makedirs(WORK, exist_ok=True)
for name in ("source", "config.yaml"):
    src = os.path.join(r"C:\Aizera\RPA\RFQ", name)
    dst = os.path.join(WORK, name)
    if os.path.exists(src) and not os.path.exists(dst):
        (shutil.copytree if os.path.isdir(src) else shutil.copy)(src, dst)
os.chdir(WORK)

import function  # noqa: E402

fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


def line(bbox, direction, text="WORD"):
    return {"lines": [{"bbox": bbox, "dir": direction, "spans": [{"text": text}]}]}


print("1. angle detection")
rot = function._content_rotation
box = fitz.Rect(50, 450, 100, 650)
check("upright text -> 0", rot({"blocks": [line((60, 500, 90, 510), (1, 0))]}, box) == 0)
check("text reading upward -> 90", rot({"blocks": [line((60, 500, 70, 540), (0, -1))]}, box) == 90)
check("text reading downward -> 270", rot({"blocks": [line((60, 500, 70, 540), (0, 1))]}, box) == 270)
check("upside down -> 180", rot({"blocks": [line((60, 500, 90, 510), (-1, 0))]}, box) == 180)
check("text away from the box does not count",
      rot({"width": 595, "blocks": [line((400, 50, 500, 60), (1, 0))]}, box) == 270)
check("the longer text wins a split vote",
      rot({"blocks": [line((60, 500, 70, 540), (0, 1), "TECHNOLOGIES PTE LTD"), line((60, 600, 90, 610), (1, 0), "A")]}, box) == 270)
check("no text, box shaped like the artwork -> 0",
      rot({"width": 595, "blocks": []}, fitz.Rect(300, 700, 580, 800), artwork_landscape=True) == 0)
check("no text, tall box on the left -> 270", rot({"width": 595, "blocks": []}, fitz.Rect(20, 450, 110, 800)) == 270)
check("no text, tall box on the right -> 90", rot({"width": 595, "blocks": []}, fitz.Rect(480, 20, 570, 400)) == 90)
check("no box -> 0", rot({"blocks": []}, None) == 0)


def convert(part, pdf_path):
    pdf = open(pdf_path, "rb").read()
    data = requests.post("http://localhost:3600/process-document/",
                         files={"file": (os.path.basename(pdf_path), pdf)}, timeout=900).json()
    log = io.StringIO()
    with redirect_stdout(log):
        out = function.drawing_conversion(part, os.path.basename(pdf_path), pdf, data)
    page = fitz.open(out)[0]
    page.get_pixmap(dpi=90).save(f"part{part}_converted.png")
    return log.getvalue(), page, data


print("\n2. part 31 - turned drawing")
log, page, data = convert(31, r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\31\side plate.pdf")
check("the conversion says the drawing is turned 270", "turned 270 degrees" in log)
tb = data["coordinates"]["table"]
box = next(iter(tb.values()))["bounding_box"]
size = next(iter(data["coordinate_space"]["pages"].values()))
area = fitz.Rect(box["x_min"] / size["width"] * page.rect.width, box["y_min"] / size["height"] * page.rect.height,
                 box["x_max"] / size["width"] * page.rect.width, box["y_max"] / size["height"] * page.rect.height)
imgs = [page.get_image_rects(x[0]) for x in page.get_images(full=True)]
rects = [r for rs in imgs for r in rs if (r & area).get_area() > area.get_area() * 0.8]
check("the table image fills the title block box", bool(rects), [tuple(round(v) for v in r) for r in rects])
info = [i for i in page.get_image_info(xrefs=True) if fitz.Rect(i["bbox"]).intersects(area)]
turned = [i for i in info if abs(i["transform"][0]) < 1e-3 and abs(i["transform"][3]) < 1e-3]
check("and is drawn turned, not squeezed upright", bool(turned), [tuple(round(v, 2) for v in i["transform"][:4]) for i in info])
if turned:
    b, c = turned[0]["transform"][1], turned[0]["transform"][2]
    # 270 anticlockwise = 90 clockwise: image x runs down the page, image y runs left.
    check("turned the same way the drawing's text runs (top-to-bottom)", b > 0 and c < 0, (round(b, 2), round(c, 2)))

print("\n3. part 12 - upright drawing")
log, page, data = convert(12, r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\12\0043-07547_03_Green_Standard.pdf")
check("no rotation reported", "turned" not in log)
upright = [i for i in page.get_image_info() if abs(i["transform"][1]) < 1e-3 and abs(i["transform"][2]) < 1e-3
           and i["transform"][0] > 0]
check("the table is inserted upright", bool(upright))

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}  (images in {WORK})")
sys.exit(1 if fails else 0)
