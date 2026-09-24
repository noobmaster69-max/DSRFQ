"""Verify the MBD attribute extraction against the real drawing."""
import os
import sys

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
os.chdir(r"C:\Aizera\RPA\RFQ")

import function  # noqa: E402

PDF = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\5\0023-62709_01_Green_Standard.pdf"

EXPECTED = {
    "material": "ALUMINUM 6061-T651, ASTM B209",
    "units": "MILLIMETERS",
    "uom": "MM",
    "part_number": "0023-62709",
    "description": "BRIDGE, GRIPPING, HBBX",
    "revision": "01",
    "weight": "0.19",
}

failures = []


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + ((" -- " + detail) if detail else ""))
    if not ok:
        failures.append(label)


with open(PDF, "rb") as f:
    data = f.read()

import time
t0 = time.perf_counter()
attrs = function.extract_mbd_attributes(data)
elapsed = time.perf_counter() - t0

print("\nextracted in %.2fs\n" % elapsed)
for key, want in EXPECTED.items():
    got = attrs.get(key)
    check("%-12s = %r" % (key, want), got == want, "got %r" % got)

check("extraction is fast enough for the pipeline", elapsed < 10, "%.2fs" % elapsed)

# An ordinary (non-MBD) PDF must return {} rather than raising.
print("\n=== a non-MBD document ===")
import fitz
doc = fitz.open()
page = doc.new_page()
page.insert_text((72, 72), "ordinary drawing")
plain = doc.tobytes()
doc.close()
check("plain PDF yields {}", function.extract_mbd_attributes(plain) == {})
check("garbage input does not raise",
      function.extract_mbd_attributes(b"not a pdf") == {})

print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
