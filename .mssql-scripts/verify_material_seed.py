"""The seeded material data is usable by the costing code, not just present.

Two things can be wrong in a way a SELECT will not show: a weight unit code
Pint cannot parse (convert_material_price returns None and the Material Cost
line is silently skipped), and a currency the converter has no rate for. This
runs the real converter over every seeded row.
"""
import io
import json
import os
import re
import sys

import pyodbc

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
os.chdir(r"C:\Aizera\RPA\RFQ")

from function import convert_material_price

APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"
raw = json.load(io.open(APPSETTINGS, encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")), timeout=90)
cur = conn.cursor()

with io.open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as f:
    import yaml
    cfg = yaml.safe_load(f)
TARGET_WEIGHT = cfg["WeightUnit"]
TARGET_CURRENCY = cfg["CurrencyCode"]
print("costing targets: %s / %s\n" % (TARGET_WEIGHT, TARGET_CURRENCY))

failures = []


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + ((" -- " + detail) if detail else ""))
    if not ok:
        failures.append(label)


print("every seeded price converts to the configured unit")
rows = cur.execute("""
    SELECT m.Name, c.UnitPrice, cur.Code, w.Code
    FROM dbo.Materials m
    INNER JOIN dbo.MaterialRawMaterialCosts c ON c.MaterialID = m.ID AND c.IsActive = 1
    LEFT JOIN dbo.MasterCurrencies cur ON cur.ID = c.CurrencyID
    LEFT JOIN dbo.MasterWeightUnits w ON w.ID = c.WeightDimensionUnitID
    WHERE m.IsActive = 1 ORDER BY m.Name""").fetchall()
conn.commit()
check("priced materials exist", len(rows) > 0, "%d row(s)" % len(rows))

for name, price, currency, weight_unit in rows:
    converted = convert_material_price(price, (weight_unit or "").lower(),
                                       currency, TARGET_WEIGHT, TARGET_CURRENCY)
    check("%-20s %s/%s converts" % (name, currency, weight_unit),
          converted is not None, "-> %s" % converted)

print("\nevery seeded weight unit code is parseable")
units = cur.execute("SELECT Code FROM dbo.MasterWeightUnits WHERE IsActive = 1").fetchall()
conn.commit()
for (code,) in units:
    got = convert_material_price(10.0, code.lower(), "USD", TARGET_WEIGHT, TARGET_CURRENCY)
    check("weight unit %-8s usable" % code, got is not None, "10/%s -> %s per %s"
          % (code, got, TARGET_WEIGHT))

print("\nno material has two active prices (the costing takes the first it finds)")
dupes = cur.execute("""
    SELECT MaterialID, COUNT(*) FROM dbo.MaterialRawMaterialCosts
    WHERE IsActive = 1 GROUP BY MaterialID HAVING COUNT(*) > 1""").fetchall()
conn.commit()
check("one active price per material", not dupes,
      "; ".join("materialId %s has %s" % (d[0], d[1]) for d in dupes))

print("\nthe reference rows the costing looks up by code exist")
for table, code in (("MasterWeightUnits", TARGET_WEIGHT),
                    ("MasterCurrencies", TARGET_CURRENCY),
                    ("MasterVolumeUnits", cfg["VolumeUnit"])):
    found = cur.execute("SELECT ID FROM dbo.%s WHERE Code = ? AND IsActive = 1"
                        % table, code).fetchone()
    conn.commit()
    check("%s has %r" % (table, code), found is not None)

conn.close()
print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
