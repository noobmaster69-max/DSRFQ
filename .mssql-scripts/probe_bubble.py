"""Call the Bubble engine directly to see why it 500s.

Going straight to 5998 removes the RPA API middleware from the picture, so the
engine's own error text is visible rather than a wrapped 500.
"""
import glob
import os

import requests

PAGE_DIR = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\5\ConvertedDrawing\Image"
URL = "http://localhost:5998/process_document/"

pages = sorted(glob.glob(os.path.join(PAGE_DIR, "*.jpg")))
if not pages:
    # Fall back to the originals if the converted pages are not on disk here.
    pages = sorted(glob.glob(
        r"C:\Aizera\RPA\RFQ\ConvertedDrawing\5\Image\*.jpg"))

if not pages:
    raise SystemExit("no page images found to test with")

path = pages[0]
print("posting %s (%.0f KB) to %s\n" % (
    os.path.basename(path), os.path.getsize(path) / 1024, URL))

with open(path, "rb") as f:
    try:
        r = requests.post(URL, files={"file": (os.path.basename(path), f)}, timeout=600)
    except Exception as exc:
        raise SystemExit("request failed: %r" % exc)

print("HTTP %s" % r.status_code)
print("content-type: %s" % r.headers.get("content-type"))
body = r.text
print("\n--- body (first 2000 chars) ---")
print(body[:2000] if body.strip() else "(empty)")
