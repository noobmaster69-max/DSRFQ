"""Does RFQ/mbd.py return the same thing as table-transformer/extract_mbd.py?

The port changed the input (bytes not a path), the output (a dict not CSV) and
the record source (objects as well as streams). Any of those could have lost
data. This runs the ORIGINAL functions and the PORTED ones over the same file
and diffs the parent fields and BOM rows.

    python .mssql-scripts/compare_mbd_port.py <pdf>
"""

import importlib.util
import os
import sys

TT = r"C:\Aizera\RPA\table-transformer"
PDF = sys.argv[1] if len(sys.argv) > 1 else (
    r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\14"
    r"\0035-02037_09_Green_Standard.pdf")

import pymupdf

# --- original -------------------------------------------------------------
sys.path.insert(0, TT)
spec = importlib.util.spec_from_file_location("extract_mbd",
                                              os.path.join(TT, "extract_mbd.py"))
orig = importlib.util.module_from_spec(spec)
spec.loader.exec_module(orig)

doc = pymupdf.open(PDF)
o_ents, o_attr = orig.read_entities(doc)
o_parent, o_bom = orig.build_bom(o_ents, o_attr)
S = {"part": dict(o_parent), "bom": o_bom, "_provenance": {}, "not_available": []}
orig.resolve_material(S)
o_material = S["part"].get("material")
doc.close()

# --- ported ---------------------------------------------------------------
sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import mbd as port

got = port.extract(open(PDF, "rb").read())
p_parent = got.get("part") or {}
p_bom = got.get("bom") or []

print(f"file: {os.path.basename(PDF)}\n")
print(f"{'':<22}{'ORIGINAL':<34}{'PORTED'}")
print("-" * 90)
print(f"{'entities':<22}{len(o_ents):<34}{'(not exposed)'}")
print(f"{'bom rows':<22}{len(o_bom):<34}{len(p_bom)}")
print(f"{'material':<22}{str(o_material)[:32]:<34}{str(p_parent.get('material'))[:32]}")

keys = sorted(set(o_parent) | set(p_parent) - {"material_placeholder"})
diffs = 0
for k in keys:
    a, b = o_parent.get(k), p_parent.get(k)
    # uom is normalised by the port on purpose (MILLIMETERS -> MM)
    same = a == b or (k == "uom" and b == port.UNIT_CODES.get(str(a).upper(), a))
    if not same:
        diffs += 1
        print(f"{k:<22}{str(a)[:32]:<34}{str(b)[:32]}   <-- DIFFERS")

print(f"\nparent fields differing: {diffs}")

print(f"\n== ORIGINAL BOM ({len(o_bom)}) ==")
for r in o_bom:
    print(f"  {str(r['item']):<4} qty={str(r['quantity']):<5}"
          f"{str(r['part_no'])[:20]:<22}{str(r['material'])[:24]:<26}"
          f"{str(r['description'])[:34]}")
print(f"\n== PORTED BOM ({len(p_bom)}) ==")
for r in p_bom:
    print(f"  {str(r['item']):<4} qty={str(r['quantity']):<5}"
          f"{str(r['part_no'])[:20]:<22}{str(r['material'])[:24]:<26}"
          f"{str(r['description'])[:34]}")

if len(o_bom) != len(p_bom):
    print("\n!! BOM ROW COUNT DIFFERS - the port loses rows")
    sys.exit(1)
