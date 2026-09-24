"""Is the CAD entity map present in a PDF at all?

Part 3's drawing is Anark-published and carries the 3D model, yet
extract_mbd finds zero entities. Either the data is somewhere the stream walk
does not reach, or it is genuinely not in the file. This looks for the markers
three ways -- raw bytes, decompressed streams, and xref objects -- so the two
cases can be told apart.

    python .mssql-scripts/probe_mbd_markers.py <pdf> [<pdf> ...]
"""

import os
import sys

import pymupdf

MARKERS = [b"cadEntityId", b"DB_PART_NAME", b"CALLOUT", b"CAD_MATERIAL",
           b"AMAT PART-NUMBER", b"typeOfEntity", b"useCount", b"new AkPmi",
           b"Anark Core Script", b"OriginalUnits"]

for path in sys.argv[1:]:
    print(f"\n=== {os.path.basename(path)} ({os.path.getsize(path)/1e6:.2f} MB) ===")
    raw = open(path, "rb").read()
    print("  raw file bytes      : " +
          ", ".join(m.decode() for m in MARKERS if m in raw) or "  raw: none")

    doc = pymupdf.open(path)
    print(f"  embedded files      : {doc.embfile_count()}")

    hits, nstreams, nested = set(), 0, 0
    for x in range(1, doc.xref_length()):
        try:
            s = doc.xref_stream(x)
        except Exception:
            continue
        if not s:
            continue
        nstreams += 1
        if s[:5] == b"%PDF-":
            nested += 1
        for m in MARKERS:
            if m in s:
                hits.add(m.decode())
    print(f"  decompressed streams: {nstreams} ({nested} nested PDFs)")
    print(f"  markers in streams  : {', '.join(sorted(hits)) or 'none'}")

    obj_hits = set()
    for x in range(1, doc.xref_length()):
        try:
            o = doc.xref_object(x, compressed=False)
        except Exception:
            continue
        if not o:
            continue
        for m in MARKERS:
            if m.decode() in o:
                obj_hits.add(m.decode())
    print(f"  markers in objects  : {', '.join(sorted(obj_hits)) or 'none'}")
    doc.close()
