"""Why does Bubble-V6 return no notes, and does vector_json fix it?

V5 produced 71 note balloons across the stored parts. V6, given only the page
image, returned a single "note" that was a row of dashes. Its own docs say
vector_json markedly improves notes and table-metadata extraction in `overall`
mode - and the middleware does not send it.

vectors.json in Bubble-V6 is a list of pages of PyMuPDF get_text("words")
output, so it can be produced straight from the source PDF. This posts the same
page twice - image only, then image + vector_json - and compares.

    python .mssql-scripts/check_5999_notes_vectors.py [part_id]
"""

import json
import os
import sys
import time

import fitz                                                # PyMuPDF
import requests

UPLOAD = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload"
URL = "http://localhost:5999/process_document/overall"
PART = sys.argv[1] if len(sys.argv) > 1 else "12"

base = os.path.join(UPLOAD, "Drawing", PART, "ConvertedDrawing")
pdf = next((os.path.join(base, f) for f in sorted(os.listdir(base))
            if f.lower().endswith(".pdf")), None)
img = next((os.path.join(base, "Image", f)
            for f in sorted(os.listdir(os.path.join(base, "Image")))
            if f.lower().endswith((".jpg", ".png"))), None)
if not pdf or not img:
    sys.exit(f"need both a converted PDF and a page image under {base}")

print(f"pdf  : {os.path.basename(pdf)}")
print(f"page : {os.path.basename(img)}\n")


def build_vectors(pdf_path: str, page_index: int = 0) -> list:
    """The shape Bubble-V6's own vectors.json uses."""
    doc = fitz.open(pdf_path)
    page = doc[page_index]
    words = []
    for x0, y0, x1, y1, text, block_no, line_no, word_no in page.get_text("words"):
        t = text.strip()
        if not t:
            continue
        words.append({
            "text": t,
            "bbox": [x0, y0, x1, y1],
            "block_no": block_no,
            "line_no": line_no,
            "word_no": word_no,
        })
    out = [{
        "page": page_index + 1,
        "width": page.rect.width,
        "height": page.rect.height,
        "words": words,
    }]
    doc.close()
    return out


def post(with_vectors: bool):
    files = {"file": (os.path.basename(img), open(img, "rb"), "image/jpeg")}
    tmp = None
    if with_vectors:
        vec = build_vectors(pdf)
        tmp = os.path.join(os.environ["TEMP"], "vectors_probe.json")
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(vec, fh, ensure_ascii=False)
        files["vector_json"] = ("vectors.json", open(tmp, "rb"), "application/json")
        print(f"  vector_json: {len(vec[0]['words'])} words, "
              f"{vec[0]['width']:.0f}x{vec[0]['height']:.0f}pt")
    t0 = time.time()
    r = requests.post(URL, files=files, timeout=1200)
    for f in files.values():
        try:
            f[1].close()
        except Exception:
            pass
    if tmp and os.path.exists(tmp):
        os.unlink(tmp)
    r.raise_for_status()
    return r.json(), time.time() - t0


def summarise(label, payload, secs):
    views = payload.get("views") or []
    texts = sum(len((v.get("ocr_results") or {}).get("rec_text") or []) for v in views)
    notes = payload.get("notes") or []
    print(f"\n{label}  ({secs:.0f}s)")
    print(f"  grid        : {payload.get('start')} -> {payload.get('end')}")
    print(f"  views       : {len(views)}")
    print(f"  ocr strings : {texts}")
    print(f"  tolerance   : {len(payload.get('tolerance') or [])}")
    print(f"  notes       : {len(notes)}")
    print(f"  table_info  : {len(payload.get('table_info') or {})} field(s)")
    for n in notes[:4]:
        print(f"      {str(n.get('content'))[:88]}")
    return len(notes), texts


print("A. image only  (what the middleware sends today)")
a, sa = post(False)
notes_a, texts_a = summarise("   result", a, sa)

print("\nB. image + vector_json")
b, sb = post(True)
notes_b, texts_b = summarise("   result", b, sb)

print("\n" + "=" * 60)
print(f"notes  {notes_a} -> {notes_b}")
print(f"ocr    {texts_a} -> {texts_b}")
print(f"grid   {a.get('start')} -> {b.get('start')}")
print(f"table  {len(a.get('table_info') or {})} -> {len(b.get('table_info') or {})} field(s)")
if notes_b > notes_a:
    print("\nvector_json is what the notes need. The middleware should build it\n"
          "from the converted PDF and send it with the image.")
elif notes_a == notes_b == 0:
    print("\nvector_json made no difference - notes are failing for another\n"
          "reason on this drawing.")
