"""extract_mbd_attributes() on both MBD drawings.

Part 6 is the regression being fixed; part 5 is the one that already worked
and must keep working, since the change widened how the script object is
located.
"""
import os
import sys

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
os.chdir(r"C:\Aizera\RPA\RFQ")

from function import extract_mbd_attributes

CASES = [
    (5, r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\5\0023-62709_01_Green_Standard.pdf",
     {"material", "units", "uom"}),
    (6, r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\6\0023-48968_02_Green_Standard.pdf",
     {"material", "units", "uom", "part_number", "revision", "description"}),
]

failures = []
for part, path, required in CASES:
    print("\n=== part %d ===" % part)
    if not os.path.isfile(path):
        print("  file missing: %s" % path)
        failures.append("part %d file missing" % part)
        continue
    with open(path, "rb") as f:
        attrs = extract_mbd_attributes(f.read())
    for k in sorted(attrs):
        print("  %-14s %s" % (k, attrs[k]))
    missing = required - set(k for k in attrs if attrs[k])
    if missing:
        print("  MISSING: %s" % ", ".join(sorted(missing)))
        failures.append("part %d missing %s" % (part, ",".join(sorted(missing))))
    else:
        print("  all required fields present")

print("\n" + ("PASS" if not failures else "FAIL: " + "; ".join(failures)))
sys.exit(1 if failures else 0)
