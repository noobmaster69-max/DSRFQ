"""Checks notes_ocr against the drawings in the system.

The point of the module is CORRECT note text, so the assertions are about
exact content: a note that comes back truncated or carrying a dimension
callout is a failure even though it "extracted something".
"""

import os
import sys
import time

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import notes_ocr

UP = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing"
PDF = os.path.join(UP, "12", "0043-07547_03_Green_Standard.pdf")

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


data = open(PDF, "rb").read()
# Warm up first: the first call pays PyMuPDF's import and font caching, which
# a consumer processing many parts pays once, not per part. Steady state is
# what the pipeline actually experiences.
notes = notes_ocr.extract_notes(data)
t = time.time()
notes = notes_ocr.extract_notes(data)
ms = (time.time() - t) * 1000

print(f"part 12: {len(notes)} notes in {ms:.0f} ms (steady state)\n")
for n in notes:
    flag = "PROCESS" if notes_ocr.looks_like_process(n) else "       "
    print(f"  {flag}  {n[:96]}")

print()
check("found all 14 notes", len(notes) == 14, f"got {len(notes)}")
check("extraction is cheap (<500ms)", ms < 500, f"{ms:.0f}ms")

joined = " || ".join(notes)

# Content that MUST survive - these are the specs a process is matched on.
for must in ("ASTM B700 TYPE II",
             "0250-20000, APPENDIX D",
             "0250-01019",
             "APPENDIX F, CODE III-C",
             "0250-01033",
             "METHOD 2 OR 3",
             "0250-00098"):
    check(f"kept {must!r}", must in joined)

# Noise that must NOT survive.
for bad in ("EQ SP ON 18.250", "SP ON 14.80", "8.714"):
    check(f"dropped {bad!r}", bad not in joined)

# Triage.
processes = [n for n in notes if notes_ocr.looks_like_process(n)]
print(f"\nclassified as process: {len(processes)}")
for p in processes:
    print(f"    {notes_ocr.strip_note_number(p)[:88]}")

check("silver plate is a process", any("SILVER PLATE" in p for p in processes))
check("clean is a process", any(p.lstrip("0123456789. ").startswith("CLEAN")
                                for p in processes))
# AS9100D 8.5.1.2: cosmetic acceptance is verified BY inspection, so not special.
check("cosmetic is not a special process", not any("COSMETIC" in p for p in processes))
check("EHS compliance rejected",
      not any("SHALL COMPLY" in p for p in processes))
check("dimension note rejected",
      not any("THEORETICAL SHARP CORNERS" in p for p in processes))
check("fit note rejected", not any("CLASS LN2" in p for p in processes))

print()
print("all good" if not failures else f"{len(failures)} failure(s): "
      + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
