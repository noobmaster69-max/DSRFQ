"""Show the recorded steps of a costing part's most recent processing run."""
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
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")))

cur = conn.cursor()
cur.execute("SELECT TOP 1 RunId, StartTime FROM dbo.CostingPartStageTimings "
            "WHERE CostingPartID = ? AND IsActive = 1 ORDER BY StartTime DESC", PART)
row = cur.fetchone()
if not row:
    print("no runs recorded for part %d" % PART)
    raise SystemExit(0)

run_id, started = row
print("part %d — run %s (started %s)\n" % (PART, run_id[:12], started))
print("%-4s %-42s %10s %8s  %s" % ("#", "step", "duration", "status", "detail"))
print("-" * 92)

cur.execute(
    "SELECT Sequence, Label, Stage, DurationMs, Status, Detail "
    "FROM dbo.CostingPartStageTimings "
    "WHERE CostingPartID = ? AND RunId = ? AND IsActive = 1 "
    "ORDER BY Sequence", PART, run_id)

total = 0
for seq, label, stage, ms, status, detail in cur.fetchall():
    total += ms or 0
    dur = "-" if ms is None else ("%d ms" % ms if ms < 1000 else "%.1fs" % (ms / 1000))
    print("%-4s %-42s %10s %8s  %s" % (
        seq, (label or stage)[:42], dur, status, (detail or "")[:30]))

print("-" * 92)
print("%-4s %-42s %10s" % ("", "TOTAL", "%.1fs" % (total / 1000)))
conn.close()
