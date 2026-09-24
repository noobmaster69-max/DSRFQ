"""Remove datum balloons the consumer added with no datum letter.

The geometric pass sometimes finds a "datum" whose letter will not read - a
boxed circle, a hole, a section arrow - and the consumer added a balloon for it
anyway, text "▲" alone. A datum always has a letter; the consumer now refuses
these. This marks the existing ones RemovedByUser, as if the operator had
deleted them in the editor: they leave the list and the check sheet, and can be
restored from the editor's removed list. Only automatic balloons (Manual = 0).

    python fix_letterless_datums.py              # dry run
    python fix_letterless_datums.py --apply
"""
import csv
import datetime
import io
import json
import os
import re
import sys

import pyodbc

APPLY = "--apply" in sys.argv
raw = json.load(io.open(r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json", encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect("DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;TrustServerCertificate=yes" % (
    g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"), g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")))
cur = conn.cursor()
rows = cur.execute("""
    SELECT ID, CostingPartID, PageNumber, BalloonNo, Symbol FROM dbo.CostingPartBalloons
    WHERE IsActive = 1 AND ISNULL(RemovedByUser, 0) = 0 AND IsDatum = 1 AND ISNULL(Manual, 0) = 0
      AND LTRIM(RTRIM(Symbol)) IN (N'▲', N'▲?', N'▲I', N'▲O', N'▲Q')
    ORDER BY CostingPartID, PageNumber, ID""").fetchall()
for r in rows:
    print(f"  part {r.CostingPartID} page {r.PageNumber} balloon {r.BalloonNo} {r.Symbol!r}")
if not rows:
    print("  nothing to remove")
    sys.exit(0)
if not APPLY:
    print(f"\n{len(rows)} balloon(s) would be removed. Add --apply.")
    sys.exit(0)
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups"), exist_ok=True)
undo = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups",
                    f"letterless_datums_{datetime.datetime.now():%Y%m%d_%H%M%S}.csv")
with open(undo, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["ID", "CostingPartID", "PageNumber", "BalloonNo", "Symbol"])
    w.writerows([(r.ID, r.CostingPartID, r.PageNumber, r.BalloonNo, r.Symbol) for r in rows])
for r in rows:
    cur.execute("UPDATE dbo.CostingPartBalloons SET RemovedByUser = 1 WHERE ID = ? AND ISNULL(RemovedByUser, 0) = 0", r.ID)
conn.commit()
print(f"\n{len(rows)} removed. List: {undo}")
