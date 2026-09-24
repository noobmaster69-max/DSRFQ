"""Special processes from drawings with no text layer, and in sentence case.

Part 32 (structure.pdf) draws its lettering as strokes: the PDF text layer holds
five words, all in the logo, so extract_notes found no notes and the part got no
special process - though its notes say "Spray paint oven baked powder coat" and
"Weld 3mm plate". The title-block recogniser (3600) had OCR'd those notes all
along. And even read, the old classifier demanded a spec number.

  1. OCR line joining and the run-on paragraph fallback
  2. classification: sentence case, no spec needed, geometry "plate" is not plating,
     timing clauses, inspection-only notes
  3. title-block treatment cells
  4. part 32 end to end, from its real 3600 response, through
     _write_special_processes against a fake cursor
  5. part 12 still yields its special processes from the text layer

    C:\\Aizera\\RPA\\PythonLibrary\\.venv\\Scripts\\python.exe check_special_process_sources.py
"""
import ast
import re
import sys

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import notes_ocr  # noqa: E402

fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


# Part 32's 3600 response, as logged by the consumer on 2026-09-15.
P32 = {
    "extra_info": {"notes": ["Note:", "1. Spray paint oven baked powder coat", "Neptune blue ICI Dulux code 2031.",
                             "2. Structure top pad to be machined after", "welding.",
                             "3. Weld 3mm plate for Mounting", "electrical base plate."]},
    "title_block": {
        "part1": {"COMPANY": "Walta Technologies (S) Pte Ltd", "SURFACE TREATMENT": "See Note", "HEAT TREATMENT": None},
        "part2": {"OTHER": "Note: 1. Spray paint oven baked powder coat Neptune blue ICI Dulux code 2031. "
                           "2. Structure top pad to be machined after welding. 3.Weld 3mm plate for Mounting "
                           "electrical base plate."}},
}

print("1. notes from OCR")
notes = notes_ocr.notes_from_ocr_lines(P32["extra_info"]["notes"])
check("three whole notes, header dropped", len(notes) == 3, notes)
check("wrapped line joined", notes[0] == "1. Spray paint oven baked powder coat Neptune blue ICI Dulux code 2031.", notes[0])
para = notes_ocr.notes_from_text_block(P32["title_block"]["part2"]["OTHER"])
check("run-on paragraph splits the same way, '3.Weld' included", [n[:8] for n in para] == ["1. Spray", "2. Struc", "3. Weld "], para)
check("'4.5mm' and 'B4.1' are not note starts",
      notes_ocr.notes_from_text_block("Notes: 1. Weld 4.5mm plate. 2. FIT PER ASME B4.1 CLASS LN2.") ==
      ["1. Weld 4.5mm plate.", "2. FIT PER ASME B4.1 CLASS LN2."])
check("'NOTES: 1. CLEAN ...' on one line", notes_ocr.notes_from_ocr_lines(["NOTES: 1. CLEAN PER 0250-20000"]) == ["1. CLEAN PER 0250-20000"])
check("an un-numbered note is still a note", notes_ocr.notes_from_ocr_lines(["NOTE:", "ALL WELDS TO BE GROUND FLUSH"]) == ["ALL WELDS TO BE GROUND FLUSH"])

