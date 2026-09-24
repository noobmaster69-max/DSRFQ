"""Move generated datum balloons back onto their own symbol.

Until _map_engine_boxes was given a `points` argument, a datum's CenterX/CenterY
came back from the engine unmapped - still in the pixels of the sharper render
the engine was sent, which is up to 1.634x the stored page image. The balloon
was therefore written that far right and down of the symbol it belongs to, and
on part 41 two of the three landed at the very bottom edge of the sheet.

Re-running ballooning fixes it properly, but needs the Ballooning Model (5999)
up and replaces every automatic balloon on the page. This repairs the saved rows
instead: any datum balloon whose centre is not inside its own box is put back on
the centre of that box, which is where the insert always meant to put it.

A balloon the operator dragged somewhere deliberately is left alone - its centre
is near its box, so it does not match.

    python fix_datum_balloon_centres.py [part id ...]      # show what it would do
    python fix_datum_balloon_centres.py [part id ...] --apply
"""
import io
import json
import re
import sys

import pyodbc

APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"
args = [a for a in sys.argv[1:] if a != "--apply"]
APPLY = "--apply" in sys.argv
PARTS = [int(a) for a in args]

raw = json.load(io.open(APPSETTINGS, encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")))
cur = conn.cursor()

where = "AND CostingPartID IN (%s)" % ",".join(str(p) for p in PARTS) if PARTS else ""
cur.execute("""
    SELECT ID, CostingPartID, BalloonNo, PageNumber, CenterX, CenterY,
           BBoxX1, BBoxY1, BBoxX2, BBoxY2, Symbol
    FROM dbo.CostingPartBalloons
    WHERE IsActive = 1 AND ISNULL(IsDatum, 0) = 1
      AND CenterX IS NOT NULL AND BBoxX1 IS NOT NULL
      %s
    ORDER BY CostingPartID, PageNumber, ID
""" % where)

moves = []
for row in cur.fetchall():
    bid, part, no, page, cx, cy, x1, y1, x2, y2, sym = row
    cx, cy, x1, y1, x2, y2 = (float(v) for v in (cx, cy, x1, y1, x2, y2))
    lo_x, hi_x = min(x1, x2), max(x1, x2)
    lo_y, hi_y = min(y1, y2), max(y1, y2)
    if lo_x <= cx <= hi_x and lo_y <= cy <= hi_y:
        continue                       # already on its symbol - leave it
    mx, my = (lo_x + hi_x) / 2, (lo_y + hi_y) / 2
    dist = ((cx - mx) ** 2 + (cy - my) ** 2) ** 0.5
    moves.append((bid, part, no, page, cx, cy, mx, my, dist, sym or ""))

if not moves:
    print("No datum balloon is off its symbol." + (" (parts %s)" % PARTS if PARTS else ""))
    sys.exit(0)

print("%-7s %-5s %-5s %-4s %-15s %-15s %-6s %s" % (
    "id", "part", "no", "page", "from", "to", "moved", "symbol"))
for bid, part, no, page, cx, cy, mx, my, dist, sym in moves:
    print("%-7s %-5s %-5s %-4s %-15s %-15s %-6.1f %s" % (
        bid, part, no, page, "%.1f, %.1f" % (cx, cy), "%.1f, %.1f" % (mx, my), dist,
        sym.encode("ascii", "replace").decode()))

if not APPLY:
    print("\n%d balloon(s) would move. Re-run with --apply to write them." % len(moves))
    sys.exit(0)

for bid, part, no, page, cx, cy, mx, my, dist, sym in moves:
    cur.execute(
        "UPDATE dbo.CostingPartBalloons SET CenterX = ?, CenterY = ?, "
        "UpdateDate = GETDATE() WHERE ID = ?", mx, my, bid)
conn.commit()
print("\n%d balloon(s) moved back onto their symbol." % len(moves))
conn.close()
