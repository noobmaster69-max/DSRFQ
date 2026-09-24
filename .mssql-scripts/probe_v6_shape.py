r"""Ask the 5999 engine for a real response and record its exact shape.

No saved response has the V6 shape: One Supply writes the debug file AFTER
_call_cloud_api returns, and on V6 that call raises first. So the only way to
see it is to ask the engine directly.

    python .mssql-scripts/probe_v6_shape.py [image]
"""

import glob
import json
import os
import sys

import requests

URL = "http://127.0.0.1:5999/process_document/overall"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "v6_response.json")


def find_image():
    for pattern in (
        r"C:\Aizera\RPA\RFQ\ConvertedDrawing\**\*.png",
        r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\**\*.png",
        r"C:\Aizera\RPA\RFQ\replaced_img\**\*.png",
    ):
        hits = sorted(glob.glob(pattern, recursive=True), key=os.path.getsize, reverse=True)
        if hits:
            return hits[0]
    return None


image = sys.argv[1] if len(sys.argv) > 1 else find_image()
if not image or not os.path.exists(image):
    raise SystemExit("no drawing image found to probe with")

print(f"posting {os.path.basename(image)} ({os.path.getsize(image) / 1024:,.0f} KB)")
with open(image, "rb") as fh:
    r = requests.post(URL, files={"file": (os.path.basename(image), fh)}, timeout=900)

print(f"HTTP {r.status_code}")
r.raise_for_status()
d = r.json()

with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(d, fh, ensure_ascii=False, indent=2)
print(f"saved {OUT}\n")


def describe(v):
    if isinstance(v, list):
        return f"list[{len(v)}]"
    if isinstance(v, dict):
        return f"dict{{{len(v)}}}"
    return type(v).__name__


print("root keys:")
for k, v in d.items():
    print(f"   {k:<14} {describe(v)}")

views = d.get("views") or []
print(f"\nviews: {len(views)}")
if views:
    print("   view keys:", list(views[0].keys()))
    ocr = views[0].get("ocr_results") or {}
    print("   ocr_results keys:")
    for k, v in ocr.items():
        print(f"      {k:<14} {describe(v)}")
        if isinstance(v, list) and v:
            print(f"         first: {json.dumps(v[0], ensure_ascii=False)[:80]}")
    total = sum(len((x.get("ocr_results") or {}).get("rec_text") or []) for x in views)
    print(f"\n   rec_text across all views: {total}")

print("\nhas 'normal' at root? ", "normal" in d)
