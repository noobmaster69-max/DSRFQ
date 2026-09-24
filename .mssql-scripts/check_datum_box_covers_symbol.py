r"""Does a datum's box cover the whole symbol, triangle included?

Boxing only the letter draws a rectangle round a lone capital in the middle of
the sheet: the triangle - the part that makes it a datum rather than a stray
character - fell outside it, and so did the leader.

Run from C:\Aizera\RPA\API.

    python C:\Aizera\DSRFQ\.mssql-scripts\check_datum_box_covers_symbol.py
"""

import glob
import sys

sys.path.insert(0, r"C:\Aizera\RPA\API")

from DatumDetection import detect_datum_records                    # noqa: E402

fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + str(detail) if detail else ''}")
    if not ok:
        fails.append(name)


records = []
for path in sorted(glob.glob("Image/*.png"))[:14]:
    try:
        found = detect_datum_records(path)
    except Exception as e:
        print(f"  ERROR  {path}: {e}")
        continue
    for r in found:
        records.append((path.split("/")[-1], r))

check("there are real datums to check", len(records) >= 3, len(records))
if not records:
    print("\nNo datums found - cannot check the box.")
    sys.exit(1)

print(f"\n{len(records)} datum(s) across the sample\n")
header = f"  {'letter':<8}{'box (w x h)':<16}{'letter box':<14}{'grew by':<10}covers?"
print(header)
print("  " + "-" * (len(header) - 2))

for name, r in records:
    bw = r["BBoxX2"] - r["BBoxX1"]
    bh = r["BBoxY2"] - r["BBoxY1"]
    lw = r["LetterBoxX2"] - r["LetterBoxX1"]
    lh = r["LetterBoxY2"] - r["LetterBoxY1"]
    grew = (bw * bh) / max(1.0, lw * lh)

    # The whole triangle, not merely its centre, must be inside.
    covers_tri = (r["BBoxX1"] <= r["TriangleX1"] and r["BBoxY1"] <= r["TriangleY1"]
                  and r["BBoxX2"] >= r["TriangleX2"] and r["BBoxY2"] >= r["TriangleY2"])
    covers_letter = (r["BBoxX1"] <= r["LetterBoxX1"] and r["BBoxY1"] <= r["LetterBoxY1"]
                     and r["BBoxX2"] >= r["LetterBoxX2"] and r["BBoxY2"] >= r["LetterBoxY2"])
    print(f"  {r['Letter']:<8}{bw:.0f} x {bh:<9.0f}{lw:.0f} x {lh:<7.0f}"
          f"{grew:<10.1f}{'yes' if covers_tri and covers_letter else 'NO'}")

    check(f"{name} {r['Letter']}: the triangle is inside the box", covers_tri,
          f"box=({r['BBoxX1']:.0f},{r['BBoxY1']:.0f})-({r['BBoxX2']:.0f},{r['BBoxY2']:.0f}) "
          f"tri=({r['TriangleX1']:.0f},{r['TriangleY1']:.0f})-"
          f"({r['TriangleX2']:.0f},{r['TriangleY2']:.0f})")
    check(f"{name} {r['Letter']}: the letter box is inside it too", covers_letter)
    # The centre stays the letter's, so a datum keeps its identity across
    # re-runs even though the box around it changed.
    check(f"{name} {r['Letter']}: centre is still the letter box's",
          abs(r["CenterX"] - (r["LetterBoxX1"] + r["LetterBoxX2"]) / 2) < 0.51
          and abs(r["CenterY"] - (r["LetterBoxY1"] + r["LetterBoxY2"]) / 2) < 0.51,
          f"centre=({r['CenterX']},{r['CenterY']})")
    # And it really did grow - a box identical to the letter box would mean
    # the union quietly did nothing.
    check(f"{name} {r['Letter']}: the box is bigger than the letter alone",
          grew > 1.2, f"{grew:.2f}x")

print("\nthe endpoint's response model still matches the records")
from DatumDetection import DatumSymbol                             # noqa: E402

try:
    DatumSymbol(**records[0][1])
    check("a record validates against DatumSymbol", True)
except Exception as e:
    check("a record validates against DatumSymbol", False, str(e)[:200])

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED'}")
sys.exit(1 if fails else 0)
