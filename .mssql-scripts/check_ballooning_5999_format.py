"""Does RPA\\API's converter understand what Bubble-V6 on 5999 returns?

The middleware was pinned to 5998 (Bubble-V5, one route, a different response
shape). This posts a real converted page to 5999/process_document/overall, then
runs the answer through the exact converter the upload endpoint uses, and
reports whether the fields handlers.py inserts actually come out.

    python .mssql-scripts/check_ballooning_5999_format.py [image_path]

Processing one page takes anywhere from seconds to several minutes.
"""

import json
import os
import sys
import time

API = r"C:\Aizera\RPA\API"
UPLOAD = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload"
sys.path.insert(0, API)
os.chdir(API)

import requests                                            # noqa: E402

fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + detail if detail else ''}")
    if not ok:
        fails.append(name)


# A converted page image, which is what the consumer sends.
img = sys.argv[1] if len(sys.argv) > 1 else None
if not img:
    for root, _dirs, files in os.walk(UPLOAD):
        if "ConvertedDrawing" not in root:
            continue
        for fn in sorted(files):
            if fn.lower().endswith((".jpg", ".png")):
                img = os.path.join(root, fn)
                break
        if img:
            break
if not img or not os.path.isfile(img):
    sys.exit("no converted page image found to test with")

print(f"page   : {img}")
print(f"size   : {os.path.getsize(img) / 1024:.0f} KB")

URL = "http://localhost:5999/process_document/overall"
print(f"posting: {URL}\n")

t0 = time.time()
try:
    with open(img, "rb") as fh:
        r = requests.post(URL, files={"file": (os.path.basename(img), fh)},
                          timeout=900)
except Exception as exc:                                   # noqa: BLE001
    sys.exit(f"could not reach the service: {exc}")

print(f"HTTP {r.status_code} in {time.time() - t0:.0f}s")
if r.status_code != 200:
    sys.exit(f"body: {r.text[:400]}")

payload = r.json()

print("\n1. the response shape")
top = sorted(payload.keys())
print(f"        top-level keys: {top}")
check("nests OCR under views[]", isinstance(payload.get("views"), list),
      f"{len(payload.get('views') or [])} view(s)")
check("declares the sheet grid",
      bool(payload.get("start")) and bool(payload.get("end")),
      f"{payload.get('start')} -> {payload.get('end')}")
for key in ("tolerance", "notes", "border", "bom", "table"):
    check(f"has {key}", key in payload,
          f"{len(payload.get(key) or [])} item(s)")

views = payload.get("views") or []
if views:
    ocr = views[0].get("ocr_results") or {}
    check("ocr_results carries the parallel arrays",
          all(k in ocr for k in ("rec_text", "rec_polys", "belong")),
          f"{len(ocr.get('rec_text') or [])} text(s) in view 1")

print("\n2. the converter the upload endpoint runs")
from BalloonPosition import SmartPositioner                 # noqa: E402
from PIL import Image                                       # noqa: E402

with Image.open(img) as im:
    w, h = im.size
positioner = SmartPositioner(canvas_width=w, canvas_height=h)
try:
    items = positioner.process_api_response(payload)
except Exception as exc:                                    # noqa: BLE001
    items = []
    check("process_api_response ran", False, str(exc)[:200])

check("it produced balloons", len(items) > 0, f"{len(items)} item(s)")

if items:
    # Exactly the fields handlers.py binds into CostingPartBalloons.
    needed = ["BalloonNo", "Symbol", "OriginalSymbol", "CenterX", "CenterY",
              "BBoxX1", "BBoxY1", "BBoxX2", "BBoxY2", "UpperTol", "LowerTol",
              "Quantity", "Section", "GridStart", "GridEnd", "IsNote"]
    missing = sorted({f for f in needed for it in items if f not in it})
    check("every field the consumer inserts is present",
          not missing, f"missing: {missing}" if missing else "")

    notes = [i for i in items if i.get("IsNote")]
    dims = [i for i in items if not i.get("IsNote")]
    qty = [i for i in items if (i.get("Quantity") or 1) > 1]
    placed = [i for i in items if i.get("Section") not in (None, "", "UNMATCHED")]
    print(f"        {len(dims)} dimension(s), {len(notes)} note(s)")
    print(f"        {len(placed)} placed in a grid cell")
    print(f"        {len(qty)} with a quantity > 1")
    if qty:
        for i in qty[:5]:
            print(f"          Qty={i['Quantity']:<3} {str(i.get('Symbol'))[:44]}")
    else:
        print("          (none - the recogniser is still emitting the quantity"
              "\n           prefix as its own box; that is fault 2, unfixed)")

    check("the grid extent reached the items",
          any(i.get("GridStart") for i in items),
          str(items[0].get("GridStart")))

out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "bubble5999_sample.json")
with open(out, "w", encoding="utf-8") as fh:
    json.dump({"request": img, "response": payload,
               "converted_sample": items[:5]}, fh, indent=2, ensure_ascii=False)
print(f"\n        full response saved to {os.path.basename(out)}")

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
