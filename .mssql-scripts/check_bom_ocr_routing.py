"""Does the ported bom_ocr still import, and does it route each page correctly?

Checks, in order:
  1. the module imports with every optional dependency resolved
  2. notes_ocr still gets the get_words()/group_lines() it borrows
  3. the pure functions behave (merge_rows, looks_like_bom, map_columns)
  4. each drawing on disk is ROUTED as expected - text vs rules vs ocr

Step 4 stops short of the vision call: it reports which path each page would
take and, for the rules path, how many candidate regions were found. That is
the part that was broken (a text-less page was skipped outright) and it is
answerable in about a second a page instead of 20.

    python .mssql-scripts/check_bom_ocr_routing.py
"""

import os
import re
import sys

RFQ = r"C:\Aizera\RPA\RFQ"
sys.path.insert(0, RFQ)
os.chdir(RFQ)

fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + detail if detail else ''}")
    if not ok:
        fails.append(name)


print("1. import")
import bom_ocr as b                                    # noqa: E402

check("module imports", True)
check("pymupdf available", b.pymupdf is not None)
check("Pillow available", b.Image is not None)
check("OpenCV + numpy available", b.cv2 is not None and b.np is not None)
check("tesseract exe on disk", os.path.isfile(b.TESSERACT_EXE), b.TESSERACT_EXE)
print(f"        config: dpi={b.DPI} rules_dpi={b.RULES_DPI} "
      f"regions={b.MAX_RULE_REGIONS} budget={b.MAX_RULE_VISION_CALLS} "
      f"retries={b.OLLAMA_RETRIES} ocr={b.OCR_LAST_RESORT}@{b.OCR_DPI}dpi")

print("\n2. the borrowed helpers notes_ocr depends on")
import notes_ocr                                        # noqa: E402
check("notes_ocr imports", True)
check("bom_ocr.get_words present", callable(getattr(b, "get_words", None)))
check("bom_ocr.group_lines present", callable(getattr(b, "group_lines", None)))
# notes_ocr calls group_lines(words) and unpacks two values
_lines, _med = b.group_lines([{"bbox": (0, 0, 10, 8), "text": "NOTES"}])
check("group_lines returns (lines, med_h)", len(_lines) == 1 and _med == 8)

print("\n3. pure functions")
check("looks_like_bom accepts a parts list",
      b.looks_like_bom(["ITEM", "QTY", "PART NUMBER", "DESCRIPTION"]))
check("looks_like_bom rejects a title block",
      not b.looks_like_bom(["DRAWN", "CHECKED", "SCALE", "SHEET"]))
check("looks_like_bom rejects nothing", not b.looks_like_bom([]))

# The guard the rules path applies to its own output. It must not touch a real
# parts-list row: these are part 12's, as the text path actually returns them.
real = [
    {"item": "2", "quantity": "2", "unit": "", "material": "",
     "part_no": "3410-00280",
     "description": "INSR THD 5/16-18 INT X 1/2-13 EXT, .43LG SST NON LKG HD",
     "extra": "(TC1-0255299)"},
    {"item": "6", "quantity": "12", "unit": "", "material": "",
     "part_no": "3410-00271",
     "description": "3410-00271 INSERT, HELICOIL, 8-32 X .246LG, 304 SST",
     "extra": "(TC3-0141638)"},
    {"item": "9", "quantity": "2", "unit": "", "material": "", "part_no": "",
     "description": "BRASS, PIN, DIA .386 X 1.50 IN, SILVER PLATED",
     "extra": "(TC3-6201224)"},
]
check("plausible_row keeps every real part-12 row",
      all(b.plausible_row(r) for r in real),
      str([r["item"] for r in real if not b.plausible_row(r)]))

# ...and the row that made the guard necessary: 659306.PDF's title block, read
# as a parts list, with our own address in the part-number cell.
check("plausible_row rejects an address as a part number",
      not b.plausible_row({
          "item": "", "quantity": "659306", "unit": "", "material": "",
          "part_no": "AIZERA SOFTEC SDN BHD, No. 44 & 46 Jalan Pelepas 4/6, "
                     "Taman Perindustrian Tanjung Pelepas, 81550 Gelang Patah",
          "description": "DRAWING TITLE: BAR, LIFT, SHIPPING, RADIUS, UHV",
          "extra": ""}))
check("plausible_row rejects a six-digit quantity",
      not b.plausible_row({"item": "1", "quantity": "659306", "unit": "",
                           "material": "", "part_no": "P-1",
                           "description": "PLATE", "extra": ""}))
check("plausible_row rejects a title-block phrase",
      not b.plausible_row({"item": "1", "quantity": "1", "unit": "",
                           "material": "", "part_no": "P-1",
                           "description": "UNLESS OTHERWISE SPECIFIED",
                           "extra": ""}))