print("\n2. classification")
k = notes_ocr.classify_note
check("sentence-case powder coat, no spec -> special", k(notes[0]) == "special")
check("'machined after welding' is a machining note -> not special", k(notes[1]) is None)
check("'Weld 3mm plate' -> special", k(notes[2]) == "special")
check("'base plate' alone is geometry, not plating", k("4. Drill 4 holes in base plate.") is None)
check("'SILVER PLATE PER ASTM B700' -> special", k("8 ITEM 9 FINISH: SILVER PLATE PER ASTM B700 TYPE II") == "special")
check("zinc plated -> special", k("Zinc plated, clear passivate.") == "special")
check("'Anodise black' -> special", k("5. Anodise black") == "special")
check("'Hard anodize' -> special", k("HARD ANODIZE PER MIL-A-8625 TYPE III") == "special")
check("'6061-T6 temper' material is not a process", k("MATERIAL: AL 6061-T6 TEMPER") is None)
check("fit tolerance BEFORE CLEANING -> not special", k("7 FIT PER ASME B4.1, CLASS LN2. BEFORE CLEANING.") is None)
check("EHS compliance -> not special", k("2. SHALL COMPLY WITH PRODUCT EHS REQUIREMENTS PER 0250-27105") is None)
check("dimension note -> nothing", k("10 DIMENSIONS ARE TO THEORETICAL SHARP CORNERS.") is None)
check("package with spec -> inspection", k("14. PACKAGE PER APPLIED MATERIALS 0250-00098.") == "inspection")
check("a bare 'Deburr all edges' is not an inspection record", k("Deburr all sharp edges") is None)
check("heat treat -> special", k("Heat treat to HRC 40-45") == "special")

print("\n3. title-block treatment cells")
tb = notes_ocr.processes_from_title_block
check("'See Note' names nothing", tb({"SURFACE TREATMENT": "See Note"}) == [])
check("'-', 'N/A', 'NONE' name nothing", tb({"SURFACE TREATMENT": "-", "HEAT TREATMENT": "N/A", "X": "NONE"}) == [])
check("'Black anodise' is a process", tb({"SURFACE TREATMENT": "Black anodise"}) == ["Black anodise"])
check("a hardness in the heat-treatment cell is heat treatment",
      tb({"HEAT TREATMENT": "HRC 40-45"}) == ["HEAT TREATMENT: HRC 40-45"])
check("a surface cell that is only a roughness is not a process", tb({"SURFACE TREATMENT": "Ra 1.6"}) == [])
check("part 33's 'Flash Chrom' is a process", tb({"SURFACE TREATMENT": "Flash Chrom"}) == ["Flash Chrom"])
check("an abbreviation no vocabulary knows still counts in a treatment cell",
      tb({"SURFACE TREATMENT": "EN 25um"}) == ["SURFACE TREATMENT: EN 25um"])
check("'As machined', 'N7', 'Polished' are not treatments",
      tb({"SURFACE TREATMENT": "As machined"}) == [] and tb({"SURFACE TREATMENT": "N7"}) == []
      and tb({"SURFACE TREATMENT": "Polished"}) == [])
check("'Electropolish' is", tb({"SURFACE TREATMENT": "Electropolish"}) == ["Electropolish"])
check("extra_info key names (surface_treatment) work too", tb({"surface_treatment": "Black oxide"}) == ["Black oxide"])
check("'hard chrome' in a note -> special", notes_ocr.classify_note("4. Hard chrome 20 micron min.") == "special")
check("'chrome vanadium' material -> not special", notes_ocr.classify_note("MATERIAL: CHROME VANADIUM STEEL") is None)

print("\n4. part 32 end to end")
src = open(r"C:\Aizera\RPA\RFQ\handlers.py", encoding="utf-8").read()
tree = ast.parse(src)
code = "\n\n".join(ast.get_source_segment(src, n) for n in tree.body
                   if isinstance(n, ast.FunctionDef) and n.name in ("_special_process_sources", "_write_special_processes"))


class Cursor:
    def __init__(self):
        self.inserted, self.cleared = [], False

    def execute(self, sql, *args):
        if "SET IsActive = 0" in sql:
            self.cleared = True
        if sql.lstrip().startswith("INSERT INTO dbo.CostingPartSpecialProcessResults"):
            self.inserted.append(args[1])
        return self

    def commit(self):
        pass


ns = {"re": re, "notes_ocr": notes_ocr, "INSERT_USER_ID": 1,
      "GREEN": "", "YELLOW": "", "RED": "", "BLUE": "", "RESET": ""}
