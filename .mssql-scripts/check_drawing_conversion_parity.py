"""RPA/API's drawing conversion behaves like the live RFQ one.

There are two copies of this pipeline: RFQ/function.py is the one the consumer
runs, RPA/API/DrawingConversion.py is the one behind
POST /api/v1/process/drawing-conversion/convert. Every fix found on real
drawings went into the first and not the second, so the API copy would have
re-introduced all of them the day anyone switched over.

These run the two implementations' helpers side by side on the same inputs.

  1. font sizing and centring in the filled table
  2. the coordinate space the overlay is scaled against
  3. which span's style a replacement note inherits
  4. rotation of a sheet laid sideways on the page
  5. the icon overlay stream
  6. the wiring the route depends on

    C:\\Aizera\\RPA\\PythonLibrary\\.venv\\Scripts\\python.exe check_drawing_conversion_parity.py
"""
import ast
import io
import os
import sys
import typing

from PIL import Image, ImageDraw

API = r"C:\Aizera\RPA\API\DrawingConversion.py"
RFQ = r"C:\Aizera\RPA\RFQ\function.py"

fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


def lift(path, names):
    """Exec just these top-level functions, so neither module's imports run."""
    src = open(path, encoding="utf-8").read()
    tree = ast.parse(src)
    code = "\n\n".join(ast.get_source_segment(src, n) for n in tree.body
                       if isinstance(n, ast.FunctionDef) and n.name in names)
    ns = {"fitz": __import__("fitz"), "re": __import__("re"), "io": io,
          "os": os, "logger": type("L", (), {"error": lambda *a: None,
                                             "warning": lambda *a: None,
                                             "info": lambda *a: None})(),
          "Image": Image, "ImageDraw": ImageDraw,
          "ImageFont": __import__("PIL.ImageFont", fromlist=["ImageFont"]),
          "Optional": typing.Optional, "Dict": typing.Dict,
          "List": typing.List, "Any": typing.Any,
          "DEFAULT_REPLACE_TEXT": "TSH", "print": lambda *a, **k: None}
    exec(code, ns)
    return ns


SHARED = ["points_to_rect", "find_span_style", "create_masked_image_stream",
          "_find_best_font", "generate_filled_template", "_declared_page_size",
          "_content_rotation", "_rotated_text_origin"]
api = lift(API, SHARED)
rfq = lift(RFQ, SHARED)

import fitz  # noqa: E402

TMP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tmp_parity")
os.makedirs(TMP, exist_ok=True)

print("1. font sizing and centring")

# A template cell, and a value that has to be shrunk to fit it.
art = os.path.join(TMP, "table.png")
Image.new("RGB", (600, 200), "white").save(art)
COORDS = {"PART NUMBER": [20, 20, 580, 120], "MATERIAL": [20, 130, 580, 190]}
DATA = {"PART NUMBER": "0042-52219-03", "MATERIAL": "AL 6061-T6", "WEIGHT": "None"}

a_img = api["generate_filled_template"](art, DATA, COORDS, font_path="arialbd.ttf")
r_img = rfq["generate_filled_template"](art, DATA, COORDS, font_path="arialbd.ttf")
check("both produce an image", a_img is not None and r_img is not None)
check("pixel-for-pixel identical output",
      a_img.convert("RGB").tobytes() == r_img.convert("RGB").tobytes())

draw = ImageDraw.Draw(Image.new("RGB", (10, 10)))
for text, w, h in [("0042-52219-03", 560, 100), ("A", 60, 40), ("A LONG DESCRIPTION HERE", 200, 30)]:
    fa = api["_find_best_font"](draw, text, w, h, "arialbd.ttf")
    fr = rfq["_find_best_font"](draw, text, w, h, "arialbd.ttf")
    check(f"same font size chosen for {text[:18]!r}", fa.size == fr.size, f"{fa.size} vs {fr.size}")

# The centring fix: ink centred in the cell, not sitting low in it.
probe = Image.new("RGB", (600, 200), "white")
probe.save(art)
img = api["generate_filled_template"](art, {"PART NUMBER": "HHH"}, {"PART NUMBER": [20, 20, 580, 120]},
                                      font_path="arialbd.ttf").convert("RGB")
rows = [y for y in range(20, 120) if any(img.getpixel((x, y)) != (255, 255, 255) for x in range(20, 580))]
gap_top, gap_bottom = rows[0] - 20, 120 - rows[-1]
check("text is vertically centred in its cell", abs(gap_top - gap_bottom) <= 3,
      f"top gap {gap_top}, bottom gap {gap_bottom}")
check("a value of \"None\" is not printed",
      set(api["generate_filled_template"](
          art, {"WEIGHT": "None"}, {"WEIGHT": [0, 0, 600, 200]},
          font_path="arialbd.ttf").convert("RGB").tobytes()) == {255})

print("\n2. the coordinate space")

SPACE = {"pages": {"x_10.png": {"width": 3000, "height": 2000},
                   "x_2.png": {"width": 4000, "height": 2825},
                   "x_1.png": {"width": 4000, "height": 2825}}}
