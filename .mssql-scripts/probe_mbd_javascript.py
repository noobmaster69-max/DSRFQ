"""Adobe shows MATERIAL on page 1; the page content does not contain it.

Check the usual MBD mechanisms: document-level JavaScript that populates the
title block, and the 3D annotation's own data.
"""
import re

import fitz

PDF = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\5\0023-62709_01_Green_Standard.pdf"
doc = fitz.open(PDF)

print("=== document JavaScript ===")
try:
    names = doc.get_page_labels()      # cheap call to keep pymupdf happy
except Exception:
    pass
found_js = False
for xref in range(1, doc.xref_length()):
    try:
        obj = doc.xref_object(xref, compressed=False)
    except Exception:
        continue
    if "/JavaScript" in obj or "/JS" in obj:
        found_js = True
        print("  xref %d: %s" % (xref, obj[:150].replace("\n", " ")))
        if found_js and xref > 400:
            break
if not found_js:
    print("  none found")

print("\n=== the 3D annotation ===")
page = doc[0]
for annot in page.annots():
    if annot.type[1] != "3D":
        continue
    print("  rect: %s" % [round(v) for v in annot.rect])
    info = doc.xref_object(annot.xref, compressed=False)
    print("  keys: %s" % re.findall(r"/([A-Za-z0-9]+)", info)[:18])
    # The 3D stream itself (PRC or U3D) holds the model and its PMI.
    m = re.search(r"/3DD (\d+) 0 R", info)
    if m:
        stream_xref = int(m.group(1))
        try:
            raw = doc.xref_stream_raw(stream_xref)
            print("  3D stream xref %d: %d bytes, starts %r" % (
                stream_xref, len(raw), raw[:16]))
        except Exception as exc:
            print("  3D stream unreadable: %r" % exc)

print("\n=== does ANY object in the file contain the material text? ===")
# Also try UTF-16BE, which is how PDF text strings often store it.
needles = [b"6061", b"B209", b"ALUMIN",
           "6061".encode("utf-16-be"), "ALUMIN".encode("utf-16-be")]
hits = 0
for xref in range(1, doc.xref_length()):
    raw = None
    try:
        raw = doc.xref_stream(xref)          # decompressed
    except Exception:
        pass
    if not raw:
        try:
            raw = doc.xref_object(xref, compressed=False).encode("latin-1", "ignore")
        except Exception:
            continue
    if not raw:
        continue
    for needle in needles:
        if needle in raw:
            hits += 1
            idx = raw.find(needle)
            print("  xref %d contains %r:" % (xref, needle[:8]))
            print("    %r" % raw[max(0, idx - 70):idx + 70])
            break
    if hits >= 5:
        break
if not hits:
    print("  not present in any object or decompressed stream")

print("\n=== the document JavaScript ===")
try:
    js = doc.xref_stream(955)
    if js:
        text = js.decode("latin-1", "ignore")
        for line in text.splitlines():
            if any(k in line.lower() for k in ("material", "titleblock", "field", "getfield")):
                print("  %s" % line.strip()[:110])
    else:
        print("  %s" % doc.xref_object(955, compressed=False)[:300])
except Exception as exc:
    print("  %r" % exc)
doc.close()