exec(code, ns)
ocr_notes, fields = ns["_special_process_sources"](P32)
check("3600 response gives the three notes", len(ocr_notes) == 3, ocr_notes)
pdf32 = open(r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\32\structure.pdf", "rb").read()
check("and the PDF text layer really has no notes", notes_ocr.extract_notes(pdf32) == [])
cur = Cursor()
ns["_write_special_processes"](cur, 32, pdf32, mbd_notes=None, ocr_notes=ocr_notes, treatment_fields=fields)
check("part 32 now stores the powder coat and the weld", cur.inserted == [
    "Spray paint oven baked powder coat Neptune blue ICI Dulux code 2031.",
    "Weld 3mm plate for Mounting electrical base plate."], cur.inserted)
check("previous machine rows cleared first", cur.cleared)
cur = Cursor()
ns["_write_special_processes"](cur, 99, None, ocr_notes=[], treatment_fields={"SURFACE TREATMENT": "Zinc plated"})
check("title-block cell alone still gives a process (no PDF, no notes)", cur.inserted == ["Zinc plated"], cur.inserted)

print("\n4b. part 33 - process in the title block, not the notes")
P33 = {
    "extra_info": {"notes": ["1. All Dimensions & Tolerances are in mm.", "2. UNLESS OTHERWISE SPECIFIED",
                             "*Note: all Dowel holes need to tolerances control to ±0.02"],
                   "title_block": {"material": "SS 400", "heat_treatment": "", "surface_treatment": "Flash Chrom"}},
    "title_block": {"part1": {"MATERIAL": "SS 400", "SURFACE TREATMENT": "Flash Chrom", "HEAT TREATMENT": None},
                    "part2": {"OTHER": "Note: all Dowel holes need to tolerances control to ±0.02"}},
}
ocr33, fields33 = ns["_special_process_sources"](P33)
check("treatment cell read from part1", fields33 == {"SURFACE TREATMENT": "Flash Chrom"}, fields33)
pdf33 = open(r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\33\base plate.pdf", "rb").read()
cur = Cursor()
ns["_write_special_processes"](cur, 33, pdf33, ocr_notes=ocr33, treatment_fields=fields33)
check("part 33 stores Flash Chrom", cur.inserted == ["Flash Chrom"], cur.inserted)
only_extra = {"extra_info": {"title_block": {"surface_treatment": "Zinc plated"}}, "title_block": {"part1": {}}}
check("extra_info.title_block is used when part1 has no cell",
      ns["_special_process_sources"](only_extra)[1] == {"SURFACE TREATMENT": "Zinc plated"})

print("\n4c. material vs treatment (Walta title blocks)")
st = notes_ocr.split_treatment_from_material
check("'HRC55 Flash Chrom' is no material, all treatment",
      st("HRC55 Flash Chrom") == (None, {"HEAT TREATMENT": "HRC55", "SURFACE TREATMENT": "Flash Chrom"}), st("HRC55 Flash Chrom"))
check("'Flash Chrom' alone is no material", st("Flash Chrom") == (None, {"SURFACE TREATMENT": "Flash Chrom"}))
check("'XW 42 HRC55' keeps the grade", st("XW 42 HRC55") == ("XW 42", {"HEAT TREATMENT": "HRC55"}))
check("'SS 400', 'AL 6061-T6', 'Assab 760' untouched",
      [st(x)[0] for x in ("SS 400", "AL 6061-T6", "Assab 760", "SEE BOM")] == ["SS 400", "AL 6061-T6", "Assab 760", "SEE BOM"])
cm = notes_ocr.choose_material
check("part 34: part1 + extra 'XW 42' beat table 'HRC55 Flash Chrom'",
      cm(["XW 42", "XW 42", "HRC55 Flash Chrom"]) == ("XW 42", {"HEAT TREATMENT": "HRC55", "SURFACE TREATMENT": "Flash Chrom"}))
check("part 31: part1 empty, extra + table agree", cm([None, "Assab 760", "Assab 760"])[0] == "Assab 760")
check("old part 31 reading ('Flash Chrom' everywhere) gives no material", cm(["Flash Chrom", "Flash Chrom", "Flash Chrom"])[0] is None)
check("a tie goes to the more trusted source", cm(["SS 400", "SS400X"])[0] == "SS 400")
check("spacing differences still agree", cm(["SS400", "SS 400", "AL 6061"])[0] == "SS400")
gn = notes_ocr.grade_numbers
check("grade numbers", [gn("SS 400"), gn("SS 304"), gn("AL 6061-T6"), gn("Ti 6Al-4V"), gn("PEEK"), gn("HRC55")] ==
      [{"400"}, {"304"}, {"6061"}, set(), set(), set()])

# The recogniser's real outputs for parts 31-34 after the prompt change, if saved.
import json, os
for pid, want_mat, want_tr in ((31, "Assab 760", {"SURFACE TREATMENT": "Flash Chrom"}),
                               (34, "XW 42", {"HEAT TREATMENT": "HRC55", "SURFACE TREATMENT": "Flash Chrom"})):
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results", f"p{pid}_3600.json")
    if not os.path.exists(path):
        continue
    d = json.load(open(path, encoding="utf-8"))
    p1 = d["title_block"].get("part1") or {}
    ex = (d.get("extra_info") or {}).get("title_block") or {}
    mat, leaked = cm([p1.get("MATERIAL"), ex.get("material"), d["table_content"].get("MATERIAL")])
    _, fields = ns["_special_process_sources"](d)
    for k, v in leaked.items():
        fields.setdefault(k, v)
    check(f"part {pid} live recogniser output -> material {want_mat!r}", mat == want_mat, mat)
    got = notes_ocr.processes_from_title_block(fields)
    check(f"part {pid} treatments recorded", all(any(w in g for g in got) for w in want_tr.values()), got)

print("\n4d. material master grade guard")
rm_src = next(ast.get_source_segment(src, n) for n in tree.body
              if isinstance(n, ast.FunctionDef) and n.name == "resolve_material_id")


class Row:
    def __init__(self, i, name):
        self.ID, self.Name = i, name


MASTER = [Row(1, "AL 6061-T6"), Row(5, "SS 304"), Row(6, "SS 316L"), Row(11, "PEEK")]


class MatCursor:
    def execute(self, *a):
        return self

    def fetchall(self):
        return list(MASTER)


class FakeTensor(list):
    def argmax(self):
        return max(range(len(self)), key=lambda i: self[i])


def fake_cos_sim(_a, names):
    # Text similarity that loves "SS 304" for anything starting "SS" - what the embedding did.
    return [FakeTensor([0.9 if n.startswith("SS 3") else 0.2 for n in names])]


rns = {"notes_ocr": notes_ocr, "MATERIAL_MATCH_MIN_SCORE": 0.45, "GREEN": "", "YELLOW": "", "BLUE": "", "RED": "", "RESET": "",
       "util": type("U", (), {"cos_sim": staticmethod(fake_cos_sim)}),
       "model": type("M", (), {"encode": staticmethod(lambda x, convert_to_tensor=False: x)})}
exec(rm_src, rns)
check("'SS 400' is not matched to SS 304 or SS 316L", rns["resolve_material_id"](MatCursor(), None, "SS 400") is None)
check("'SS 304' still matches SS 304", rns["resolve_material_id"](MatCursor(), None, "SS 304") == 5)
check("text without a grade number is not filtered", rns["resolve_material_id"](MatCursor(), None, "Stainless steel") == 5)

print("\n5. part 12 regression (text layer)")
pdf12 = open(r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\12\0043-07547_03_Green_Standard.pdf", "rb").read()
cur = Cursor()
ns["_write_special_processes"](cur, 12, pdf12, ocr_notes=["1. Spray paint all over"], treatment_fields={})
names = " || ".join(cur.inserted)
check("text layer wins over OCR when it has notes", "Spray paint" not in names)
check("silver plate still found", "SILVER PLATE" in names, cur.inserted)
check("clean still found", any(n.startswith("CLEAN") for n in cur.inserted), cur.inserted)
check("no fit / EHS / dimension note", not re.search(r"CLASS LN2|SHALL COMPLY|SHARP CORNERS", names))

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
