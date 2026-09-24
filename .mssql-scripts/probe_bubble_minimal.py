"""Does the Bubble engine fail on any input, or only on the real drawing?

A tiny synthetic image with a little text isolates an environmental failure
(CUDA unavailable) from something specific to this drawing.
"""
import io

import requests
from PIL import Image, ImageDraw

URL = "http://localhost:5998/process_document/"

img = Image.new("RGB", (900, 600), "white")
draw = ImageDraw.Draw(img)
draw.rectangle([60, 60, 840, 540], outline="black", width=3)
draw.text((110, 120), "PART NUMBER 0023-62709", fill="black")
draw.text((110, 180), "REV 01", fill="black")
draw.ellipse([300, 300, 340, 340], outline="black", width=3)
draw.text((313, 312), "1", fill="black")

buf = io.BytesIO()
img.save(buf, format="PNG")
buf.seek(0)
print("posting a synthetic 900x600 test page to %s\n" % URL)

try:
    r = requests.post(URL, files={"file": ("test.png", buf, "image/png")}, timeout=600)
except Exception as exc:
    raise SystemExit("request failed: %r" % exc)

print("HTTP %s" % r.status_code)
text = r.text
print("\n--- body (first 1200 chars) ---")
print(text[:1200] if text.strip() else "(empty)")

print("\ninterpretation:")
if r.status_code == 500 and "OCR" in text:
    print("  Fails on a trivial page too -> the engine itself cannot run its OCR")
    print("  step, i.e. environmental (CUDA/driver), not input-specific.")
elif r.status_code == 200:
    print("  Works on a simple page -> the failure is specific to the real")
    print("  drawing (size or content), not the environment.")
