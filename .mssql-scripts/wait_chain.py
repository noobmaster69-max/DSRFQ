"""Watch a part through the whole chain: drawing + OCR -> costing -> ballooning."""
import io
import json
import re
import sys
import time

import pyodbc

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 9
LIMIT = float(sys.argv[2]) if len(sys.argv) > 2 else 900.0
APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"
raw = json.load(io.open(APPSETTINGS, encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")), timeout=90)
cur = conn.cursor()
S = {1: "Pending", 2: "In Progress", 3: "Completed", 4: "Failed", 5: "Partial", 6: "Retry"}
TERMINAL = {3, 4, 5}

t0, seen = time.time(), None
while time.time() - t0 < LIMIT:
    r = cur.execute("SELECT DrawingConversionStatusID, OcrStatusID, CostingStatusID, "
                    "BalloonStatusID FROM dbo.CostingParts WHERE ID = ?", PART).fetchone()
    conn.commit()
    if tuple(r) != seen:
        seen = tuple(r)
        print("[%4ds] drawing=%-11s ocr=%-11s costing=%-11s ballooning=%s"
              % (time.time() - t0, S.get(r[0]), S.get(r[1]), S.get(r[2]), S.get(r[3])))
    if r[2] in TERMINAL and r[3] in TERMINAL:
        break
    time.sleep(5)

print("\n--- steps ---")
for s in cur.execute("""SELECT Stage, Status, DurationMs, Detail
                        FROM dbo.CostingPartStageTimings
                        WHERE CostingPartID = ? AND IsActive = 1
                          AND StartTime > DATEADD(minute, -25, GETDATE())
                        ORDER BY StartTime""", PART).fetchall():
    print("  %-24s %-10s %8s  %s" % (s[0], s[1], s[2], (s[3] or "")[:56]))
conn.commit()

r = cur.execute("""SELECT PartPicture, BalloonStatusID,
                          (SELECT COUNT(*) FROM dbo.CostingPartBalloons
                           WHERE CostingPartID = ? AND IsActive = 1),
                          (SELECT COUNT(*) FROM dbo.CostingPartCostingResults
                           WHERE CostingPartID = ? AND IsActive = 1)
                   FROM dbo.CostingParts WHERE ID = ?""", PART, PART, PART).fetchone()
print("\nPartPicture : %s" % (r[0] or "(none)"))
print("Ballooning  : %s, %d balloon(s)" % (S.get(r[1]), r[2]))
print("Cost lines  : %d" % r[3])
conn.close()
