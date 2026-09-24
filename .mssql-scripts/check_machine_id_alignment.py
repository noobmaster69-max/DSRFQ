"""Do fa_supplier_equipment.id and dbo.Machines.ID identify the same machine?

Everything about the UI design turns on this. Costing records
fa_supplier_equipment.id, but the page has to show dbo.Machines (picture, axis
count, envelope). If the ids already line up, MachineID is simply a foreign key
to dbo.Machines and no mapping table is needed. If they do not, the link has to
be stored explicitly and guessing by name would silently mis-attribute machines.

Compares every row on both sides by id and name.
"""

import mysql.connector
import pyodbc
import yaml

with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)

my = cfg["CostingDatabase"]
mysql_conn = mysql.connector.connect(
    host=my["Host"], port=int(my["Port"]), user=my["User"],
    password=my["Password"], database=my["Database"])
cur = mysql_conn.cursor(dictionary=True)
cur.execute("SELECT id, brand, axis_number, supplier_id, delete_time "
            "FROM fa_supplier_equipment ORDER BY id")
equipment = {r["id"]: r for r in cur.fetchall()}
mysql_conn.close()

sq = cfg["Database"]
sql_conn = pyodbc.connect(
    "DRIVER={" + sq["Driver"] + "};"
    f"SERVER={sq['Server']};DATABASE={sq['Database']};"
    f"UID={sq['Uid']};PWD={sq['Pwd']}")
rows = sql_conn.cursor().execute(
    "SELECT ID, Name, AxisNumber, IsActive FROM dbo.Machines ORDER BY ID").fetchall()
machines = {int(r.ID): r for r in rows}
sql_conn.close()

print(f"fa_supplier_equipment: {len(equipment)} rows")
print(f"dbo.Machines:          {len(machines)} rows\n")


def norm(s):
    return " ".join((s or "").split()).lower()


same = diff = only_eq = only_mc = 0
for eq_id in sorted(set(equipment) | set(machines)):
    eq, mc = equipment.get(eq_id), machines.get(eq_id)
    if eq and not mc:
        only_eq += 1
        print(f"  id {eq_id:>3}  only in fa_supplier_equipment: {eq['brand']!r}")
    elif mc and not eq:
        only_mc += 1
        print(f"  id {eq_id:>3}  only in dbo.Machines:          {mc.Name!r}")
    elif norm(eq["brand"]) == norm(mc.Name):
        same += 1
    else:
        diff += 1
        print(f"  id {eq_id:>3}  NAME MISMATCH  fa={eq['brand']!r}  machines={mc.Name!r}")

print(f"\nmatching id+name : {same}")
print(f"id present both, name differs : {diff}")
print(f"only in fa_supplier_equipment : {only_eq}")
print(f"only in dbo.Machines          : {only_mc}")
print()
if diff == 0 and only_eq == 0:
    print("VERDICT: ids align. MachineID can be a foreign key to dbo.Machines,")
    print("         and rows that exist only in dbo.Machines are simply newer.")
else:
    print("VERDICT: ids do NOT align. An explicit mapping is required.")
