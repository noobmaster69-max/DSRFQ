"""Dump the MBD attribute metadata Adobe uses to fill the title block.

The values shown in Adobe (MATERIAL, units, etc.) are injected by the embedded
AnarkCoreScript, so they never appear in the rendered page. They do appear as
JSON inside that script's stream.
"""
import json
import re

import fitz

PDF = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\5\0023-62709_01_Green_Standard.pdf"
doc = fitz.open(PDF)

import zlib


def stream_bytes(document, xref):
    """Decompressed stream for an xref, trying each route PyMuPDF offers."""
    for getter in (document.xref_stream, document.xref_stream_raw):
        try:
            data = getter(xref)
        except Exception:
            continue
        if not data:
            continue
        if data[:2] in (b"x\x9c", b"x\xda", b"x\x01"):
            try:
                return zlib.decompress(data)
            except Exception:
                pass
        return data
    return None


blob = None
for xref in range(1, doc.xref_length()):
    # The Anark script lives in a /JS *string*, not a stream, so xref_object is
    # what exposes it.
    try:
        obj = doc.xref_object(xref, compressed=False)
    except Exception:
        obj = None
    if obj and "CAD_MATERIAL" in obj:
        print("attribute metadata found in xref %d (%d chars)" % (xref, len(obj)))
        blob = obj
        break
    raw = stream_bytes(doc, xref)
    if raw and b"CAD_MATERIAL" in raw:
        print("attribute metadata found in stream xref %d" % xref)
        blob = raw.decode("utf-8", "replace")
        break

if not blob:
    raise SystemExit("no CAD_MATERIAL metadata found")

# Attributes appear as "key":"value" pairs; collect the distinct ones.
pairs = re.findall(r'"([A-Za-z0-9_ .\-]{2,40})"\s*:\s*"([^"]{0,120})"', blob)
seen = {}
for key, value in pairs:
    if key not in seen and value.strip():
        seen[key] = value

INTERESTING = ("material", "unit", "mass", "weight", "density", "part", "number",
               "revision", "title", "description", "source", "name", "uom", "scale")

print("\n=== attributes that look useful ===")
for key, value in sorted(seen.items()):
    if any(t in key.lower() for t in INTERESTING):
        print("  %-28s = %r" % (key, value[:70]))

print("\n=== every distinct attribute key (first 60) ===")
for key in sorted(seen)[:60]:
    print("  %s" % key)

print("\n=== units / linear-unit hints anywhere in the blob ===")
for pattern in (r'"[^"]*[Uu]nit[^"]*"\s*:\s*"[^"]*"',
                r'MILLIMET\w*', r'\bMM\b', r'INCH\w*'):
    hits = re.findall(pattern, blob)[:4]
    if hits:
        print("  %-28s %s" % (pattern[:26], hits))
doc.close()
