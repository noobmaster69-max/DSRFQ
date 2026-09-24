"""PDF text layer for ballooning (RPA/API BalloonVector.py + /ballooning/region).

  1. unit: note text rebuilt in the PDF's word order, and refused when the PDF
     words under the box are not the same words
  2. unit: slice words land in the crop's pixels, only inside the selection
  3. live: region route on part 12's notes block - notes found, in order - and
     the same crop without the PDF for comparison
  4. live: full-page upload with vector_json returns ordered notes

  C:\\Aizera\\RPA\\PythonLibrary\\.venv\\Scripts\\python.exe check_balloon_vector.py
"""
import io
import json
import sys

import fitz
import requests
from PIL import Image

sys.path.insert(0, r"C:\Aizera\RPA\API")
from BalloonVector import (correct_note_texts, numbered_notes, open_pdf, rebuild_note_text,  # noqa: E402
                           slice_vector_json, supplement_notes, words_in_image_pixels)

PDF = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\12\0043-07547_03_Green_Standard.pdf"
IMG = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\12\Image\0043-07547_03_Green_Standard_Page_1.png"
API = "http://127.0.0.1:8000"
KEY = {"X-API-Key": "1231"}
ORDERED_1 = "1. APPLICABLE STANDARDS/SPECIFICATIONS: ASME Y14.5-2009"

fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    if not ok:
        fails += 1


pdf_bytes = open(PDF, "rb").read()
doc = open_pdf(pdf_bytes)
img = Image.open(IMG)
W, H = img.size
page_words = json.dumps([{"page": 1, "width": doc[0].rect.width, "height": doc[0].rect.height,
                          "words": [{"text": w[4], "bbox": list(w[:4]), "block_no": w[5], "line_no": w[6], "word_no": w[7]}
                                    for w in doc[0].get_text("words")]}]).encode()
words = words_in_image_pixels(page_words, W, H)

print("1. note text repair")
scrambled = ("1. ASME APPLICABLE Y14.5-2009, STANDARDS/SPECIFICATIONS: DIMENSIONING AND TOLERANCING. ASME APPLIED "
             "Y14.38-1999, MATERIALS ABBREVIATIONS 0251-05096: INCH/MILLIMETER AND ACRONYMS. CONVERSION PROCEDURE.")
box = (57, 84, 694, 172)
fixed = rebuild_note_text(scrambled, box, words)
check("rebuilt in the PDF's order", bool(fixed) and fixed.startswith(ORDERED_1), (fixed or "")[:70])
check("same words, nothing added or lost", fixed and sorted(fixed.split()) == sorted(scrambled.split()))
check("a note the PDF does not hold is left alone", rebuild_note_text("5. DEBURR ALL SHARP EDGES BEFORE PLATING", box, words) is None)
check("an empty box gives nothing", rebuild_note_text(scrambled, (2000, 1500, 2010, 1510), words) is None)
resp = {"notes": [{"content": scrambled, "location": [[57, 84], [694, 84], [694, 172], [57, 172]]}]}
check("correct_note_texts rewrites in place", correct_note_texts(resp, words) == 1 and resp["notes"][0]["content"].startswith(ORDERED_1))
wrapped = {"data": {"notes": [{"content": scrambled, "location": [57, 84, 694, 172]}]}}
check("wrapped response and flat location", correct_note_texts(wrapped, words) == 1)

print("\n1b. numbered notes from the PDF")
found = numbered_notes(words)
idx = [n[0] for n in found]
check("the sheet's numbered notes are found", all(i in idx for i in range(1, 12)), idx)
check("a title-block address is not a note", all(i < 100 for i in idx))
n8 = next((t for i, t, _ in found if i == 8), "")
check("a continuation line joins its note", "ASTM B700" in n8 and n8.startswith("8. ITEM 9 FINISH"), n8[:70])
engine_like = {"notes": [{"content": "1. " + "X " * 3, "location": [57, 84, 694, 172]}],
               "views": [{"ocr_results": {"rec_text": ["2X EQ", "Ø.250"], "rec_polys": [[[300, 430], [340, 430], [340, 450], [300, 450]],
                                                                                      [[1500, 900], [1540, 900], [1540, 920], [1500, 920]]],
                                          "rec_scores": [1, 1], "type": ["normal", "normal"], "belong": ["", ""]}}]}
added = supplement_notes(engine_like, words, region=(0, 0, 800, 800))
check("missed notes are added, not the one already there", added >= 9 and not any(
    n.get("source") == "pdf_vector" and n["content"].startswith("1.") for n in engine_like["notes"]), added)
check("a text inside an added note is dropped", engine_like["views"][0]["ocr_results"]["rec_text"] == ["Ø.250"],
      engine_like["views"][0]["ocr_results"]["rec_text"])
