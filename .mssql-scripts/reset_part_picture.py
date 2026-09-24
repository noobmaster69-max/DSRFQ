"""Clear a part's picture and its browser-made GLB link.

Clearing ConvertedFileDirectory is the point of the test: with no GLB, a
picture can only have come from the uploaded STEP.
"""
import io
import json
import re
import sys

import pyodbc

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 9
APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"
raw = json.load(io.open(APPSETTINGS, encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")), timeout=90)
cur = conn.cursor()
cur.execute("UPDATE dbo.CostingParts SET PartPicture = NULL, CostingStatusID = 1 "
            "WHERE ID = ?", PART)
n = cur.execute("UPDATE dbo.CostingPartDocuments SET ConvertedFileDirectory = NULL "
                "WHERE CostingPartID = ? AND Type = 2", PART).rowcount
cur.execute("UPDATE dbo.CostingPartStageTimings SET IsActive = 0 "
            "WHERE CostingPartID = ? AND Stage = 'part-picture'", PART)
conn.commit()
print("part %d: PartPicture cleared, %d GLB link(s) cleared, costing reset" % (PART, n))
conn.close()
