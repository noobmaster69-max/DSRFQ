"""Clear a part's costing outputs so a run starts from nothing.

reset_part.py resets the whole drawing pipeline; this touches only the
costing side, which is what needs redoing when the conversion and OCR
results are already good.
"""
import io
import json
import re
import sys

import pyodbc

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 6
APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"
raw = json.load(io.open(APPSETTINGS, encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")), timeout=90)
cur = conn.cursor()

n = cur.execute("UPDATE dbo.CostingPartCostingResults SET IsActive = 0 "
                "WHERE CostingPartID = ? AND IsActive = 1", PART).rowcount
m = cur.execute("UPDATE dbo.CostingPartSpecialProcessResults SET IsActive = 0 "
                "WHERE CostingPartID = ? AND IsActive = 1", PART).rowcount
t = cur.execute("UPDATE dbo.CostingPartStageTimings SET IsActive = 0 "
                "WHERE CostingPartID = ? AND IsActive = 1 AND Stage LIKE 'costing-%' "
                "OR CostingPartID = ? AND IsActive = 1 AND Stage = 'part-picture'",
                PART, PART).rowcount
cur.execute("UPDATE dbo.CostingParts SET CostingStatusID = 1, PartPicture = NULL "
            "WHERE ID = ?", PART)
conn.commit()
print("part %d: %d result line(s), %d special process row(s), %d costing timing(s) retired"
      % (PART, n, m, t))
conn.close()
