"""All distinct attribute keys in part 6's Anark script, so the extractor's
alias table can be checked against what this drawing actually names things.
"""
import re
import sys

import fitz

PDF = sys.argv[1] if len(sys.argv) > 1 else \
    r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\6\0023-48968_02_Green_Standard.pdf"
doc = fitz.open(PDF)

blob = None
for xref in range(1, doc.xref_length()):
    try:
        obj = doc.xref_object(xref, compressed=False)
    except Exception:
        continue
    if obj and "Anark Core Script" in obj:
        blob = obj
        break
doc.close()
if blob is None:
    print("no Anark script")
    raise SystemExit(1)

pairs = re.findall(r'"([A-Za-z0-9_ .\-]{2,40})"\s*:\s*"([^"]{0,160})"', blob)
first = {}
for k, v in pairs:
    if k not in first and v.strip():
        first[k] = v.strip()

print("%d distinct keys with a value\n" % len(first))
for k in sorted(first):
    print("  %-30s %s" % (k, first[k][:80]))
