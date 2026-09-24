"""Inspect saved balloons for a part.

Coordinates are stored as percent-of-page (0-100), not pixels, so the overlay
survives the viewer scaling the image. Anything outside that range would place
a balloon off the drawing.
"""
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
cur.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_NAME = 'CostingPartBalloons' ORDER BY ORDINAL_POSITION")
cols = [r[0] for r in cur.fetchall()]
print("columns:", ", ".join(cols), "\n")

cur.execute("SELECT PageNumber, COUNT(*) FROM dbo.CostingPartBalloons "
            "WHERE CostingPartID = ? AND IsActive = 1 GROUP BY PageNumber ORDER BY PageNumber", PART)
print("balloons per page:")
total = 0
for page, n in cur.fetchall():
    total += n
    print("  page %-3s %d" % (page, n))
print("  total   %d\n" % total)

cur.execute("SELECT MIN(CenterX), MAX(CenterX), MIN(CenterY), MAX(CenterY) "
            "FROM dbo.CostingPartBalloons WHERE CostingPartID = ? AND IsActive = 1", PART)
xmin, xmax, ymin, ymax = cur.fetchone()
print("coordinate range (percent of page):")
print("  CenterX: %s .. %s" % (xmin, xmax))
print("  CenterY: %s .. %s" % (ymin, ymax))
ok = all(v is not None and 0 <= float(v) <= 100 for v in (xmin, xmax, ymin, ymax))
print("  within 0-100:", "yes" if ok else "NO — balloons would render off-page")

cur.execute("SELECT TOP 10 BalloonNo, PageNumber, CenterX, CenterY, Symbol, "
            "UpperTol, LowerTol, IsNote FROM dbo.CostingPartBalloons "
            "WHERE CostingPartID = ? AND IsActive = 1 ORDER BY PageNumber, BalloonNo", PART)
print("\n%-8s %-6s %-9s %-9s %-14s %-8s %-8s %s" % (
    "no", "page", "x%", "y%", "symbol", "upper", "lower", "note"))
for no, page, cx, cy, sym, up, lo, note in cur.fetchall():
    print("%-8s %-6s %-9s %-9s %-14s %-8s %-8s %s" % (
        no, page, round(float(cx), 2) if cx is not None else "-",
        round(float(cy), 2) if cy is not None else "-",
        (sym or "")[:14], up if up is not None else "-",
        lo if lo is not None else "-", note))
conn.close()
