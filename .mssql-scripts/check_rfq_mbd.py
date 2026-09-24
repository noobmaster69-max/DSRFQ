"""Checks RFQ/mbd.py against the drawings actually in DSRFQ's uploads.

Three cases have to behave differently and all three exist in the system:
  * an MBD part with a concrete material          (part 3, part 5)
  * an MBD assembly whose material says SEE BOM   (the 0042-99944 sample)
  * a plain 2D PDF with no entity map at all      (parts 8-12)

Run with any python that has pymupdf.
"""

import os
import sys

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import mbd

UP = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing"
CASES = [
    ("part 3  (MBD, concrete material)",
     os.path.join(UP, "3", "0023-48968_02_Green_Standard.pdf"),
     {"is_mbd": True, "part_number": "0023-48968", "material": "AL 6061-T6",
      "uom": "IN", "revision": "02"}),
    ("part 5  (MBD, concrete material)",
     os.path.join(UP, "5", "0023-62709_01_Green_Standard.pdf"),
     {"is_mbd": True, "part_number": "0023-62709",
      "material": "ALUMINUM 6061-T651, ASTM B209", "uom": "MM"}),
    ("sample  (MBD assembly, SEE BOM)",
     r"C:\Aizera\RPA\table-transformer\pdf\0042-99944_02_Green_Standard_F2.pdf",
     {"is_mbd": True, "part_number": "0042-99944",
      "material": "ALUMINUM 6061-T651, ASTM B209", "bom_min": 2}),
    ("part 12 (plain 2D, no entity map)",
     os.path.join(UP, "12", "0043-07547_03_Green_Standard.pdf"),
     {"empty": True}),
]

failures = []


def check(name, ok, detail=""):
    print(f"  {'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


for title, path, want in CASES:
    print(f"\n=== {title} ===")
    if not os.path.isfile(path):
        print(f"  SKIP - not found: {path}")
        continue

    got = mbd.extract(open(path, "rb").read())

    if want.get("empty"):
        check("returns {} for a non-MBD drawing", got == {}, repr(got)[:80])
        continue

    part = got.get("part") or {}
    bom = got.get("bom") or []
    print(f"  fields: {len(part)}   bom rows: {len(bom)}")
    if got.get("material_note"):
        print(f"  note  : {got['material_note']}")

    check("recognised as MBD", got.get("is_mbd") is True)
    for key in ("part_number", "revision", "material", "uom"):
        if key in want:
            check(f"{key} = {want[key]!r}", part.get(key) == want[key],
                  f"got {part.get(key)!r}")
    if "bom_min" in want:
        check(f"at least {want['bom_min']} BOM rows", len(bom) >= want["bom_min"],
              f"got {len(bom)}")
        for r in bom:
            print(f"    {str(r['item']):<3} qty={str(r['quantity']):<4} "
                  f"{str(r['part_no'])[:20]:<22}{str(r['material'])[:26]:<28}"
                  f"{str(r['description'])[:34]}")

    # Fields the pipeline will write onto CostingParts.
    for key in ("part_number", "revision", "description", "material", "uom"):
        if part.get(key):
            print(f"    -> {key:<12} {str(part[key])[:56]}")

print()
print("all good" if not failures else f"{len(failures)} failure(s): {', '.join(failures)}")
sys.exit(1 if failures else 0)
