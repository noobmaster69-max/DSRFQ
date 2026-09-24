"""Ballooning sends the engine a sharp, upright PDF render (RFQ handlers.py).

Part 35's balloon 3 read "命" for a rotated "43": the stored page image is a
72 dpi ImageMagick render (595x842) and the drawing is turned sideways on the
page. This checks _page_text_rotation / _engine_page_render / _map_engine_boxes
and runs both drawings through the live RPA API (8000 + engine 5999).

  1. rotation detection on synthetic pages
  2. coordinate round trip: a known word lands back where the PDF has it
  3. part 35 live: balloon 3's spot reads 43, no CJK anywhere
  4. part 12 live (upright sheet): no rotation, notes and dimensions still come back

    C:\\Aizera\\RPA\\PythonLibrary\\.venv\\Scripts\\python.exe check_engine_page_render.py
"""
import ast
import io
import json
import sys

import fitz
import requests
from PIL import Image

SRC = r"C:\Aizera\RPA\RFQ\handlers.py"
src = open(SRC, encoding="utf-8").read()
tree = ast.parse(src)
wanted = {"_page_text_rotation", "_engine_page_render", "_map_engine_boxes", "_page_vector_json"}
ns = {"fitz": fitz, "json": json, "YELLOW": "", "RESET": "",
      "ENGINE_RENDER_DPI": 200, "ENGINE_RENDER_MAX_SIDE": 4000}
exec("\n\n".join(ast.get_source_segment(src, n) for n in tree.body
                 if isinstance(n, ast.FunctionDef) and n.name in wanted), ns)
UP = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing"
API = "http://127.0.0.1:8000/api/v1/process/ballooning/upload"

fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


print("1. rotation from the PDF's own text")
for angle in (0, 90, 270, 180):
    d = fitz.open()
    p = d.new_page(width=400, height=600)
    for i in range(6):
        p.insert_text((150, 100 + i * 60) if angle in (0, 180) else (100 + i * 40, 300), f"DIM {i} 12.5", fontsize=10, rotate=angle)
    check(f"text written at {angle} -> {angle}", ns["_page_text_rotation"](p) == angle, ns["_page_text_rotation"](p))
d = fitz.open()
p = d.new_page(width=400, height=600)
for i in range(8):
    p.insert_text((50, 60 + i * 40), f"UPRIGHT NOTE NUMBER {i}", fontsize=10)
p.insert_text((300, 300), "43", fontsize=10, rotate=270)
check("a few rotated callouts do not turn an upright sheet", ns["_page_text_rotation"](p) == 0)
check("a page with no text is not turned", ns["_page_text_rotation"](fitz.open().new_page()) == 0)

print("\n2. coordinate round trip")
pdf35 = fitz.open(f"{UP}\\35\\side plate.pdf")
stored = Image.open(f"{UP}\\35\\Image\\side plate_Page_1.png")
W, H = stored.size
png, vec, to_image, angle, (rw, rh) = ns["_engine_page_render"](pdf35, 1, W, H)
check("part 35 is detected as turned 270", angle == 270, angle)
check("rendered upright and larger (landscape, ~200 dpi)", rw > rh and rw >= 2000, (rw, rh))
words = json.loads(vec)[0]["words"]
logo = next(w for w in words if w["text"] == "Walta")
src_word = next(w for w in pdf35[0].get_text("words") if w[4] == "Walta")
x1, y1 = to_image(logo["bbox"][0], logo["bbox"][1])
x2, y2 = to_image(logo["bbox"][2], logo["bbox"][3])
page_rect = pdf35[0].rect
want = (src_word[0] * W / page_rect.width, src_word[1] * H / page_rect.height,
        src_word[2] * W / page_rect.width, src_word[3] * H / page_rect.height)
got = (min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2))
check("a word rendered and mapped back lands on its PDF position (within 1 px)",
      all(abs(a - b) <= 1 for a, b in zip(got, want)), [round(v, 1) for v in got] + ["vs"] + [round(v, 1) for v in want])
recs = [{"BBoxX1": logo["bbox"][2], "BBoxY1": logo["bbox"][3], "BBoxX2": logo["bbox"][0], "BBoxY2": logo["bbox"][1],
         "CenterX": 10, "CenterY": 10}]
ns["_map_engine_boxes"](recs, to_image, [("BBoxX1", "BBoxY1"), ("BBoxX2", "BBoxY2"), ("CenterX", "CenterY")])
check("mapped boxes come out ordered (x1<x2, y1<y2)", recs[0]["BBoxX1"] < recs[0]["BBoxX2"] and recs[0]["BBoxY1"] < recs[0]["BBoxY2"])
check("a PDF page that does not match the stored image is refused", ns["_engine_page_render"](pdf35, 1, H, W) is None)
check("no PDF -> None", ns["_engine_page_render"](None, 1, W, H) is None)


def run(pdf, stored_path, page_no=1):
    img = Image.open(stored_path)
    w, h = img.size
    png, vec, to_image, angle, _ = ns["_engine_page_render"](pdf, page_no, w, h)
    files = {"file": ("p.png", png, "image/png")}
    if vec:
        files["vector_json"] = ("v.json", vec, "application/json")
    data = requests.post(API, headers={"X-API-Key": "1231"}, files=files, timeout=900).json()
    items = data.get("data") or []
    ns["_map_engine_boxes"](items, to_image, [("BBoxX1", "BBoxY1"), ("BBoxX2", "BBoxY2"), ("CenterX", "CenterY")])
    return items, w, h, angle


print("\n3. part 35 live")
items, w, h, _ = run(pdf35, f"{UP}\\35\\Image\\side plate_Page_1.png")
pct = lambda i: (i["BBoxX1"] / w * 100, i["BBoxY1"] / h * 100, i["BBoxX2"] / w * 100, i["BBoxY2"] / h * 100)
at_b3 = [i["Symbol"] for i in items if pct(i)[0] < 39.7 and pct(i)[2] > 36.9 and pct(i)[1] < 20.5 and pct(i)[3] > 18.2]
check("balloon 3's spot reads 43", at_b3 == ["43"], at_b3)
cjk = [i["Symbol"] for i in items if any("\u4e00" <= ch <= "\u9fff" for ch in i["Symbol"])]
check("no Chinese characters on an English drawing", not cjk, cjk)
check("callouts read whole", {"4-M6thru", "2-M5thru", "4-R3"} <= {i["Symbol"] for i in items}, sorted({i["Symbol"] for i in items})[:40])
check("every box lies inside the page", all(0 <= pct(i)[0] <= pct(i)[2] <= 100 and 0 <= pct(i)[1] <= pct(i)[3] <= 100 for i in items))

print("\n4. part 12 live (upright sheet)")
pdf12 = fitz.open(f"{UP}\\12\\0043-07547_03_Green_Standard.pdf")
items, w, h, angle = run(pdf12, f"{UP}\\12\\Image\\0043-07547_03_Green_Standard_Page_1.png")
check("not turned", angle == 0, angle)
notes = [i for i in items if i.get("IsNote")]
check("its 15 notes still come back", len(notes) == 15, len(notes))
check("and dimensions", len(items) - len(notes) >= 40, len(items) - len(notes))

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
