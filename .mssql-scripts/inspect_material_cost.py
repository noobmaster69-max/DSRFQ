"""What the Material Cost line needs, and which of it is missing.

The costing writes a "Material Cost" row only when it can join the part's
MaterialID to a MaterialRawMaterialCosts row and convert that price into the
configured weight unit and currency. Any missing link means the line is
silently absent rather than wrong, so this reports each link separately.
"""
import io
import json
import re

import pyodbc

APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"
raw = json.load(io.open(APPSETTINGS, encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")), timeout=90)
cur = conn.cursor()


def columns(table):
    rows = cur.execute("""
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION""", table).fetchall()
    conn.commit()
    return rows


def show(table):
    cols = columns(table)
    if not cols:
        print("\n%-34s DOES NOT EXIST" % table)
        return
    n = cur.execute("SELECT COUNT(*) FROM dbo.%s" % table).fetchone()[0]
    conn.commit()
    print("\n=== %s  (%d row%s) ===" % (table, n, "" if n == 1 else "s"))
    print("  " + ", ".join("%s %s%s" % (c[0], c[1], "" if c[2] == "YES" else " NOT NULL")
                           for c in cols))


for t in ("MaterialRawMaterialCosts", "Materials", "MasterMaterials",
          "MasterCurrencies", "MasterWeightUnits", "MasterVolumeUnits"):
    show(t)

print("\n=== what the parts point at ===")
for r in cur.execute("""
        SELECT p.ID, p.PartNumber, p.Material, p.MaterialID, p.GrossWeight,
               p.NetWeight, p.WeightUnit
        FROM dbo.CostingParts p WHERE p.IsActive = 1 ORDER BY p.ID""").fetchall():
    print("  part %-3s %-16s material=%-18s MaterialID=%-6s gross=%-10s unit=%s"
          % (r[0], r[1], (r[2] or "")[:18], r[3], r[4], r[6]))
conn.commit()

print("\n=== existing raw material costs ===")
try:
    rows = cur.execute("""
        SELECT a.ID, a.MaterialID, a.UnitPrice, b.Code, c.Code, a.IsActive
        FROM dbo.MaterialRawMaterialCosts a
        LEFT JOIN dbo.MasterCurrencies b ON b.ID = a.CurrencyID
        LEFT JOIN dbo.MasterWeightUnits c ON c.ID = a.WeightDimensionUnitID
        ORDER BY a.ID""").fetchall()
    conn.commit()
    if not rows:
        print("  NONE -- this is why no part gets a Material Cost line")
    for r in rows:
        print("  id=%-4s materialId=%-5s price=%-12s %s per %s active=%s"
              % (r[0], r[1], r[2], r[3], r[4], r[5]))
except Exception as exc:
    print("  %s" % exc)

print("\n=== reference data ===")
for t, cols in (("MasterCurrencies", "ID, Code"),
                ("MasterWeightUnits", "ID, Code")):
    try:
        rows = cur.execute("SELECT %s FROM dbo.%s WHERE IsActive = 1 ORDER BY ID" % (cols, t)).fetchall()
        conn.commit()
        print("  %-20s %s" % (t, ", ".join("%s=%s" % (r[0], r[1]) for r in rows)))
    except Exception as exc:
        print("  %-20s %s" % (t, exc))

conn.close()
