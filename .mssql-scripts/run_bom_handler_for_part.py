"""Drive the real queue handler for one part, outside the queue.

    python .mssql-scripts/run_bom_handler_for_part.py 28

Calls handlers.bom_ocr_requested() exactly as the bom lane would, so this
exercises the document lookup, bom_ocr.extract(), _write_bom() and the progress
message - not just the reader. Prints the BOM rows before and after.
"""

import os
import sys

RFQ = r"C:\Aizera\RPA\RFQ"
sys.path.insert(0, RFQ)
os.chdir(RFQ)

import pyodbc                                           # noqa: E402
import yaml                                             # noqa: E402

part_id = int(sys.argv[1]) if len(sys.argv) > 1 else 28

with open(os.path.join(RFQ, "config.yaml"), "r", encoding="utf-8-sig") as fh:
    cfg = yaml.safe_load(fh)["Database"]
conn = pyodbc.connect(
    f"DRIVER={{{cfg['Driver']}}};SERVER={cfg['Server']};DATABASE={cfg['Database']};"
    f"UID={cfg['Uid']};PWD={cfg['Pwd']};TrustServerCertificate=yes")
cur = conn.cursor()

SHOW = ("SELECT ID, PartNumber, Description, Quantity, "
        "InternalEngineeringNumber, IsManual FROM dbo.CostingPartBomResults "
        "WHERE CostingPartID = ? AND IsActive = 1 ORDER BY ID")


def show(when):
    rows = cur.execute(SHOW, part_id).fetchall()
    print(f"\n  BOM {when}: {len(rows)} active row(s)")
    for r in rows:
        print(f"    #{r[0]}  {str(r[1] or ''):<14} qty {str(r[3] or ''):<4} "
              f"{str(r[2] or '')[:56]:<56} {r[4] or ''}"
              + ("  (manual)" if r[5] else ""))


show("before")

import handlers                                         # noqa: E402

print(f"\n  running handlers.bom_ocr_requested({part_id}) ...\n")
handlers.bom_ocr_requested(part_id, cur, "")

show("after")
conn.close()
