"""What does /suanfei_tsh return in its `image` field?

handlers.py already saves image['3D'] as the part picture, but PartPicture for
part 5 still holds a drawing page -- so that value is presumably null. There is
also a /get_isometric_images_tsh endpoint; check both.
"""
import json

import requests

BASE = "http://localhost:8888"
QUOTATION_ID = 5

print("=== POST /suanfei_tsh ===")
r = requests.post(BASE + "/suanfei_tsh",
                  headers={"Content-Type": "application/json"},
                  json={"quotation_id": QUOTATION_ID, "area_id": 2,
                        "strategy": "milling", "material_id": 18,
                        "surface_treatment_id": 0, "heat_treatment_id": 0},
                  timeout=600)
print("HTTP %s" % r.status_code)
try:
    data = r.json()
except ValueError:
    print(r.text[:400])
    raise SystemExit

print("top-level keys: %s" % list(data.keys()))
image = data.get("image")
if image is None:
    print("  'image' key absent")
else:
    print("  image keys: %s" % list(image.keys()))
    for key, value in image.items():
        if value is None:
            print("    %-6s -> None" % key)
        else:
            s = str(value)
            print("    %-6s -> %d chars, starts %r" % (key, len(s), s[:40]))

print("\n=== GET /get_isometric_images_tsh ===")
try:
    r2 = requests.get(BASE + "/get_isometric_images_tsh",
                      params={"quotation_id": QUOTATION_ID}, timeout=300)
    print("HTTP %s" % r2.status_code)
    try:
        d2 = r2.json()
        def describe(obj, indent="  "):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if isinstance(v, (dict, list)):
                        print("%s%s:" % (indent, k))
                        describe(v, indent + "  ")
                    elif isinstance(v, str) and len(v) > 80:
                        print("%s%s: %d chars, starts %r" % (indent, k, len(v), v[:40]))
                    else:
                        print("%s%s: %r" % (indent, k, v))
            elif isinstance(obj, list):
                print("%s(list of %d)" % (indent, len(obj)))
                if obj:
                    describe(obj[0], indent + "  ")
        describe(d2)
    except ValueError:
        print(r2.text[:300])
except Exception as exc:
    print("  failed: %r" % exc)
