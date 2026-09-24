"""Times the vision half of BOM extraction, and shows what it returns.

The text-layer locate step is ~30 ms. This measures what the Ollama call on the
cropped table actually costs, which is the number that decides whether this can
sit inside the drawing stage or has to be its own queue lane.
"""

import importlib.util
import io
import os
import re
import sys
import time

import pymupdf
from PIL import Image

TT = r"C:\Aizera\RPA\table-transformer"
PDF = sys.argv[1] if len(sys.argv) > 1 else (
    r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\12"
    r"\0043-07547_03_Green_Standard.pdf")

sys.path.insert(0, TT)
spec = importlib.util.spec_from_file_location("extract_bom",
                                              os.path.join(TT, "extract_bom.py"))
eb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(eb)

drop_re = re.compile(eb.DROP_WORDS_MATCHING, re.I)

doc = pymupdf.open(PDF)
page = doc[0]

t = time.time()
words = eb.get_words(page, drop_re)
lines, med_h = eb.group_lines(words)
idx = eb.find_header_line(lines)
locate_ms = (time.time() - t) * 1000
if idx is None:
    sys.exit("no header row found")

t = time.time()
bbox, nrows = eb.table_bbox(words, lines[idx], med_h)
span = eb.header_span(lines[idx])
labels = eb.header_labels(lines[idx], span)
bbox_ms = (time.time() - t) * 1000
print(f"locate header : {locate_ms:6.0f} ms")
print(f"grow bbox     : {bbox_ms:6.0f} ms   lines kept={nrows}  "
      f"bbox={tuple(round(v) for v in bbox)}")
print(f"header labels : {labels}")

t = time.time()
clip = pymupdf.Rect(*bbox)
pix = page.get_pixmap(dpi=eb.DPI, clip=clip)
img = Image.open(io.BytesIO(pix.tobytes("png")))
if max(img.size) > eb.MAX_EDGE:
    r = eb.MAX_EDGE / max(img.size)
    img = img.resize((int(img.width * r), int(img.height * r)), Image.LANCZOS)
render_ms = (time.time() - t) * 1000
print(f"render crop   : {render_ms:6.0f} ms   size={img.size}")

out = r"C:\Users\LAPTOP-001\AppData\Local\Temp\bom-crop.png"
img.save(out)
print(f"crop saved    : {out}")

t = time.time()
result, err = eb.ask_ollama(img, known_columns=labels)
vision_s = time.time() - t
print(f"\nOLLAMA CALL   : {vision_s:6.1f} s   model={eb.OLLAMA_MODEL}")
if err or not result:
    sys.exit(f"vision call failed: {err}")
columns = result.get("columns") or []
rows = result.get("rows") or []
print(f"columns       : {columns}")
print(f"rows          : {len(rows)}")

mapped = eb.map_columns(columns, rows)
print("\nmapped rows:")
for r in mapped[:12]:
    print(f"  item={r['item']:<4} qty={r['quantity']:<5}"
          f"{r['part_no'][:20]:<22}{r['description'][:44]}")

print(f"\n=== TOTAL added to a drawing run ===")
print(f"  locate + bbox + render : {(locate_ms + bbox_ms + render_ms)/1000:.2f} s")
print(f"  vision                 : {vision_s:.1f} s")
doc.close()
