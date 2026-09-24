"""Compares the hourly rate costing uses against the one DSRFQ shows.

The card in the workspace shows dbo.Machines.Cost. The quote is priced from
fa_supplier_equipment.work_hours in new_tsh's MySQL -- a rate column, despite
the name. They are two different fields in two different databases, and nothing
observed so far keeps them in step, so a machine can advertise one rate on the
page and be costed at another.
"""

import mysql.connector
import pyodbc
import yaml

with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)

my = cfg["CostingDatabase"]
conn = mysql.connector.connect(host=my["Host"], port=int(my["Port"]),
                               user=my["User"], password=my["Password"],
                               database=my["Database"])
cur = conn.cursor(dictionary=True)
cur.execute("SELECT id, brand, supplier_id, work_hours, axis_number, "
            "spec_x, spec_y, spec_z, delete_time "
            "FROM fa_supplier_equipment ORDER BY id")
eq = {r["id"]: r for r in cur.fetchall()}
conn.close()

sq = cfg["Database"]
sc = pyodbc.connect("DRIVER={" + sq["Driver"] + "};"
                    f"SERVER={sq['Server']};DATABASE={sq['Database']};"
                    f"UID={sq['Uid']};PWD={sq['Pwd']}")
mc = {int(r.ID): r for r in sc.cursor().execute(
    "SELECT ID, Name, Cost, AxisNumber FROM dbo.Machines ORDER BY ID").fetchall()}
sc.close()

print(f"{'id':>3}  {'name':<40} {'Machines.Cost':>13}  {'work_hours':>10}  match")
print("-" * 84)
disagree = missing = 0
for i in sorted(eq):
    e, m = eq[i], mc.get(i)
    cost = None if m is None else (None if m.Cost is None else float(m.Cost))
    rate = None if e["work_hours"] is None else float(e["work_hours"])
    if rate is None:
        missing += 1
        verdict = "no rate -> costing falls back to its default"
    elif cost is None:
        verdict = "no Machines.Cost"
    elif abs(cost - rate) < 0.005:
        verdict = "ok"
    else:
        disagree += 1
        verdict = f"DIFFERS by {cost - rate:+.2f}"
    print(f"{i:>3}  {(e['brand'] or '')[:40]:<40} "
          f"{('-' if cost is None else f'{cost:.2f}'):>13}  "
          f"{('NULL' if rate is None else f'{rate:.2f}'):>10}  {verdict}")

print()
print(f"equipment rows                  : {len(eq)}")
print(f"work_hours IS NULL              : {missing}  (excluded from matching entirely)")
print(f"rate differs from Machines.Cost : {disagree}")
