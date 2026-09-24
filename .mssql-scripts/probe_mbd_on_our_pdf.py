"""Runs table-transformer's extract_mbd against a drawing from DSRFQ's uploads.

Before porting anything, the question is whether that extractor works on OUR
files. table-transformer was written against AMAT "Green_Standard" drawings and
part 11/12 carry a file with exactly that naming, so it is worth testing before
committing to the integration.

Imports the module and calls its internals directly rather than main(), so
nothing is written to table-transformer's own output folder.

    python .mssql-scripts/probe_mbd_on_our_pdf.py <pdf path>
"""

import importlib.util
import json
import os
import sys

TT = r"C:\Aizera\RPA\table-transformer"
PDF = sys.argv[1] if len(sys.argv) > 1 else (
    r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\12"
    r"\0043-07547_03_Green_Standard.pdf")

sys.path.insert(0, TT)
spec = importlib.util.spec_from_file_location("extract_mbd",
                                              os.path.join(TT, "extract_mbd.py"))
mbd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mbd)          # module-level code only sets constants

import pymupdf

print(f"file: {os.path.basename(PDF)}  ({os.path.getsize(PDF)/1e6:.2f} MB)")
doc = pymupdf.open(PDF)
print(f"pages: {doc.page_count}  producer: {(doc.metadata.get('producer') or '?')[:60]}")

td = mbd.read_3d(doc)
print(f"\n3D annotation : format={td.get('prc_format')} "
      f"units={td.get('units')} views={len(td.get('views') or [])} "
      f"prc={'yes' if td.get('prc') else 'no'}")

embedded, quality, identity = mbd.read_embedded(doc)
print(f"embedded files: {[f['name'] for f in embedded]}")
print(f"identity from checkmate xml: {identity}")

print("scanning CAD entity map (slow) ...", flush=True)
ents, attr_only = mbd.read_entities(doc)
print(f"entities: {len(ents)}   attribute-only records: {len(attr_only)}")

parent, bom = mbd.build_bom(ents, attr_only)
doc.close()

print(f"\n== PARENT ==")
for k, v in sorted(parent.items()):
    print(f"  {k:<18} {str(v)[:70]}")

print(f"\n== BOM ({len(bom)} items) ==")
for r in bom:
    print(f"  {str(r['item']):<4} qty={str(r['quantity']):<5} "
          f"{str(r['part_no'])[:20]:<22}{str(r['material'])[:26]:<28}"
          f"{str(r['description'])[:40]}")

# The bit that matters for costing: does "SEE BOM" resolve?
S = {"part": dict(parent), "bom": bom, "_provenance": {}, "not_available": []}
before = S["part"].get("material")
mbd.resolve_material(S)
print(f"\n== MATERIAL ==")
print(f"  title block : {before!r}")
print(f"  resolved    : {S['part'].get('material')!r}")
if S["part"].get("material_resolved_from"):
    print(f"  via         : {S['part']['material_resolved_from']}")
for n in S["not_available"]:
    print(f"  note        : {n}")
