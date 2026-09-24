"""Seed example material master data so costing can produce a Material Cost line.

The costing writes that line only when it can walk
CostingParts.MaterialID -> Materials -> MaterialRawMaterialCosts, and convert
the price into the configured weight unit and currency (kg / USD in
config.yaml). Every table in that chain was empty, which is why every costed
part so far shows machining time and no material at all.

Idempotent: rows are matched on their natural key (Code, or material+currency)
and skipped if already present, so this can be re-run after editing anything in
the UI without producing duplicates.

Everything inserted is tagged SAMPLE_TAG in its description so it can be found
and removed later:

    UPDATE dbo.Materials SET IsActive = 0 WHERE Description LIKE '%[sample data]%'
"""
import io
import json
import re
import sys

import pyodbc

APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"
SAMPLE_TAG = "[sample data]"
USER_ID = 1

# Pint has to recognise the weight code: handlers.py converts the stored price
# with convert_material_price(), which parses the code as a unit. 'kg' works,
# 'KG' and 'Kilogram' do not.
WEIGHT_UNITS = [("kg", "Kilogram"), ("g", "Gram"), ("lb", "Pound"),
                ("oz", "Ounce"), ("tonne", "Metric Tonne")]
VOLUME_UNITS = [("mm3", "Cubic Millimetre"), ("cm3", "Cubic Centimetre"),
                ("m3", "Cubic Metre"), ("in3", "Cubic Inch")]
DIMENSION_UNITS = [("MM", "Millimetre"), ("CM", "Centimetre"),
                   ("M", "Metre"), ("IN", "Inch")]
CURRENCIES = [("USD", "US Dollar"), ("MYR", "Malaysian Ringgit"),
              ("SGD", "Singapore Dollar"), ("EUR", "Euro")]
TEMPERS = [("T6", "Solution heat treated and artificially aged"),
           ("T651", "Solution heat treated, stress relieved, aged"),
           ("H32", "Strain hardened and stabilised"),
           ("ANN", "Annealed"),
           ("NA", "Not applicable")]

# (code, name, density g/cm3, USD per kg, description)
# The first three are the materials the drawings in this database actually
# call up, so a costing run has something real to match.
MATERIALS = [
    ("AL6061T6",  "AL 6061-T6",        2.70,   6.50, "Aluminium 6061-T6 plate/bar"),
    ("AL6061T651", "ALUMINUM 6061-T651", 2.70,  6.80, "Aluminium 6061-T651, ASTM B209"),
    ("AL5052H32", "AL 5052-H32",       2.68,   6.20, "Aluminium 5052-H32 sheet"),
    ("AL7075T651", "AL 7075-T651",     2.81,  11.50, "Aluminium 7075-T651, high strength"),
    ("SS304",     "SS 304",            8.00,   4.80, "Stainless steel 304"),
    ("SS316L",    "SS 316L",           8.00,   7.20, "Stainless steel 316L, low carbon"),
    ("TI64",      "Ti 6Al-4V",         4.43,  42.00, "Titanium grade 5"),
    ("CU11000",   "C11000 Copper",     8.94,  12.50, "Electrolytic tough pitch copper"),
    ("BRASSC360", "Brass C36000",      8.50,   9.80, "Free-cutting brass"),
    ("NI200",     "Nickel 200",        8.89,  38.00, "Commercially pure nickel"),
    ("PEEK",      "PEEK",              1.32,  95.00, "Polyetheretherketone, unfilled"),
    ("POM",       "POM (Delrin)",      1.41,   6.00, "Acetal homopolymer"),
]

