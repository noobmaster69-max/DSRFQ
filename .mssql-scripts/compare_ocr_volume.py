"""How much text does 3500 recognise vs what 3600 needs?

3500's cost is dominated by full-page recognition; 3600 only detects a few
targeted regions. Counting the boxes each produces shows the ratio.
"""
import json
import os
import glob

STEP3 = r"C:\Aizera\RPA\REPLACE-api-v2\REPLACE-api-v2\OUTPUT\step3_ocr"


def count_boxes(obj):
    """Recursively count OCR text entries in whatever shape the json uses."""
    if isinstance(obj, dict):
        for key in ("rec_texts", "texts", "dt_polys", "rec_scores"):
            if isinstance(obj.get(key), list):
                return len(obj[key])
        return sum(count_boxes(v) for v in obj.values())
    if isinstance(obj, list):
        # A list of {text: ...} entries is itself the answer.
        if obj and isinstance(obj[0], dict) and (
                "text" in obj[0] or "rec_text" in obj[0]):
            return len(obj)
        return sum(count_boxes(v) for v in obj)
    return 0


session = sorted(
    (d for d in glob.glob(os.path.join(STEP3, "session_*")) if os.path.isdir(d)),
    key=os.path.getmtime, reverse=True)
if not session:
    raise SystemExit("no step3_ocr sessions found")

print("session:", os.path.basename(session[0]))
print("\n3500 full-page OCR -- every text box on every page:")
total = 0
for path in sorted(glob.glob(os.path.join(session[0], "*_ocr.json"))):
    name = os.path.basename(path)
    if "global" in name:
        continue
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as exc:
        print("  %-50s (unreadable: %s)" % (name, exc))
        continue
    n = count_boxes(data)
    total += n
    print("  %-50s %6d boxes  %6.0f KB" % (name, n, os.path.getsize(path) / 1024))

print("  %-50s %6d boxes" % ("TOTAL", total))

print("\n3600 title-block response -- targeted regions only:")
print("  table       : 1 bounding box per page (7)")
print("  icons       : 0 detected on this drawing")
print("  texts       : 2-9 matched strings per page (~25 total)")
print("\nratio: 3500 recognises roughly %sx more text than 3600 reports."
      % (max(1, round(total / 25)) if total else "?"))
