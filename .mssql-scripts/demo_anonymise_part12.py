"""Take the customer's name off part 12 for the demo video, reversibly.

Two fields carry it -- CostingParts.CustomerName and one special process name.
The BOM lines and cost lines do not mention it at all.

The original values are written to a sidecar file so this can be undone; the
drawing images themselves are untouched (the video blurs the title block
instead, since the customer's block is printed into the page image).

    python .mssql-scripts/demo_anonymise_part12.py --apply
    python .mssql-scripts/demo_anonymise_part12.py --revert
"""

import json
import os
import sys

import pyodbc
import yaml

PART = 12
BRAND = "APPLIED MATERIALS"
SIDECAR = r"C:\Aizera\DSRFQ\.mssql-scripts\demo-part12-original.json"

mode = ("--revert" if "--revert" in sys.argv else
        "--apply" if "--apply" in sys.argv else None)
if not mode:
    print(__doc__)
    sys.exit(2)

with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)
d = cfg["Database"]
conn = pyodbc.connect("DRIVER={" + d["Driver"] + "};"
                      f"SERVER={d['Server']};DATABASE={d['Database']};"
                      f"UID={d['Uid']};PWD={d['Pwd']}")
cur = conn.cursor()

if mode == "--apply":
    if os.path.exists(SIDECAR):
        print(f"{SIDECAR} already exists -- part 12 looks already anonymised.")
        print("Revert first if you want to re-capture the originals.")
        sys.exit(1)

    customer = cur.execute(
        "SELECT CustomerName FROM dbo.CostingParts WHERE ID = ?", PART).fetchval()
    sps = cur.execute(
        "SELECT ID, SpecialProcessName FROM dbo.CostingPartSpecialProcessResults "
        "WHERE CostingPartID = ? AND IsActive = 1", PART).fetchall()

    saved = {"CustomerName": customer,
             "SpecialProcesses": [{"ID": r[0], "Name": r[1]} for r in sps]}
    with open(SIDECAR, "w", encoding="utf-8") as fh:
        json.dump(saved, fh, indent=2)
    print(f"saved originals to {SIDECAR}")

    print(f"\nbefore:")
    print(f"  CustomerName: {customer!r}")
    for r in sps:
        print(f"  sp {r[0]}: {r[1]}")

    # The header reads "0043-07547  Rev 03  <customer>", so an empty string
    # simply drops the third item rather than leaving a visible gap.
    cur.execute("UPDATE dbo.CostingParts SET CustomerName = '' WHERE ID = ?", PART)

    # "CLEAN PER APPLIED MATERIALS 0250-20000" -> "CLEAN PER 0250-20000".
    # Collapse the double space the removal leaves behind.
    for r in sps:
        if BRAND in (r[1] or "").upper():
            new = r[1].replace(BRAND + " ", "").replace(BRAND, "")
            new = " ".join(new.split())
            cur.execute(
                "UPDATE dbo.CostingPartSpecialProcessResults "
                "SET SpecialProcessName = ? WHERE ID = ?", new, r[0])
    conn.commit()

    print("\nafter:")
    print(f"  CustomerName: "
          f"{cur.execute('SELECT CustomerName FROM dbo.CostingParts WHERE ID = ?', PART).fetchval()!r}")
    for r in cur.execute(
            "SELECT ID, SpecialProcessName FROM dbo.CostingPartSpecialProcessResults "
            "WHERE CostingPartID = ? AND IsActive = 1", PART).fetchall():
        print(f"  sp {r[0]}: {r[1]}")

else:
    if not os.path.exists(SIDECAR):
        print(f"no {SIDECAR}; nothing to revert from")
        sys.exit(1)
    with open(SIDECAR, encoding="utf-8") as fh:
        saved = json.load(fh)

    cur.execute("UPDATE dbo.CostingParts SET CustomerName = ? WHERE ID = ?",
                saved["CustomerName"], PART)
    for sp in saved["SpecialProcesses"]:
        cur.execute("UPDATE dbo.CostingPartSpecialProcessResults "
                    "SET SpecialProcessName = ? WHERE ID = ?", sp["Name"], sp["ID"])
    conn.commit()
    os.remove(SIDECAR)

    print("reverted:")
    print(f"  CustomerName: "
          f"{cur.execute('SELECT CustomerName FROM dbo.CostingParts WHERE ID = ?', PART).fetchval()!r}")
    for r in cur.execute(
            "SELECT ID, SpecialProcessName FROM dbo.CostingPartSpecialProcessResults "
            "WHERE CostingPartID = ? AND IsActive = 1", PART).fetchall():
        print(f"  sp {r[0]}: {r[1]}")

conn.close()
