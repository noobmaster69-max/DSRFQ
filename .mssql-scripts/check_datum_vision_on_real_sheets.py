r"""What does RPA/API's geometric datum pass actually find on real drawings?

The wiring check proves the consumer reads the records correctly. This one
proves there is something to read: it runs DatumVision over the drawing pages
the API kept from previous uploads and prints what it found, with the record
keys the consumer depends on spelled out.

Run it from C:\Aizera\RPA\API - DatumVision is imported from there.

    python C:\Aizera\DSRFQ\.mssql-scripts\check_datum_vision_on_real_sheets.py [n]
"""

import glob
import sys

sys.path.insert(0, r"C:\Aizera\RPA\API")

from DatumDetection import detect_datum_records                    # noqa: E402

# The keys ballooning_in_thread reads off each record. A rename in DatumVision
# would silently give every datum a (0, 0) box, which lands it in the top-left
# corner of the sheet rather than failing.
NEEDED = ("Letter", "BBoxX1", "BBoxY1", "BBoxX2", "BBoxY2",
          "CenterX", "CenterY", "Confidence")

limit = int(sys.argv[1]) if len(sys.argv) > 1 else 12
files = sorted(glob.glob("Image/*.png"))[:limit]
sheets_with = 0
total = 0
missing_keys = set()

for path in files:
    try:
        records = detect_datum_records(path)
    except Exception as e:
        print(f"  ERROR  {path}: {e}")
        continue
    if not records:
        print(f"  -      {path.split('/')[-1]}")
        continue
    sheets_with += 1
    total += len(records)
    print(f"  {len(records):<3}   {path.split('/')[-1]}")
    for r in records:
        missing_keys |= {k for k in NEEDED if k not in r}
        print(f"           {r['Letter']!r}  conf {r['Confidence']:.2f}  "
              f"centre ({r['CenterX']:.0f}, {r['CenterY']:.0f})  "
              f"box ({r['BBoxX1']:.0f}, {r['BBoxY1']:.0f})-"
              f"({r['BBoxX2']:.0f}, {r['BBoxY2']:.0f})  "
              f"leader {r['LeaderDirection']}  {r['Evidence']}")

print(f"\n{total} datum(s) on {sheets_with}/{len(files)} sheets")
if missing_keys:
    print(f"MISSING KEYS the consumer needs: {sorted(missing_keys)}")
    sys.exit(1)
print("every record carried the keys the consumer reads")
