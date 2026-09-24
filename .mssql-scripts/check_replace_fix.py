"""The redaction now scales by the coordinate space the recogniser declared.

Lifts _declared_page_size out of function.py and checks it against the real
recogniser response, then re-derives the scale both ways.

    python .mssql-scripts/check_replace_fix.py [partId]
"""

import ast
import glob
import os
import re
import sys
import types

import fitz
import requests
import yaml

FUNCTION = r"C:\Aizera\RPA\RFQ\function.py"
PART = sys.argv[1] if len(sys.argv) > 1 else "15"
UP = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing"

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


src = open(FUNCTION, encoding="utf-8").read()
tree = ast.parse(src)
check("function.py parses", True)

fn = next((n for n in tree.body
           if isinstance(n, ast.FunctionDef) and n.name == "_declared_page_size"), None)
check("_declared_page_size exists", fn is not None)

ns = {"re": re}
exec(compile(ast.Module(body=[fn], type_ignores=[]), FUNCTION, "exec"), ns)
declared_page_size = ns["_declared_page_size"]

print()
print("=" * 74)
print("1. Unit behaviour")
print("=" * 74)

space = {"pages": {
    "d_2.png": {"width": 4000, "height": 2825},
    "d_10.png": {"width": 111, "height": 222},
    "d_1.png": {"width": 4000, "height": 2820},
}}
check("page 0 is the one ending _1, not dict order",
      declared_page_size(space, 0) == (4000, 2820), str(declared_page_size(space, 0)))
check("page 1 is the one ending _2",
      declared_page_size(space, 1) == (4000, 2825), str(declared_page_size(space, 1)))
check("page 9 is _10, ordered numerically not lexically",
      declared_page_size(space, 2) == (111, 222), str(declared_page_size(space, 2)))
check("an out-of-range page returns None",
      declared_page_size(space, 99) is None)
check("a response with no coordinate_space returns None",
      declared_page_size(None, 0) is None and declared_page_size({}, 0) is None)
check("a page missing width/height returns None",
      declared_page_size({"pages": {"a_1.png": {}}}, 0) is None)

print()
print("=" * 74)
print("2. The three scale sites all use one page scale now")
print("=" * 74)

body = src[src.index("def apply_dynamic_redaction"):]
body = body[:body.index("\ndef ", 10)]
check("page_scale_x/y are computed once",
      body.count("page_scale_x = page_rect.width") == 1)
check("no site divides by the local pixmap any more",
      "page_rect.width/pix.width" not in body and "w/pix.width" not in body)
check("the local render is only the fallback",
      body.count("get_pixmap(dpi=PDF_RENDER_DPI)") == 1
      and "did not" in body)

print()
print("=" * 74)
print(f"3. Against the live recogniser, part {PART}")
print("=" * 74)

with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)
url = cfg["Url"]["NewCostingPartsV2"]
pdf = next(p for p in glob.glob(os.path.join(UP, PART, "*"))
           if p.lower().endswith(".pdf"))

r = requests.post(url, files={"file": (os.path.basename(pdf), open(pdf, "rb").read())},
                  verify=False, timeout=600)
j = r.json()
cs = j.get("coordinate_space")

got = declared_page_size(cs, 0)
print(f"  declared for page 1: {got}")
check("the helper reads the live response", got is not None, str(got))

doc = fitz.open(pdf)
page = doc[0]
page_rect = page.rect
pix = page.get_pixmap(dpi=200)
doc.close()

old_sx = page_rect.width / pix.width
new_sx = page_rect.width / got[0]
print(f"  old scale x: {old_sx:.6f}   new scale x: {new_sx:.6f}")
check("the scale changed", abs(new_sx - old_sx) > 1e-6,
      f"{old_sx:.6f} -> {new_sx:.6f}")

table = {k: v for k, v in j["coordinates"]["table"].items() if v}
pt = table[next(iter(table))]["coordinates"][0]
old_pos = (pt[0] * old_sx, pt[1] * (page_rect.height / pix.height))
new_pos = (pt[0] * new_sx, pt[1] * (page_rect.height / got[1]))
print(f"  title-block corner: {old_pos[0]:.0f},{old_pos[1]:.0f} -> "
      f"{new_pos[0]:.0f},{new_pos[1]:.0f} pt")

# The title block is bottom-right on this drawing, so the corrected point must
# land in the bottom-right quadrant of the page. The old one did not.
in_quadrant = (new_pos[0] > page_rect.width / 2 and new_pos[1] > page_rect.height / 2)
was_in = (old_pos[0] > page_rect.width / 2 and old_pos[1] > page_rect.height / 2)
print(f"  page is {page_rect.width:.0f} x {page_rect.height:.0f} pt")
check("the corrected point lands in the bottom-right quadrant, where the "
      "title block is", in_quadrant)
check("the old one did not", not was_in)

print()
print("all good" if not failures else f"{len(failures)} failure(s): "
      + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
