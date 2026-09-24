"""Where does the ported extractor's parent material come from?

The port returns NITRONIC_60 where the original returns SEE BOM -> ALUMINUM.
This prints the parent material at each stage on both sides so the divergence
can be located instead of guessed at.
"""

import importlib.util
import os
import sys

TT = r"C:\Aizera\RPA\table-transformer"
PDF = (r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\14"
       r"\0035-02037_09_Green_Standard.pdf")

import pymupdf

sys.path.insert(0, TT)
spec = importlib.util.spec_from_file_location("extract_mbd",
                                              os.path.join(TT, "extract_mbd.py"))
orig = importlib.util.module_from_spec(spec)
spec.loader.exec_module(orig)

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import mbd as port

data = open(PDF, "rb").read()

doc = pymupdf.open(stream=data, filetype="pdf")
o_ents, o_attr = orig.read_entities(doc)
o_parent, o_bom = orig.build_bom(o_ents, o_attr)
doc.close()

doc = pymupdf.open(stream=data, filetype="pdf")
p_ents, p_attr = port.read_entities(doc)
p_parent, p_bom = port.build_bom(p_ents, p_attr)
doc.close()

print(f"entities   original={len(o_ents)}  ported={len(p_ents)}")
print(f"attr_only  original={len(o_attr)}  ported={len(p_attr)}")
print(f"parent material after build_bom  original={o_parent.get('material')!r}  "
      f"ported={p_parent.get('material')!r}")

# Which attribute-only records carry a MATERIAL and no CALLOUT? Those are what
# feed the parent title block.
def feeders(attr_only, label):
    print(f"\n{label}: attr_only records with MATERIAL and no CALLOUT")
    n = 0
    for a in attr_only:
        if a.get("MATERIAL") and not (a.get("CALLOUT") or "").strip():
            n += 1
            if n <= 6:
                print(f"   MATERIAL={a['MATERIAL']!r:<34} "
                      f"DB_PART_NAME={str(a.get('DB_PART_NAME'))[:34]!r}")
    print(f"   total: {n}")

feeders(o_attr, "ORIGINAL")
feeders(p_attr, "PORTED")

# And the entity Attributes, which absorb() sees first.
def ent_feeders(ents, label):
    print(f"\n{label}: entity Attributes with MATERIAL and no CALLOUT (first 6)")
    n = 0
    for e in ents.values():
        a = e.get("Attributes") or {}
        if a.get("MATERIAL") and not (a.get("CALLOUT") or "").strip():
            n += 1
            if n <= 6:
                print(f"   id={e['cadEntityId']:<7} MATERIAL={a['MATERIAL']!r:<32} "
                      f"name={str(e.get('name'))[:26]!r}")
    print(f"   total: {n}")

ent_feeders(o_ents, "ORIGINAL")
ent_feeders(p_ents, "PORTED")

print("\nresolve_material:")
S = {"part": dict(o_parent), "bom": o_bom, "_provenance": {}, "not_available": []}
orig.resolve_material(S)
print(f"  original -> {S['part'].get('material')!r}")
m, note = port.resolve_material(dict(p_parent), p_bom)
print(f"  ported   -> {m!r}  note={note!r}")
