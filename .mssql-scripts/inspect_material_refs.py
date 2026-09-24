"""Everything MaterialRawMaterialCosts and Materials point at, before seeding.

Seeding into a chain of foreign keys blind is how you end up with rows the app
can list but not open, so this dumps each referenced table's shape and current
contents first.
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

print("=== tables whose name mentions material, unit, temper or shape ===")
for r in cur.execute("""
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
          AND (TABLE_NAME LIKE '%Material%' OR TABLE_NAME LIKE '%Unit%'
               OR TABLE_NAME LIKE '%Temper%' OR TABLE_NAME LIKE '%Shape%'
               OR TABLE_NAME LIKE '%Currenc%')
        ORDER BY TABLE_NAME""").fetchall():
    n = cur.execute("SELECT COUNT(*) FROM dbo.[%s]" % r[0]).fetchone()[0]
    print("  %-42s %d row(s)" % (r[0], n))
conn.commit()

print("\n=== foreign keys out of MaterialRawMaterialCosts and Materials ===")
for r in cur.execute("""
        SELECT fk.name, tp.name AS FromTable, cp.name AS FromCol,
               tr.name AS ToTable, cr.name AS ToCol
        FROM sys.foreign_keys fk
        JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
        JOIN sys.tables tp ON tp.object_id = fk.parent_object_id
        JOIN sys.columns cp ON cp.object_id = tp.object_id AND cp.column_id = fkc.parent_column_id
        JOIN sys.tables tr ON tr.object_id = fk.referenced_object_id
        JOIN sys.columns cr ON cr.object_id = tr.object_id AND cr.column_id = fkc.referenced_column_id
        WHERE tp.name IN ('MaterialRawMaterialCosts', 'Materials')
        ORDER BY tp.name, cp.name""").fetchall():
    print("  %s.%s -> %s.%s" % (r[1], r[2], r[3], r[4]))
conn.commit()

print("\n=== what CostingParts.DimensionUnitID points at ===")
for r in cur.execute("""
        SELECT tr.name, cr.name
        FROM sys.foreign_keys fk
        JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
        JOIN sys.tables tp ON tp.object_id = fk.parent_object_id
        JOIN sys.columns cp ON cp.object_id = tp.object_id AND cp.column_id = fkc.parent_column_id
        JOIN sys.tables tr ON tr.object_id = fk.referenced_object_id
        JOIN sys.columns cr ON cr.object_id = tr.object_id AND cr.column_id = fkc.referenced_column_id
        WHERE tp.name = 'CostingParts' AND cp.name IN
              ('DimensionUnitID','MaterialID','WeightUnitID','VolumeUnitID')""").fetchall():
    print("  -> %s.%s" % (r[0], r[1]))
conn.commit()
conn.close()
