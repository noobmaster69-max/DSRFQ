"""Show a part's recorded steps with the Detail column.

Detail is where a skipped step records why, which is the whole reason those
rows are written instead of simply omitted.
"""
import io
import json
import re
import sys

import pyodbc

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 9
STAGE = sys.argv[2] if len(sys.argv) > 2 else None
APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"
raw = json.load(io.open(APPSETTINGS, encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")), timeout=90)
cur = conn.cursor()

sql = ("SELECT Stage, Status, DurationMs, StartTime, Detail "
       "FROM dbo.CostingPartStageTimings WHERE CostingPartID = ? AND IsActive = 1")
args = [PART]
if STAGE:
    sql += " AND Stage = ?"
    args.append(STAGE)
sql += " ORDER BY StartTime"

for r in cur.execute(sql, *args).fetchall():
    print("%-24s %-10s %8s  %s" % (r[0], r[1], r[2], r[3]))
    if r[4]:
        print("    %s" % r[4])
conn.commit()

r = cur.execute("""SELECT PartPicture, (SELECT COUNT(*) FROM dbo.CostingPartDocuments
                   WHERE CostingPartID = ? AND Type = 2 AND IsActive = 1)
                   FROM dbo.CostingParts WHERE ID = ?""", PART, PART).fetchone()
print("\nPartPicture: %s   (3D documents: %s)" % (r[0] or "(none)", r[1]))

for d in cur.execute("""SELECT ID, FileName, FileDirectory, ConvertedFileDirectory
                        FROM dbo.CostingPartDocuments
                        WHERE CostingPartID = ? AND Type = 2 AND IsActive = 1""",
                     PART).fetchall():
    print("  doc %s  %s" % (d[0], d[1]))
    print("    FileDirectory          = %s" % d[2])
    print("    ConvertedFileDirectory = %s" % d[3])
conn.commit()
conn.close()
