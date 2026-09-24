"""Which PDFs in DSRFQ's uploads are actually Anark 3D MBD files?

extract_mbd only works on Anark-published 3D PDFs. Before integrating it, this
reports how many of the drawings already in the system are that kind, because
the answer decides whether the work pays off now or only for future uploads.

Cheap test: producer string + presence of a /Subtype /3D annotation. No entity
scan, so it runs over the whole folder in seconds.
"""

import os
import sys

import pymupdf

ROOTS = [r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing",
         r"C:\Aizera\RPA\table-transformer\pdf"]
if len(sys.argv) > 1:
    ROOTS = sys.argv[1:]

print(f"{'file':<48} {'pages':>5}  {'3D':>3}  producer")
print("-" * 110)
anark = plain = 0
for root in ROOTS:
    for dirpath, _, names in os.walk(root):
        for name in sorted(names):
            if not name.lower().endswith(".pdf"):
                continue
            path = os.path.join(dirpath, name)
            try:
                doc = pymupdf.open(path)
            except Exception as exc:
                print(f"{name[:47]:<48} {'?':>5}  {'?':>3}  unreadable: {exc}")
                continue
            producer = (doc.metadata.get("producer") or "")
            has3d = False
            for xref in range(1, doc.xref_length()):
                try:
                    o = doc.xref_object(xref, compressed=False)
                except Exception:
                    continue
                if o and "/Subtype /3D" in o and "/Type /Annot" in o:
                    has3d = True
                    break
            print(f"{name[:47]:<48} {doc.page_count:>5}  "
                  f"{'YES' if has3d else '-':>3}  {producer[:46]}")
            if has3d:
                anark += 1
            else:
                plain += 1
            doc.close()

print(f"\n3D MBD : {anark}")
print(f"plain  : {plain}")
