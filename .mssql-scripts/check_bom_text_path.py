"""Where does the TEXT path actually resolve a parts list, and did the port
change that?

find_table_pages() is the whole TEXT-path locator and costs no vision call, so
this can sweep every drawing on disk in seconds. A page is reported only when
the header was found AND at least two lines were kept under it -- which is the
gate extract() applies before it spends a call.

    python .mssql-scripts/check_bom_text_path.py
"""

import os
import sys

RFQ = r"C:\Aizera\RPA\RFQ"
UPLOAD = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload"
sys.path.insert(0, RFQ)
os.chdir(RFQ)

import bom_ocr as b                                     # noqa: E402

pdfs = []
for root, _dirs, files in os.walk(UPLOAD):
    for fn in files:
        if fn.lower().endswith(".pdf"):
            pdfs.append(os.path.join(root, fn))
pdfs.sort()

live = 0
print(f"{len(pdfs)} PDF(s) under the upload root\n")
for path in pdfs:
    try:
        with open(path, "rb") as fh:
            found = b.find_table_pages(fh.read())
    except Exception as exc:
        print(f"  {os.path.relpath(path, UPLOAD)[:70]:<70} error: {exc}")
        continue
    if not found:
        continue
    live += 1
    rel = os.path.relpath(path, UPLOAD)
    print(f"  {rel}")
    for pno, bbox, labels in found:
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        print(f"      page {pno + 1}: {w:.0f}x{h:.0f}pt  columns {labels}")

print(f"\n{live} of {len(pdfs)} drawing(s) resolve a parts list from the text "
      f"layer alone")
if not live:
    print("  (none - so every text-path vision call on this corpus is a "
          "no-op, and the rules/ocr paths are the only ones doing work)")
