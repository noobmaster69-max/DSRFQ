"""Watch a part's costing run to a terminal state and report what it produced."""
import io
import json
import re
import sys
import time

import pyodbc

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 6
LIMIT = float(sys.argv[2]) if len(sys.argv) > 2 else 1200.0
APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"

raw = json.load(io.open(APPSETTINGS, encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")), timeout=90)
cur = conn.cursor()
STATUS = {1: "Pending", 2: "In Progress", 3: "Completed", 4: "Failed", 5: "Partial", 6: "Retry"}

t0, seen = time.time(), None
while time.time() - t0 < LIMIT:
    st = cur.execute("SELECT CostingStatusID FROM dbo.CostingParts WHERE ID = ?", PART).fetchone()[0]
    conn.commit()
    steps = cur.execute(
        "SELECT Stage, Status, DurationMs FROM dbo.CostingPartStageTimings "
        "WHERE CostingPartID = ? AND IsActive = 1 AND StartTime > DATEADD(minute, -40, GETDATE()) "
        "ORDER BY StartTime", PART).fetchall()
    conn.commit()
    snap = (st, tuple((s[0], s[1]) for s in steps))
    if snap != seen:
        seen = snap
        print("[%4ds] costing=%-11s | %s" % (
            time.time() - t0, STATUS.get(st, st),
            ", ".join("%s:%s%s" % (s[0], s[1], "" if s[2] is None else "/%.1fs" % (s[2] / 1000.0))
                      for s in steps) or "no step yet"))
    if st in (3, 4, 5):
        break
    time.sleep(5)

p = cur.execute("""SELECT CostingStatusID, PartPicture, Length, Width, Height, GrossWeight,
                          Material, Uom FROM dbo.CostingParts WHERE ID = ?""", PART).fetchone()
print("\nfinal costing: %s" % STATUS.get(p[0], p[0]))
print("  PartPicture : %s" % (p[1] or "(none)"))
print("  L x W x H   : %s x %s x %s" % (p[2], p[3], p[4]))
print("  GrossWeight : %s" % p[5])
print("  Material/UOM: %s / %s" % (p[6], p[7]))

res = cur.execute("""SELECT Name, Description, Quantity, DimensionUnit, UnitPrice, Total
                     FROM dbo.CostingPartCostingResults
                     WHERE CostingPartID = ? AND IsActive = 1 ORDER BY ID""", PART).fetchall()
print("\ncosting result lines: %d" % len(res))
for r in res:
    print("  %-24s %-22s qty=%-10s %-6s unit=%-10s total=%s" % (
        (r[0] or "")[:24], (r[1] or "")[:22], r[2], r[3], r[4], r[5]))
conn.close()
sys.exit(0 if p[0] == 3 else 1)
