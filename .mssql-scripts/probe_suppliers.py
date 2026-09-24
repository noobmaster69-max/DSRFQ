"""What suppliers exist in new_tsh, and what would each one cost?

Equipment matching is skipped unless DSRFQ passes a supplier_id, so every quote
so far has used the flat default rate. Choosing a supplier is a pricing
decision, so this shows what the options actually are.
"""

import mysql.connector
import yaml

with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)
my = cfg["CostingDatabase"]

conn = mysql.connector.connect(host=my["Host"], port=int(my["Port"]),
                               user=my["User"], password=my["Password"],
                               database=my["Database"])
cur = conn.cursor(dictionary=True)

try:
    cur.execute("SELECT id, name FROM fa_supplier WHERE delete_time IS NULL ORDER BY id")
    suppliers = {r["id"]: r["name"] for r in cur.fetchall()}
except Exception as exc:
    print(f"(no fa_supplier table readable: {exc})")
    suppliers = {}

cur.execute("""
    SELECT supplier_id, COUNT(*) AS machines,
           MIN(work_hours) AS min_rate, MAX(work_hours) AS max_rate,
           ROUND(AVG(work_hours), 2) AS avg_rate,
           SUM(work_hours IS NULL) AS no_rate
    FROM fa_supplier_equipment
    WHERE delete_time IS NULL
    GROUP BY supplier_id ORDER BY supplier_id
""")
print(f"{'supplier':>8}  {'name':<28} {'machines':>8} {'min':>7} {'avg':>7} {'max':>7}")
print("-" * 74)
for r in cur.fetchall():
    print(f"{r['supplier_id']:>8}  {suppliers.get(r['supplier_id'], '?')[:28]:<28} "
          f"{r['machines']:>8} {float(r['min_rate']):>7.2f} "
          f"{float(r['avg_rate']):>7.2f} {float(r['max_rate']):>7.2f}")

print("\nNote: supplier_id 1 is skipped by gongyi_tsh.py:495")
print("      ('if supplier_id is not None and supplier_id != 1'), so it")
print("      behaves the same as passing nothing.")
conn.close()
