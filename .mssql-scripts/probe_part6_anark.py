"""Dump the parts of part 6's Anark Core script that set title-block fields.

The extractor keys on the literal CAD_MATERIAL, which part 5's script has and
part 6's evidently does not. Find what this file names the same data.
"""
import re

import fitz

PDF = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\6\0023-48968_02_Green_Standard.pdf"
doc = fitz.open(PDF)

blob = None
for xref in range(1, doc.xref_length()):
    try:
        obj = doc.xref_object(xref, compressed=False)
    except Exception:
        continue
    if obj and "Anark Core Script" in obj:
        blob = obj
        print("script at xref %d, %d chars" % (xref, len(obj)))
        break

if blob is None:
    print("no Anark script found")
    raise SystemExit(1)

print("\ncontains CAD_MATERIAL: %s" % ("CAD_MATERIAL" in blob))

print("\n--- getField(...) targets ---")
for name in sorted(set(re.findall(r'getField\s*\(\s*"([^"]+)"', blob)))[:60]:
    print("  %s" % name)

print("\n--- assignments to a .value ---")
for m in re.findall(r'([A-Za-z0-9_\[\]". ]{2,50})\.value\s*=\s*([^;\r\n]{0,90})', blob)[:60]:
    print("  %-42s = %s" % (m[0].strip(), m[1].strip()))

print("\n--- quoted key:value pairs (what the extractor parses) ---")
pairs = re.findall(r'"([A-Za-z0-9_ .\-]{2,40})"\s*:\s*"([^"]{0,160})"', blob)
print("  %d pair(s)" % len(pairs))
for k, v in pairs[:40]:
    print("  %-32s %s" % (k, v[:70]))

print("\n--- lines mentioning material/units ---")
for line in blob.splitlines():
    if re.search(r"material|unit|uom|weight|finish", line, re.I):
        print("  %s" % line.strip()[:120])

doc.close()
