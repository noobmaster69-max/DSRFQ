"""Reset a costing part to Pending so a test run's result is unambiguous.

Clears the fields the pipeline is supposed to populate, so "it worked" cannot be
confused with leftovers from an earlier attempt.
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
cur.execute("""
    UPDATE dbo.CostingParts
    SET DrawingConversionStatusID = 1,
        OcrStatusID = 1,
        OcrStartTime = NULL,
        OcrEndTime = NULL,
        PartNumber = NULL,
        Revision = NULL,
        Description = NULL,
        Material = NULL,
        CustomerName = NULL
    WHERE ID = ?""", PART)

# Converted pages from previous attempts, so a new count is meaningful.
cur.execute("""
    UPDATE i SET i.IsActive = -1
    FROM dbo.CostingPartDocumentImages i
    JOIN dbo.CostingPartDocuments d ON d.ID = i.CostingPartDocumentID
    WHERE d.CostingPartID = ? AND i.Original = 0 AND i.IsActive = 1""", PART)
converted = cur.rowcount

cur.execute("""
    UPDATE dbo.CostingPartDocuments SET ConvertedFileDirectory = NULL
    WHERE CostingPartID = ? AND FileName LIKE '%.pdf'""", PART)

conn.commit()
print("part %d reset: statuses -> Pending, fields cleared, "
      "%d converted page row(s) retired" % (PART, converted))
conn.close()
