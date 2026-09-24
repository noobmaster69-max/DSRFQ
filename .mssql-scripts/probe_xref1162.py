"""Which accessor exposes the AnarkCoreScript metadata at xref 1162?"""
import zlib

import fitz

PDF = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\5\0023-62709_01_Green_Standard.pdf"
doc = fitz.open(PDF)
XREF = 1162

for name in ("xref_object", "xref_stream", "xref_stream_raw"):
    try:
        fn = getattr(doc, name)
        data = fn(XREF, compressed=False) if name == "xref_object" else fn(XREF)
    except Exception as exc:
        print("%-18s raised %r" % (name, exc))
        continue
    if data is None:
        print("%-18s None" % name)
        continue
    if isinstance(data, str):
        data = data.encode("latin-1", "ignore")
    print("%-18s %d bytes, head %r" % (name, len(data), data[:40]))
    if b"CAD_MATERIAL" in data:
        idx = data.find(b"CAD_MATERIAL")
        print("   CONTAINS CAD_MATERIAL: %r" % data[max(0, idx-80):idx+120])
    elif data[:2] in (b"x\x9c", b"x\xda", b"x\x01"):
        try:
            d = zlib.decompress(data)
            print("   decompressed to %d bytes" % len(d))
            if b"CAD_MATERIAL" in d:
                idx = d.find(b"CAD_MATERIAL")
                print("   CONTAINS CAD_MATERIAL: %r" % d[max(0, idx-80):idx+120])
        except Exception as exc:
            print("   decompress failed: %r" % exc)

doc.close()
