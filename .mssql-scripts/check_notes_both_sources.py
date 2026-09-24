"""Special-process extraction across both drawing kinds.

Two routes have to work, and which one applies is a property of the file:
  * MBD  (part 15) -- notes are annotation text in the CAD entity map
  * 2D   (part 12) -- notes are ink, read off the PDF text layer

Both drawings carry the same four AMAT callouts, and only one of them is a
special process in the AS9100D 8.5.1.2 sense -- "can the finished part alone
prove this was done right?". CLEAN cannot be confirmed that way; PACKAGE,
COSMETIC and IDENTIFY can. This asserts the split, not just the count, so a
regression that quietly re-admits PACKAGE fails loudly.
"""

import os
import sys

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import mbd
import notes_ocr

UP = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing"
failures = []


def check(name, ok, detail=""):
    print(f"  {'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


def pdf_for(part):
    d = os.path.join(UP, str(part))
    return next(os.path.join(d, f) for f in os.listdir(d)
                if f.lower().endswith(".pdf"))


def run(part, expect_source, expect_special, expect_inspection):
    print(f"\n=== part {part} ===")
    data = open(pdf_for(part), "rb").read()

    got = mbd.extract(data)
    notes = list(got.get("notes") or [])
    source = "3D model"
    if not notes:
        notes = notes_ocr.extract_notes(data)
        source = "text layer"

    print(f"  {len(notes)} note(s) from the {source}")
    check(f"source is {expect_source}", source == expect_source, source)
    check("found notes", len(notes) >= 8, f"{len(notes)}")

    special, inspection = [], []
    for n in notes:
        kind = notes_ocr.classify_note(n)
        if kind == "special":
            special.append(notes_ocr.strip_note_number(n))
        elif kind == "inspection":
            inspection.append(notes_ocr.strip_note_number(n))

    print("  special:")
    for p in special:
        print(f"      {p[:92]}")
    print("  inspection-verifiable (not recorded):")
    for p in inspection:
        print(f"      {p[:92]}")

    check(f"{expect_special} special", len(special) == expect_special,
          f"got {len(special)}")
    check(f"{expect_inspection} inspection-verifiable",
          len(inspection) == expect_inspection, f"got {len(inspection)}")

    joined = " || ".join(special)
    check("no compliance statement", "SHALL COMPLY" not in joined)
    check("no dimensional note",
          not any(k in joined for k in ("SHARP EDGES", "HOLE SIZE TOLERANCE",
                                        "THEORETICAL SHARP")))
    # The whole point of the rule: these must not be recorded as special.
    for word in ("PACKAGE", "COSMETIC", "IDENTIFY"):
        check(f"{word} is not special", word not in joined)
    return special, inspection


p15, i15 = run(15, "3D model", 1, 3)
check("part 15 CLEAN is special", any(p.startswith("CLEAN") for p in p15))
check("part 15 kept TYPE I qualifier", any("TYPE I" in p for p in p15))
check("part 15 PACKAGE classed inspection",
      any(p.startswith("PACKAGE") for p in i15))

p12, i12 = run(12, "text layer", 2, 3)
check("part 12 SILVER PLATE is special", any("SILVER PLATE" in p for p in p12))
check("part 12 CLEAN is special", any("CLEAN" in p for p in p12))

print()
print("all good" if not failures else f"{len(failures)} failure(s): "
      + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
