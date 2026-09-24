"""Every engine coordinate is mapped back to the stored image's pixels.

The engine is sent a fresh, sharper render of the PDF page (200 dpi, capped at
4000 px, turned upright), so everything it returns is in THAT image's pixels.
_map_engine_boxes moves it back into the stored page image's pixels, which is
the space the widget draws in and the space the percentages are computed from.

A field that is missed by that pass is not rejected anywhere - it is quietly
saved as a percentage of the wrong image. On part 41 the render was 1.634x the
stored image, so the three generated datum balloons (35, 36, 37) were written
1.634x too far right and too far down, one of them clean off the bottom.

  1. corner pairs and standalone points are both mapped
  2. a standalone point is never re-ordered against a corner
  3. both call sites pass every coordinate the insert later reads

    C:\\Aizera\\RPA\\PythonLibrary\\.venv\\Scripts\\python.exe check_engine_coord_mapping.py
"""
import ast
import re
import sys

SRC = r"C:\Aizera\RPA\RFQ\handlers.py"
src = open(SRC, encoding="utf-8").read()
tree = ast.parse(src)
funcs = {n.name: ast.get_source_segment(src, n) for n in tree.body
         if isinstance(n, ast.FunctionDef)}
ns = {}
exec(funcs["_map_engine_boxes"], ns)
map_boxes = ns["_map_engine_boxes"]

fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


# Part 41 page 1: a 2448x1584 pt sheet stored at 2448x1584 px and rendered for
# the engine at 4000x2588 - min(200 dpi, 4000/longest side) = 1.6340.
SCALE = 4000 / 2448.0


def to_image(x, y):
    return x / SCALE, y / SCALE


CORNERS = [("BBoxX1", "BBoxY1"), ("BBoxX2", "BBoxY2")]
DATUM_CORNERS = CORNERS + [("LetterBoxX1", "LetterBoxY1"), ("LetterBoxX2", "LetterBoxY2")]
POINT = [("CenterX", "CenterY")]

print("1. every coordinate comes back in stored-image pixels")

rec = {"BBoxX1": 800, "BBoxY1": 980, "BBoxX2": 830, "BBoxY2": 1000,
       "CenterX": 815, "CenterY": 990}
map_boxes([rec], to_image, CORNERS, points=POINT)
check("a balloon's box is mapped", round(rec["BBoxX1"], 1) == 489.6, rec["BBoxX1"])
check("a balloon's centre is mapped", round(rec["CenterX"], 1) == 498.8, rec["CenterX"])

rec = {"BBoxX1": 800, "BBoxY1": 980, "BBoxX2": 830, "BBoxY2": 1000,
       "LetterBoxX1": 810, "LetterBoxY1": 985, "LetterBoxX2": 825, "LetterBoxY2": 997,
       "CenterX": 815, "CenterY": 990, "Letter": "A"}
map_boxes([rec], to_image, DATUM_CORNERS, points=POINT)
check("a datum's box is mapped", round(rec["BBoxX1"], 1) == 489.6, rec["BBoxX1"])
check("a datum's letter box is mapped", round(rec["LetterBoxX1"], 1) == 495.7, rec["LetterBoxX1"])
check("a datum's centre is mapped - the bug", round(rec["CenterX"], 1) == 498.8, rec["CenterX"])
check("and the centre still sits inside its own box",
      rec["BBoxX1"] <= rec["CenterX"] <= rec["BBoxX2"]
      and rec["BBoxY1"] <= rec["CenterY"] <= rec["BBoxY2"],
      (rec["CenterX"], rec["CenterY"]))

print("\n2. a point is never treated as a corner")

# A 90-degree turn makes x1 > x2, which is what the re-ordering fixes. The
# centre must not be dragged into that swap with whichever corner follows it.
def rotate(x, y):
    return y, 2448 - x


rec = {"BBoxX1": 800, "BBoxY1": 980, "BBoxX2": 830, "BBoxY2": 1000,
       "LetterBoxX1": 810, "LetterBoxY1": 985, "LetterBoxX2": 825, "LetterBoxY2": 997,
       "CenterX": 815, "CenterY": 990}
map_boxes([rec], rotate, DATUM_CORNERS, points=POINT)
check("a rotated box comes back with x1 < x2", rec["BBoxX1"] < rec["BBoxX2"])
check("a rotated box comes back with y1 < y2", rec["BBoxY1"] < rec["BBoxY2"])
check("the letter box too", rec["LetterBoxX1"] < rec["LetterBoxX2"]
      and rec["LetterBoxY1"] < rec["LetterBoxY2"])
check("the centre is still inside the box after rotation",
      rec["BBoxX1"] <= rec["CenterX"] <= rec["BBoxX2"]
      and rec["BBoxY1"] <= rec["CenterY"] <= rec["BBoxY2"],
      (rec["CenterX"], rec["CenterY"]))

rec = {"CenterX": 815, "CenterY": 990}
map_boxes([rec], to_image, [], points=POINT)
check("a point on its own is mapped", round(rec["CenterX"], 1) == 498.8, rec["CenterX"])

rec = {"BBoxX1": 800, "BBoxY1": 980, "BBoxX2": None, "BBoxY2": None, "CenterX": 815, "CenterY": 990}
map_boxes([rec], to_image, CORNERS, points=POINT)
check("a half-missing box does not stop the centre being mapped",
      round(rec["CenterX"], 1) == 498.8, rec["CenterX"])

print("\n3. the call sites map everything that is later saved")

bt = funcs["ballooning_in_thread"]
calls = re.findall(r"_map_engine_boxes\((.*?)\n\s*\n", bt, re.S)
check("the datum call passes the centre as a point",
      re.search(r"_map_engine_boxes\(payload\.get\(\"datums\"\).*?points=\[\(\"CenterX\", \"CenterY\"\)\]",
                bt, re.S) is not None)
check("the balloon call passes the centre as a point",
      re.search(r"_map_engine_boxes\(balloons.*?points=\[\(\"CenterX\", \"CenterY\"\)\]",
                bt, re.S) is not None)
check("no call still appends a centre to the corner list",
      '("BBoxX2", "BBoxY2"), ("CenterX", "CenterY")]' not in bt)

# The generated-datum insert reads exactly these, so each one must be mapped.
datum_fields = set(re.findall(r'datum\["(\w+)"\]', bt))
check("the insert reads only cx, cy and box", datum_fields <= {"cx", "cy", "box", "letter",
                                                              "claimed", "confidence", "match"},
      sorted(datum_fields))
db = funcs["_datum_boxes"]
check("cx/cy come from the record's CenterX/CenterY",
      'record.get("CenterX", 0)' in db and 'record.get("CenterY", 0)' in db)

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