mapped = b.map_columns(["QTY", "UI", "MATERIAL", "DESCRIPTION", "PART NUMBER",
                        "FIND NO"],
                       [["2", "EA", "AL 6061", "PLATE, TOP", "P-123", "1"]])
check("map_columns maps by label, not position",
      mapped[0]["quantity"] == "2" and mapped[0]["item"] == "1"
      and mapped[0]["part_no"] == "P-123", str(mapped[0]))

# The same list read off two sheets, plus an overlapping split_wide chunk that
# clipped one description. One item out, longest description kept, both pages.
merged, conflicts = b.merge_rows([
    {"item": "1", "part_no": "P-1", "description": "PLATE, TOP", "quantity": "2",
     "unit": "", "material": "", "extra": "", "pages": [1]},
    {"item": "1", "part_no": "P-1", "description": "PLATE", "quantity": "2",
     "unit": "", "material": "", "extra": "", "pages": [2]},
    {"item": "2", "part_no": "P-2", "description": "SCREW", "quantity": "4",
     "unit": "", "material": "", "extra": "", "pages": [1]},
])
check("merge_rows folds the repeat", len(merged) == 2, f"{len(merged)} rows")
check("merge_rows keeps the fuller cell",
      merged[0]["description"] == "PLATE, TOP", merged[0]["description"])
check("merge_rows unions the pages", merged[0]["pages"] == [1, 2],
      str(merged[0]["pages"]))
check("merge_rows sorts by item number",
      [r["item"] for r in merged] == ["1", "2"])
check("no false conflict", not conflicts, str(conflicts))

clash, conflicts = b.merge_rows([
    {"item": "1", "part_no": "P-1", "description": "", "quantity": "",
     "unit": "", "material": "", "extra": "", "pages": [1]},
    {"item": "1", "part_no": "P-9", "description": "", "quantity": "",
     "unit": "", "material": "", "extra": "", "pages": [1]},
])
check("a real clash is reported, not silently merged",
      len(clash) == 2 and len(conflicts) == 1, str(conflicts))

print("\n4. routing, per page, over the drawings on disk")
UPLOAD = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload"
drop_re = re.compile(b.DROP_WORDS_MATCHING, re.I)

pdfs = []
for root, _dirs, files in os.walk(UPLOAD):
    for fn in files:
        if fn.lower().endswith(".pdf"):
            pdfs.append(os.path.join(root, fn))
pdfs.sort(key=lambda p: os.path.getmtime(p), reverse=True)
pdfs = pdfs[:25]

if not pdfs:
    check("found drawings to route", False, f"nothing under {UPLOAD}")
else:
    print(f"  {len(pdfs)} most recent PDF(s) under the upload root\n")
    totals = {"text": 0, "text-no-header": 0, "rules": 0, "ocr": 0, "none": 0}
    for path in pdfs:
        try:
            doc = b.pymupdf.open(path)
        except Exception as exc:
            print(f"  {os.path.basename(path)[:52]:<52} could not open: {exc}")
            continue
        marks = []
        for pno in range(doc.page_count):
            page = doc[pno]
            words = b.get_words(page, drop_re)
            if words:
                lines, _ = b.group_lines(words)
                if b.find_header_line(lines) is None:
                    marks.append("t-")           # text layer, no parts-list header
                    totals["text-no-header"] += 1
                else:
                    marks.append("T")            # TEXT path, will call the model
                    totals["text"] += 1
                continue
            # no text layer: what would the RULES path find?
            _img, gray = b.render_page(page)
            boxes = b.find_tables(gray)
            if boxes:
                marks.append(f"R{len(boxes)}")   # RULES path, n candidates
                totals["rules"] += 1
            else:
                ocr = b.ocr_words(page, drop_re)
                if ocr:
                    lines, _ = b.group_lines(ocr)
                    if b.find_header_line(lines) is not None:
                        marks.append("O")        # OCR last resort finds a header
                        totals["ocr"] += 1
                    else:
                        marks.append("o-")
                        totals["none"] += 1
                else:
                    marks.append("-")
                    totals["none"] += 1
        doc.close()
        print(f"  {os.path.basename(path)[:52]:<52} {' '.join(marks)}")

    print(f"\n  T = text path (header found)          {totals['text']}")
    print(f"  t- = text layer, no parts-list header  {totals['text-no-header']}")
    print(f"  Rn = rules path, n candidate regions   {totals['rules']}")
    print(f"  O = ocr last resort found a header     {totals['ocr']}")
    print(f"  -/o- = nothing readable                {totals['none']}")
    # The point of the port: a page with no text layer used to be a hard skip.
    check("at least one text-less page is now readable",
          totals["rules"] + totals["ocr"] > 0,
          "no text-less pages in this sample" if totals["rules"] + totals["ocr"] == 0
          else "")

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