for i in (0, 1, 2):
    check(f"page {i}: same declared size",
          api["_declared_page_size"](SPACE, i) == rfq["_declared_page_size"](SPACE, i),
          api["_declared_page_size"](SPACE, i))
check("pages are ordered by their trailing number, not dict order",
      api["_declared_page_size"](SPACE, 2) == (3000, 2000))
check("no coordinate_space means None", api["_declared_page_size"](None, 0) is None
      and api["_declared_page_size"]({}, 0) is None)

src = open(API, encoding="utf-8").read()
check("the API copy prefers the declared space over the table extent",
      src.index("declared_page = _declared_page_size") < src.index("ESTIMATED from the table extent"))
check("and scales the page off it, not off a local render",
      "page_scale_x = page_rect.width / ocr_page_w" in src)
check("the old pix-based scale is gone", "page_rect.width / pix.width" not in src)

print("\n3. note style")

doc = fitz.open()
page = doc.new_page(width=600, height=400)
page.insert_text(fitz.Point(50, 100), "APPLIED MATERIALS INC", fontsize=18)
page.insert_text(fitz.Point(50, 130), "small tail", fontsize=6)
pd = page.get_text("dict")
target = fitz.Rect(45, 85, 400, 135)
sa = api["find_span_style"](pd, target)
sr = rfq["find_span_style"](pd, target)
check("same size, font and colour", sa == sr, f"{sa} vs {sr}")
check("the biggest overlap wins, not the first span found", round(sa[0]) == 18, sa[0])
empty = api["find_span_style"]({"blocks": []}, fitz.Rect(0, 0, 100, 42))
check("no selectable text falls back to the box height, not a fixed 8",
      round(empty[0]) == 42, empty[0])
check("both fall back the same way", empty == rfq["find_span_style"]({"blocks": []}, fitz.Rect(0, 0, 100, 42)))

print("\n4. rotation")

turned = fitz.open()
tp = turned.new_page(width=600, height=900)          # portrait page...
tp.insert_text(fitz.Point(500, 700), "PART NUMBER", fontsize=12, rotate=270)
tpd = tp.get_text("dict")
box = fitz.Rect(450, 600, 560, 850)                  # ...tall title block
aa = api["_content_rotation"](tpd, box, artwork_landscape=True)
rr = rfq["_content_rotation"](tpd, box, artwork_landscape=True)
check("same angle read off the text direction", aa == rr, f"{aa} vs {rr}")
check("top-to-bottom text reads as 270", aa == 270, aa)
check("an upright box with no text reads as 0",
      api["_content_rotation"]({"blocks": [], "width": 600}, fitz.Rect(10, 10, 500, 200),
                               artwork_landscape=True) == 0)
check("a sideways box with no text on the left reads as 270",
      api["_content_rotation"]({"blocks": [], "width": 600}, fitz.Rect(10, 10, 100, 500),
                               artwork_landscape=True) == 270)
for angle in (0, 90, 180, 270):
    check(f"same text origin at {angle}",
          tuple(api["_rotated_text_origin"](box, angle)) == tuple(rfq["_rotated_text_origin"](box, angle)))

check("the table overlay is inserted with a rotation",
      "page.insert_image(table_rect, stream=image_stream,\n                                  keep_proportion=False, rotate=table_angle)" in src)
check("so is the icon", "keep_proportion=False, rotate=table_angle)" in src)
check("replacement notes are written at their own angle", 'rotate=data.get("rotate", 0)' in src)
check("sideways note text is bounded by the box width",
      'min(size, target.width)' in src)
check("page rotation is always restored, table or no table",
      src.index("original_rotation = page.rotation") < src.index("if(ocr_rect is not None):")
      and src.count("page.set_rotation(original_rotation)") == 1)

print("\n5. the icon stream")

logo = os.path.join(TMP, "logo.png")
im = Image.new("RGBA", (200, 120), (255, 0, 0, 0))    # fully transparent
ImageDraw.Draw(im).rectangle((0, 0, 100, 60), fill=(0, 0, 255, 255))
im.save(logo)
a_bytes = api["create_masked_image_stream"](logo)
r_bytes = rfq["create_masked_image_stream"](logo)
check("same bytes as the live copy", a_bytes == r_bytes)
out = Image.open(io.BytesIO(a_bytes))
check("transparency is flattened onto white, not left to render black",
      out.mode == "RGB" and out.getpixel((190, 110)) == (255, 255, 255), out.mode)
check("the bottom-right corner is masked out", out.getpixel((199, 119)) == (255, 255, 255))

print("\n6. wiring")

apisrc = open(r"C:\Aizera\RPA\API\api.py", encoding="utf-8").read()
check("the default URL uses the hyphenated path table-recognize serves",
      "http://localhost:3600/process-document/" in apisrc)
check("and no longer points at 0.0.0.0", "0.0.0.0:3600" not in apisrc)
check("replace_text reaches the pipeline",
      '"replace_text":   replace_text' in apisrc
      and 'replace_text=erp_data.get("replace_text")' in src
      and "replace_text=replace_text," in src)
check("apply_dynamic_redaction takes the coordinate space",
      "coordinate_space: Optional[dict] = None" in src
      and "coordinate_space=json_data.get(\"coordinate_space\")" in src)

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
