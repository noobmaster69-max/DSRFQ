"""Converted-image rows for a part -- ground truth while stdout is buffered."""
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
cur.execute(
    "SELECT i.Original, COUNT(*) AS Pages, MAX(i.InsertDate) AS Newest "
    "FROM dbo.CostingPartDocumentImages i "
    "JOIN dbo.CostingPartDocuments d ON d.ID = i.CostingPartDocumentID "
    "WHERE d.CostingPartID = ? AND i.IsActive = 1 "
    "GROUP BY i.Original", PART)
print("Original=1 means the source scan; Original=0 means a converted page.")
rows = cur.fetchall()
if not rows:
    print("  (no image rows)")
for original, pages, newest in rows:
    print("  Original=%s  pages=%s  newest=%s" % (original, pages, newest))

cur.execute(
    "SELECT TOP 5 i.FileDirectory, i.Page, i.InsertDate "
    "FROM dbo.CostingPartDocumentImages i "
    "JOIN dbo.CostingPartDocuments d ON d.ID = i.CostingPartDocumentID "
    "WHERE d.CostingPartID = ? AND i.Original = 0 AND i.IsActive = 1 "
    "ORDER BY i.InsertDate DESC", PART)
print("\nmost recent converted pages:")
found = False
for directory, page, inserted in cur.fetchall():
    found = True
    print("  p%-3s %s  %s" % (page, inserted, directory))
if not found:
    print("  (none yet)")

cur.execute("SELECT ConvertedFileDirectory FROM dbo.CostingPartDocuments "
            "WHERE CostingPartID = ? AND FileName LIKE '%.pdf'", PART)
row = cur.fetchone()
print("\nPDF ConvertedFileDirectory:", row[0] if row else "(no pdf document row)")
conn.close()