check("parallel arrays stay aligned", len(engine_like["views"][0]["ocr_results"]["rec_polys"]) == 1)
check("region limits what is added", supplement_notes({"notes": []}, words, region=(1500, 1000, 1600, 1100)) == 0)

print("\n2. slice words")
crop, sel = (40, 60, 700, 140), (50, 70, 660, 110)
sl = json.loads(slice_vector_json(doc, 1, W, H, crop, sel))
sw = sl[0]["words"]
check("coordinates are the crop's pixels", sl[0]["coord_space"] == "slice_pixels" and sl[0]["width"] == 700)
check("every word inside the crop", all(0 <= w["bbox"][0] < w["bbox"][2] <= 700 and 0 <= w["bbox"][1] < w["bbox"][3] <= 140 for w in sw), len(sw))
check("only words centred in the selection",
      all(50 - 40 <= (w["bbox"][0] + w["bbox"][2]) / 2 <= 50 - 40 + 660 and 70 - 60 <= (w["bbox"][1] + w["bbox"][3]) / 2 <= 70 - 60 + 110 for w in sw))
check("a mismatched image shape is refused", slice_vector_json(doc, 1, W, W, crop) is None)
check("a page past the end is refused", slice_vector_json(doc, 99, W, H, crop) is None)


def crop_png(x, y, w, h):
    buf = io.BytesIO()
    img.crop((x, y, x + w, y + h)).save(buf, "PNG")
    return buf.getvalue()


print("\n3. live region route (notes block)")
cx, cy, cw, ch = 30, 20, 720, 700
form = {"mode": "area", "page": 1, "image_w": W, "image_h": H, "crop_x": cx, "crop_y": cy, "crop_w": cw, "crop_h": ch,
        "sel_x": cx + 10, "sel_y": cy + 10, "sel_w": cw - 20, "sel_h": ch - 20}
with_pdf = requests.post(f"{API}/api/v1/process/ballooning/region", headers=KEY, data=form,
                         files={"file": ("crop.png", crop_png(cx, cy, cw, ch), "image/png"),
                                "pdf": ("d.pdf", pdf_bytes, "application/pdf")}, timeout=600)
check("answers 200", with_pdf.status_code == 200, with_pdf.status_code)
body = with_pdf.json() if with_pdf.status_code == 200 else {}
data = body.get("data") if isinstance(body.get("data"), dict) else body
notes = data.get("notes") or []
check("the PDF words were sent", body.get("_vector_words") is True)
check("notes found in the box", len(notes) >= 5, len(notes))
first = next((n.get("content", "") for n in notes if n.get("content", "").startswith("1.")), "")
check("note 1 reads in order", first.startswith(ORDERED_1), first[:70])

without = requests.post(f"{API}/api/v1/process/ballooning/region", headers=KEY, data=form,
                        files={"file": ("crop.png", crop_png(cx, cy, cw, ch), "image/png")}, timeout=600)
wb = without.json() if without.status_code == 200 else {}
wd = wb.get("data") if isinstance(wb.get("data"), dict) else wb
print(f"  info  without the PDF: {len(wd.get('notes') or [])} note(s); with: {len(notes)}")
check("bad mode is refused", requests.post(f"{API}/api/v1/process/ballooning/region", headers=KEY, data={**form, "mode": "x"},
                                           files={"file": ("c.png", b"x", "image/png")}, timeout=60).status_code == 400)

print("\n4. live full-page upload")
up = requests.post(f"{API}/api/v1/process/ballooning/upload", headers=KEY,
                   files={"file": ("p1.png", open(IMG, "rb").read(), "image/png"),
                          "vector_json": ("vectors.json", page_words, "application/json")}, timeout=1800)
items = up.json().get("data") or [] if up.status_code == 200 else []
page_notes = [i for i in items if i.get("IsNote")]
check("the sheet's 15 notes, nothing extra", len(page_notes) == 15, [i["Symbol"][:12] for i in page_notes])
n1 = next((i["Symbol"] for i in page_notes if i["Symbol"].startswith("1.")), "")
check("note 1 in order", n1.startswith(ORDERED_1), n1[:70])
n8 = next((i["Symbol"] for i in page_notes if i["Symbol"].startswith("8")), "")
check("a numbered note is its own lines only (no flag label or 2X EQ)", n8.startswith("8. ITEM 9 FINISH") and "2X" not in n8, n8[:70])
check("no note opens with a stray label", not any(i["Symbol"].split()[0] in ("2X", "EQ", "9") and len(i["Symbol"].split()) > 1
                                                   and i["Symbol"].split()[1][:1].isdigit() for i in page_notes))

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