raw = json.load(io.open(APPSETTINGS, encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")), timeout=90)
cur = conn.cursor()

added = {}


def seed_lookup(table, rows, has_description=False):
    """Insert (Code, Name) rows that are not already there. Returns {code: id}."""
    out, new = {}, 0
    for code, name in rows:
        found = cur.execute(
            "SELECT ID FROM dbo.[%s] WHERE Code = ? AND IsActive = 1" % table, code).fetchone()
        if found:
            out[code] = found[0]
            continue
        if has_description:
            cur.execute(
                "INSERT INTO dbo.[%s] (Code, Name, Description, InsertDate, InsertUserId, "
                "IsActive) OUTPUT INSERTED.ID VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, 1)" % table,
                code, name, SAMPLE_TAG + " " + name, USER_ID)
        else:
            cur.execute(
                "INSERT INTO dbo.[%s] (Code, Name, InsertDate, InsertUserId, IsActive) "
                "OUTPUT INSERTED.ID VALUES (?, ?, CURRENT_TIMESTAMP, ?, 1)" % table,
                code, name, USER_ID)
        out[code] = cur.fetchone()[0]
        new += 1
    conn.commit()
    added[table] = new
    print("  %-26s %d existing, %d added" % (table, len(rows) - new, new))
    return out


print("reference data")
weight = seed_lookup("MasterWeightUnits", WEIGHT_UNITS)
volume = seed_lookup("MasterVolumeUnits", VOLUME_UNITS)
dimension = seed_lookup("MasterDimensionUnits", DIMENSION_UNITS)
currency = seed_lookup("MasterCurrencies", CURRENCIES)
seed_lookup("MaterialTempers", TEMPERS, has_description=True)

print("\nmaterials and prices")
mm_id = dimension.get("MM")
kg_id = weight["kg"]
usd_id = currency["USD"]

new_materials = new_prices = 0
for code, name, density, price, description in MATERIALS:
    row = cur.execute("SELECT ID FROM dbo.Materials WHERE Code = ? AND IsActive = 1",
                      code).fetchone()
    if row:
        material_id = row[0]
    else:
        cur.execute("""
            INSERT INTO dbo.Materials (Code, Name, Description, Density, DimensionUnitID,
                                       InsertDate, InsertUserId, IsActive)
            OUTPUT INSERTED.ID
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 1)""",
            code, name, "%s %s (density in g/cm3)" % (SAMPLE_TAG, description),
            density, mm_id, USER_ID)
        material_id = cur.fetchone()[0]
        new_materials += 1

    # One active price per material: the costing does fetchone(), so a second
    # active row would be picked arbitrarily.
    priced = cur.execute("""
        SELECT ID FROM dbo.MaterialRawMaterialCosts
        WHERE MaterialID = ? AND IsActive = 1""", material_id).fetchone()
    if not priced:
        cur.execute("""
            INSERT INTO dbo.MaterialRawMaterialCosts
                (MaterialID, WeightDimensionUnitID, CurrencyID, UnitPrice,
                 FromDate, InsertDate, InsertUserId, IsActive)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, 1)""",
            material_id, kg_id, usd_id, price, USER_ID)
        new_prices += 1

conn.commit()
print("  %-26s %d existing, %d added" % ("Materials", len(MATERIALS) - new_materials,
                                         new_materials))
print("  %-26s %d existing, %d added" % ("MaterialRawMaterialCosts",
                                         len(MATERIALS) - new_prices, new_prices))

print("\nresulting price list (as the costing reads it)")
for r in cur.execute("""
        SELECT m.Code, m.Name, c.UnitPrice, cur.Code, w.Code, m.Density
        FROM dbo.Materials m
        INNER JOIN dbo.MaterialRawMaterialCosts c ON c.MaterialID = m.ID AND c.IsActive = 1
        LEFT JOIN dbo.MasterCurrencies cur ON cur.ID = c.CurrencyID
        LEFT JOIN dbo.MasterWeightUnits w ON w.ID = c.WeightDimensionUnitID
        WHERE m.IsActive = 1 ORDER BY m.Code""").fetchall():
    print("  %-12s %-20s %8.2f %s per %-6s density %.2f g/cm3"
          % (r[0], r[1], r[2], r[3], r[4], r[5]))
conn.commit()
conn.close()
print("\ndone")
