"""Does scanning xref OBJECTS as well as streams make extract_mbd work on our files?

extract_mbd.read_entities walks decompressed streams only. Our Anark exports
(the non-_F2 variant) keep the CAD entity map in xref objects instead, so the
scan finds nothing even though the data is present. This monkey-patches the
source of records to cover both and re-runs the same extraction.

    python .mssql-scripts/probe_mbd_objectscan.py <pdf>
"""

import importlib.util
import os
import re
import sys

TT = r"C:\Aizera\RPA\table-transformer"
PDF = sys.argv[1] if len(sys.argv) > 1 else (
    r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\3"
    r"\0023-48968_02_Green_Standard.pdf")

sys.path.insert(0, TT)
spec = importlib.util.spec_from_file_location("extract_mbd",
                                              os.path.join(TT, "extract_mbd.py"))
mbd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mbd)

import pymupdf

_orig_iter = mbd.iter_streams


def iter_both(doc, depth=0):
    """Streams as before, plus every xref object rendered as bytes."""
    yield from _orig_iter(doc, depth)
    if depth:
        return
    for x in range(1, doc.xref_length()):
        try:
            o = doc.xref_object(x, compressed=False)
        except Exception:
            continue
        if o and ("cadEntityId" in o or "DB_PART_NAME" in o):
            yield o.encode("utf-8", "replace")


mbd.iter_streams = iter_both

doc = pymupdf.open(PDF)
print(f"file: {os.path.basename(PDF)}")
ents, attr_only = mbd.read_entities(doc)
print(f"entities: {len(ents)}   attribute-only records: {len(attr_only)}")
parent, bom = mbd.build_bom(ents, attr_only)
doc.close()

print("\n== PARENT ==")
for k, v in sorted(parent.items()):
    print(f"  {k:<18} {str(v)[:70]}")

print(f"\n== BOM ({len(bom)} items) ==")
for r in bom:
    print(f"  {str(r['item']):<4} qty={str(r['quantity']):<5} "
          f"{str(r['part_no'])[:20]:<22}{str(r['material'])[:26]:<28}"
          f"{str(r['description'])[:38]}")

S = {"part": dict(parent), "bom": bom, "_provenance": {}, "not_available": []}
before = S["part"].get("material")
mbd.resolve_material(S)
print("\n== MATERIAL ==")
print(f"  title block : {before!r}")
print(f"  resolved    : {S['part'].get('material')!r}")
if S["part"].get("material_resolved_from"):
    print(f"  via         : {S['part']['material_resolved_from']}")
