"""Current state of costing part 5 and its documents, before/after a run."""
import io
import json
import re
import sys

import pyodbc

APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"


def connect():
    with io.open(APPSETTINGS, encoding="utf-8-sig") as f:
        raw = json.load(f)["Data"]["Default"]["ConnectionString"]
    g = lambda p: re.search(p, raw, re.I).group(1)
    return pyodbc.connect(
        "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
        "TrustServerCertificate=yes" % (
            g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
            g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")))


def show(cur, title, sql, params=()):
    print("\n=== %s ===" % title)
    try:
        cur.execute(sql, params)
    except Exception as exc:
        print("  query failed:", exc)
        return
    cols = [d[0] for d in cur.description]
    rows = cur.fetchall()
    if not rows:
        print("  (no rows)")
        return
    for row in rows:
        for c, v in zip(cols, row):
            text = str(v)
            if len(text) > 110:
                text = text[:110] + "..."
            print("  %-28s %s" % (c, text))
        print("  " + "-" * 60)


PART = int(sys.argv[1]) if len(sys.argv) > 1 else 5

with connect() as conn:
    cur = conn.cursor()
    show(cur, "CostingParts id=%d" % PART,
         "SELECT p.ID, p.PartNumber, p.Revision, p.Description, p.Material, "
         "  conv.Name AS DrawingConversion, ocr.Name AS Ocr, "
         "  ball.Name AS Balloon, cost.Name AS Costing, p.UpdateDate "
         "FROM dbo.CostingParts p "
         "LEFT JOIN dbo.MasterCostingStatus conv ON conv.ID = p.DrawingConversionStatusID "
         "LEFT JOIN dbo.MasterCostingStatus ocr  ON ocr.ID  = p.OcrStatusID "
         "LEFT JOIN dbo.MasterCostingStatus ball ON ball.ID = p.BalloonStatusID "
         "LEFT JOIN dbo.MasterCostingStatus cost ON cost.ID = p.CostingStatusID "
         "WHERE p.ID = ?", PART)

    show(cur, "CostingPartDocuments",
         "SELECT ID, FileName, FileDirectory, ConvertedFileDirectory, InsertDate "
         "FROM dbo.CostingPartDocuments WHERE CostingPartId = ? ORDER BY ID", PART)

    show(cur, "CostingPartDocumentImages (page count only)",
         "SELECT COUNT(*) AS Pages, MIN(i.ID) AS FirstId, MAX(i.ID) AS LastId "
         "FROM dbo.CostingPartDocumentImages i "
         "JOIN dbo.CostingPartDocuments d ON d.ID = i.CostingPartDocumentId "
         "WHERE d.CostingPartId = ?", PART)

    show(cur, "CostingPartBalloons (count)",
         "SELECT COUNT(*) AS Balloons FROM dbo.CostingPartBalloons WHERE CostingPartId = ?", PART)

    show(cur, "status lookup",
         "SELECT ID, Name FROM dbo.MasterCostingStatus ORDER BY ID")
