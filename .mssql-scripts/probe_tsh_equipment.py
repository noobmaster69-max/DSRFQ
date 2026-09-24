"""What is in new_tsh's fa_supplier_equipment, and could it be matched to dbo.Machines?

Costing stores fa_supplier_equipment.id on CostingParts / CostingPartCostingResults,
but the UI needs to show dbo.Machines (picture, axis count, envelope). Nothing
currently joins the two -- they are different databases on different engines.
This prints both sides so the link can be designed from the data.
"""

import mysql.connector
import yaml

with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)

db = cfg.get("CostingDatabase") or {}
conn = mysql.connector.connect(
    host=db.get("Host", "localhost"), port=int(db.get("Port", 3307)),
    user=db.get("User", "joe"), password=db.get("Password", ""),
    database=db.get("Database", "tsh_new"))
cur = conn.cursor(dictionary=True)

cur.execute("SHOW COLUMNS FROM fa_supplier_equipment")
cols = [c["Field"] for c in cur.fetchall()]
print("fa_supplier_equipment columns:")
print("  " + ", ".join(cols))

cur.execute("SELECT COUNT(*) AS n FROM fa_supplier_equipment")
print("\nrow count:", cur.fetchone()["n"])

name_cols = [c for c in cols if any(k in c.lower()
             for k in ("name", "model", "brand", "title"))]
pick = ["id"] + name_cols + [c for c in cols
                             if c in ("axis_number", "supplier_id", "type", "status")]
cur.execute(f"SELECT {', '.join(dict.fromkeys(pick))} FROM fa_supplier_equipment LIMIT 30")
rows = cur.fetchall()
print(f"\nfirst {len(rows)} rows:")
for r in rows:
    print("  " + " | ".join(f"{k}={r[k]!r}" for k in r))

conn.close()
