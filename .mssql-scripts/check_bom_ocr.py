"""Checks RFQ/bom_ocr.py: the cheap gate rejects, the vision call reads.

The gate is the whole point of the design, so it is tested separately from the
expensive half -- a regression that makes find_table_pages return something for
every drawing would quietly put a 20s vision call on every part.
"""

import os
import sys
import time

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import bom_ocr

UP = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing"
CASES = [
    ("part 12  parts list on page 1 only",
     os.path.join(UP, "12", "0043-07547_03_Green_Standard.pdf"), 1),
    ("part 10  no text layer at all",
     os.path.join(UP, "10", "715-303824-001A (1).pdf"), 0),
]

failures = []


def check(name, ok, detail=""):
    print(f"  {'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


print("=== the cheap gate ===")
for title, path, want_pages in CASES:
    if not os.path.isfile(path):
        print(f"  SKIP {title}")
        continue
    t = time.time()
    pages = bom_ocr.find_table_pages(open(path, "rb").read())
    ms = (time.time() - t) * 1000
    print(f"\n{title}")
    check(f"{want_pages} page(s) with a parts list", len(pages) == want_pages,
          f"got {len(pages)}")
    check("gate is cheap (<400ms)", ms < 400, f"{ms:.0f}ms")
    for pno, bbox, labels in pages:
        print(f"       page {pno + 1}: {labels}")

# The expensive half, once, on the drawing that has a table.
print("\n=== the vision call ===")
path = CASES[0][1]
if os.path.isfile(path):
    t = time.time()
    rows = bom_ocr.extract(open(path, "rb").read())
    secs = time.time() - t
    print(f"  {len(rows)} row(s) in {secs:.1f}s")
    check("returned rows", len(rows) >= 5, f"{len(rows)}")
    check("rows carry a description",
          all(r.get("description") for r in rows))
    check("rows carry an item number", all(r.get("item") for r in rows))
    for r in rows[:10]:
        print(f"       item={r['item']:<4} qty={r['quantity']:<5}"
              f"{r['part_no'][:18]:<20}{r['description'][:44]}")

# And that a drawing with no table costs nothing.
print("\n=== no-table drawing goes nowhere near the model ===")
path = CASES[1][1]
if os.path.isfile(path):
    t = time.time()
    rows = bom_ocr.extract(open(path, "rb").read())
    secs = time.time() - t
    check("returns [] fast", rows == [] and secs < 1.0,
          f"{len(rows)} rows in {secs:.2f}s")

print()
print("all good" if not failures else f"{len(failures)} failure(s)")
sys.exit(1 if failures else 0)
