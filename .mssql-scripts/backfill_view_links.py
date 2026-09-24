"""Find section / detail view links for parts already ballooned.

The consumer finds them on every ballooning run; this does the same for parts
ballooned before it did, without re-ballooning them (which would replace their
automatic balloons). Writes only dbo.CostingPartViewLinks, replacing that
part's rows. Balloons are not touched.

    python backfill_view_links.py 42          # one part
    python backfill_view_links.py all         # every part with a PDF drawing
"""
import io
import json
import os
import re
import sys

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import fitz  # noqa: E402
import pyodbc  # noqa: E402

from view_links import find_view_links  # noqa: E402

fitz.TOOLS.mupdf_display_errors(False)
UPLOAD = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload"

if len(sys.argv) < 2:
    sys.exit(__doc__)

raw = json.load(io.open(r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json", encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect("DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;TrustServerCertificate=yes" % (
    g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"), g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")))
cur = conn.cursor()

where = "" if sys.argv[1] == "all" else "AND d.CostingPartID IN (%s)" % ",".join(str(int(a)) for a in sys.argv[1:])
docs = cur.execute(f"""
    SELECT d.CostingPartID, d.FileDirectory FROM dbo.CostingPartDocuments d
    WHERE d.IsActive = 1 AND d.FileDirectory LIKE '%.pdf' {where}
    ORDER BY d.CostingPartID, d.ID""").fetchall()

done = set()
for part, path in docs:
    if part in done:          # the first PDF is the drawing, as for the consumer
        continue
    done.add(part)
    full = os.path.join(UPLOAD, path.replace("/", os.sep))
    if not os.path.exists(full):
        print(f"  part {part}: {path} missing")
        continue
    links = find_view_links(fitz.open(full))
    cur.execute("DELETE FROM dbo.CostingPartViewLinks WHERE CostingPartID = ?", part)
    for l in links:
        r = lambda k: l.get(k) or {}
        cur.execute("""
            INSERT INTO dbo.CostingPartViewLinks
                (CostingPartID, Kind, Letter, Title, PageNumber,
                 LabelX1, LabelY1, LabelX2, LabelY2, ViewX1, ViewY1, ViewX2, ViewY2,
                 MarkPageNumber, MarksJson, LineX1, LineY1, LineX2, LineY2, InsertDate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)""",
            part, l["kind"], l["letter"], l["title"], l["page"],
            r("label").get("x1"), r("label").get("y1"), r("label").get("x2"), r("label").get("y2"),
            r("view").get("x1"), r("view").get("y1"), r("view").get("x2"), r("view").get("y2"),
            l["markPage"], json.dumps(l["marks"]),
            r("line").get("x1"), r("line").get("y1"), r("line").get("x2"), r("line").get("y2"))
    conn.commit()
    linked = sum(1 for l in links if l["marks"] or l["line"])
    print(f"  part {part}: {len(links)} view(s), {linked} linked to their cut"
          + (": " + ", ".join(l["title"] for l in links) if links else ""))
