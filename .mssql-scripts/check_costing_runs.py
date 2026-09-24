"""All recorded costing runs for a part, to check the resume stitching."""
import io
import json
import re
import sys

import pyodbc

APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"
PART = int(sys.argv[1]) if len(sys.argv) > 1 else 5

with io.open(APPSETTINGS, encoding="utf-8-sig") as f:
    raw = json.load(f)["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
# Longer login timeout: under memory pressure SQL Server gets paged out and a
# default-timeout connect fails even though the server is fine.
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")),
    timeout=90)

cur = conn.cursor()
cur.execute("""
    SELECT RunId, Sequence, Stage, Status, DurationMs, StartTime
    FROM dbo.CostingPartStageTimings
    WHERE CostingPartID = ? AND Stage LIKE 'costing-%' AND IsActive = 1
    ORDER BY StartTime DESC
""", PART)

rows = cur.fetchall()
if not rows:
    print("no costing steps recorded")
else:
    current = None
    for run_id, seq, stage, status, ms, started in rows:
        if run_id != current:
            print("\nrun %s" % run_id[:12])
            current = run_id
        print("  seq=%-3s %-20s %-10s %8s  %s" % (
            seq, stage, status, ms, started))

print("\n(each run should contain upload -> data -> calculate -> analysis)")
conn.close()
