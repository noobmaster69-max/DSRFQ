"""Where does part 6's MBD title-block data live?

extract_mbd_attributes() returns nothing for this file even though the same
routine works on part 5, so before changing the extractor, find out whether
the values exist in the PDF at all -- form fields, document JavaScript, or
the PRC/U3D model's product attributes.
"""
import re
import zlib

import fitz

PDF = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\6\0023-48968_02_Green_Standard.pdf"
doc = fitz.open(PDF)

print("=== AcroForm fields ===")
try:
    n = 0
    for page in doc:
        for w in page.widgets() or []:
            n += 1
            print("  p%-2s %-34s = %r" % (page.number + 1, w.field_name, w.field_value))
    if not n:
        print("  none")
except Exception as exc:
    print("  %r" % exc)

print("\n=== objects holding JavaScript ===")
js_xrefs = []
for xref in range(1, doc.xref_length()):
    try:
        obj = doc.xref_object(xref, compressed=False)
    except Exception:
        continue
    if "/JavaScript" in obj or "/JS" in obj:
        js_xrefs.append(xref)
print("  %d object(s): %s" % (len(js_xrefs), js_xrefs[:20]))

print("\n=== JavaScript mentioning the title block ===")
KEYS = ("material", "titleblock", "title_block", "partnumber", "part_number",
        "revision", "units", "uom", "weight", "finish")
shown = 0
for xref in js_xrefs:
    body = None
    for getter in (doc.xref_stream, lambda x: doc.xref_object(x, compressed=False).encode("latin-1", "ignore")):
        try:
            body = getter(xref)
            if body:
                break
        except Exception:
            continue
    if not body:
        continue
    text = body.decode("latin-1", "ignore")
    for line in text.splitlines():
        low = line.lower()
        if any(k in low for k in KEYS):
            print("  xref %-5d %s" % (xref, line.strip()[:110]))
            shown += 1
            if shown > 40:
                break
    if shown > 40:
        break
if not shown:
    print("  nothing matched")

print("\n=== attribute-looking strings anywhere in the file ===")
NEEDLES = [b"MATERIAL", b"AL 6061", b"6061", b"ALUMIN", b"MILLIMETER", b"INCH",
           b"AMS-QQ-A", b"ASTM"]
seen = 0
for xref in range(1, doc.xref_length()):
    raw = None
    try:
        raw = doc.xref_stream(xref)
    except Exception:
        pass
    if not raw:
        continue
    for needle in NEEDLES:
        if needle in raw:
            i = raw.find(needle)
            print("  xref %-5d %-12s %r" % (xref, needle.decode(),
                                            raw[max(0, i - 60):i + 80]))
            seen += 1
            break
    if seen >= 12:
        break
if not seen:
    print("  none of the usual material strings appear in any decompressed stream")

print("\n=== 3D annotation / PRC stream ===")
for page in doc:
    for annot in page.annots() or []:
        if annot.type[1] != "3D":
            continue
        info = doc.xref_object(annot.xref, compressed=False)
        m = re.search(r"/3DD (\d+) 0 R", info)
        print("  p%-2s 3D annot xref %s -> 3DD %s" % (page.number + 1, annot.xref,
                                                      m.group(1) if m else "?"))
        if m:
            x = int(m.group(1))
            try:
                raw = doc.xref_stream(x)
                print("     %d bytes, magic %r" % (len(raw), raw[:8]))
                for needle in (b"MATERIAL", b"6061", b"ALUMIN"):
                    if needle in raw:
                        i = raw.find(needle)
                        print("     contains %r: %r" % (needle.decode(),
                                                        raw[max(0, i - 50):i + 70]))
            except Exception as exc:
                print("     stream unreadable: %r" % exc)
doc.close()
