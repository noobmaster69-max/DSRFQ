"""Block until a part's conversion+OCR reach a terminal state, then report.

Exists so a run can be watched without polling by hand; prints a line each
time a status or a recorded step changes, so a stall is visible as silence
against a known clock rather than guessed at.
"""
import io
import json
import re
import sys
import time

import pyodbc

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 6
LIMIT = float(sys.argv[2]) if len(sys.argv) > 2 else 900.0
APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"

raw = json.load(io.open(APPSETTINGS, encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")), timeout=90)
cur = conn.cursor()

STATUS = {1: "Pending", 2: "In Progress", 3: "Completed", 4: "Failed",
          5: "Partial", 6: "Retry"}
TERMINAL = {3, 4, 5}

t0 = time.time()
seen = None
while time.time() - t0 < LIMIT:
    p = cur.execute("SELECT DrawingConversionStatusID, OcrStatusID, CostingStatusID, "
                    "BalloonStatusID FROM dbo.CostingParts WHERE ID = ?", PART).fetchone()
    conn.commit()
    steps = cur.execute(
        "SELECT Stage, Status, DurationMs FROM dbo.CostingPartStageTimings "
        "WHERE CostingPartID = ? AND IsActive = 1 ORDER BY StartTime", PART).fetchall()
    conn.commit()
    snap = (tuple(p), tuple((s[0], s[1], s[2]) for s in steps))
    if snap != seen:
        seen = snap
        print("[%4ds] conv=%-11s ocr=%-11s cost=%-11s | %s" % (
            time.time() - t0, STATUS.get(p[0], p[0]), STATUS.get(p[1], p[1]),
            STATUS.get(p[2], p[2]),
            ", ".join("%s:%s%s" % (s[0], s[1], "" if s[2] is None else "/%.1fs" % (s[2] / 1000.0))
                      for s in steps) or "no step yet"))
    if p[0] in TERMINAL and p[1] in TERMINAL:
        break
    time.sleep(5)

p = cur.execute("""SELECT DrawingConversionStatusID, OcrStatusID, PartNumber, Revision,
                          Description, CustomerName, Material, Uom, PartPicture
                   FROM dbo.CostingParts WHERE ID = ?""", PART).fetchone()
print("\nfinal: conversion=%s  ocr=%s" % (STATUS.get(p[0], p[0]), STATUS.get(p[1], p[1])))
print("  PartNumber  : %s" % p[2])
print("  Revision    : %s" % p[3])
print("  Description : %s" % p[4])
print("  Customer    : %s" % p[5])
print("  Material    : %s" % p[6])
print("  UOM         : %s" % p[7])
print("  PartPicture : %s" % (p[8] or "(none)"))

n = cur.execute("SELECT COUNT(*) FROM dbo.CostingPartDocuments WHERE CostingPartID = ? "
                "AND IsActive = 1 AND Type = 4", PART).fetchone()[0]
print("  converted pages: %s" % n)
conn.close()
sys.exit(0 if p[0] == 3 and p[1] == 3 else 1)
