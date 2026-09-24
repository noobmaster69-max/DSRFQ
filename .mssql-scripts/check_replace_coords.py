"""Why the wording-replace coordinates land in the wrong place.

apply_dynamic_redaction (function.py:1435-1446) converts the recogniser's pixel
coordinates into PDF points like this:

    PDF_RENDER_DPI = 200
    pix = page.get_pixmap(dpi=PDF_RENDER_DPI)
    scale_x = page_rect.width  / pix.width
    scale_y = page_rect.height / pix.height

i.e. it assumes the recogniser measured on a page rendered locally at 200 dpi.
It didn't: the recogniser renders at 200 dpi and then DOWNSCALES so the largest
side is at most `image_max_dimension`. It reports both facts in the response
under `coordinate_space`, and the consumer ignores them.

    python .mssql-scripts/check_replace_coords.py [partId]
"""

import glob
import os
import sys

import fitz
import requests
import yaml

PART = sys.argv[1] if len(sys.argv) > 1 else "15"
UP = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing"
TEMPLATE_BASE_WIDTH, TEMPLATE_BASE_HEIGHT = 5482, 1555

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)
url = cfg["Url"]["NewCostingPartsV2"]

pdf = next(p for p in glob.glob(os.path.join(UP, PART, "*"))
           if p.lower().endswith(".pdf"))
print(f"part {PART}: {os.path.basename(pdf)}\n")

data = open(pdf, "rb").read()
r = requests.post(url, files={"file": (os.path.basename(pdf), data)},
                  verify=False, timeout=600)
if r.status_code != 200:
    print(f"recogniser HTTP {r.status_code}: {r.text[:300]}")
    sys.exit(1)
j = r.json()

space = j.get("coordinate_space", {})
pages = space.get("pages", {})
first_page_name = next(iter(pages))
declared = pages[first_page_name]

print("=" * 78)
print("1. What the recogniser says its coordinates are in")
print("=" * 78)
print(f"  unit                : {space.get('unit')}")
print(f"  origin              : {space.get('origin')}")
print(f"  pdf_render_dpi      : {space.get('pdf_render_dpi')}")
print(f"  image_max_dimension : {space.get('image_max_dimension')}")
print(f"  page 1              : {declared['width']} x {declared['height']}")

check("the response declares its coordinate space",
      bool(space) and "width" in declared)

print()
print("=" * 78)
print("2. What the consumer assumes instead")
print("=" * 78)
doc = fitz.open(pdf)
page = doc[0]
page_rect = page.rect
pix = page.get_pixmap(dpi=200)
print(f"  page rect (points)  : {page_rect.width:.1f} x {page_rect.height:.1f}")
print(f"  local 200 dpi render: {pix.width} x {pix.height}   <- used as the divisor")
print(f"  recogniser's image  : {declared['width']} x {declared['height']}")

capped = pix.width != declared["width"] or pix.height != declared["height"]
check("the two coordinate spaces differ", capped,
      f"local {pix.width}x{pix.height} vs declared {declared['width']}x{declared['height']}")

print()
print("=" * 78)
print("3. The resulting displacement")
print("=" * 78)
sx_used = page_rect.width / pix.width
sy_used = page_rect.height / pix.height
sx_true = page_rect.width / declared["width"]
sy_true = page_rect.height / declared["height"]

print(f"  scale as coded : x {sx_used:.6f}  y {sy_used:.6f}")
print(f"  scale correct  : x {sx_true:.6f}  y {sy_true:.6f}")
print(f"  ratio          : x {sx_used / sx_true:.4f}  y {sy_used / sy_true:.4f}")

table = {k: v for k, v in j.get("coordinates", {}).get("table", {}).items() if v}
sample_key = next(iter(table))
pt = table[sample_key]["coordinates"][0]
bb = table[sample_key]["bounding_box"]

print(f"\n  a real title-block corner: [{pt[0]:.0f}, {pt[1]:.0f}] px")
print(f"    placed as coded : [{pt[0] * sx_used:.1f}, {pt[1] * sy_used:.1f}] pt")
print(f"    placed correctly: [{pt[0] * sx_true:.1f}, {pt[1] * sy_true:.1f}] pt")
print(f"    error           : {pt[0] * sx_used - pt[0] * sx_true:+.1f} pt across, "
      f"{pt[1] * sy_used - pt[1] * sy_true:+.1f} pt down")
print(f"    page is {page_rect.width:.0f} x {page_rect.height:.0f} pt, so that is "
      f"{abs(pt[0] * sx_used - pt[0] * sx_true) / page_rect.width * 100:.0f}% of the "
      f"page width off")

check("the displacement is significant",
      abs(pt[0] * sx_used - pt[0] * sx_true) > page_rect.width * 0.05)

print()
print("=" * 78)
print("4. The secondary issue: the page size is also guessed")
print("=" * 78)
max_x = max(c["bounding_box"]["x_max"] for c in table.values())
max_y = max(c["bounding_box"]["y_max"] for c in table.values())
print(f"  function.py:1755 estimates the page from the table extent: "
      f"{max_x:.0f} x {max_y:.0f}")
print(f"  the recogniser says it is:                                 "
      f"{declared['width']} x {declared['height']}")
print(f"  off by: x {declared['width'] / max_x:.4f}x  "
      f"y {declared['height'] / max_y:.4f}x")
print("\n  On this drawing the title block runs almost to the page corner, so the")
print("  guess is close. It is still a guess -- on a drawing whose title block")
print("  stops short, this scales everything by whatever fraction it happens to")
print("  occupy. The declared size above removes the need to guess at all.")

doc.close()
print()
print("all good" if not failures else f"{len(failures)} problem(s) confirmed")
sys.exit(0)
