"""Why does every quote land on the same machine?

gongyi_tsh picks the "cheapest" equipment, but two things in the selection loop
make that degenerate:

  1. dic['work_hours'] = supplier_hourly_rate          (gongyi_tsh.py:1137)
     dic['price'] computed from supplier_hourly_rate   (:1151, :1153)
     -- the price does not depend on WHICH machine k is, so every qualifying
        machine of a supplier scores identically.

  2. min(...) on equal keys returns the first item, and list.sort is stable,
     so both the per-supplier pick (:1188) and the cross-supplier sort (:1193)
     fall through to the original fa_supplier_equipment order, i.e. id order.

This replicates the envelope filter for a part and shows which machines
qualify, in the order the loop sees them.
"""

import sys

import mysql.connector
import yaml

# Part 10, as recorded on CostingParts.
L, W, H = 107.95, 79.25, 19.05
if len(sys.argv) > 3:
    L, W, H = (float(a) for a in sys.argv[1:4])

x, y1, y2 = sorted([L, W, H], reverse=True)
print(f"part {L} x {W} x {H}  ->  thresholds {x} > {y1} > {y2}\n")

with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)
my = cfg["CostingDatabase"]
conn = mysql.connector.connect(host=my["Host"], port=int(my["Port"]),
                               user=my["User"], password=my["Password"],
                               database=my["Database"])
cur = conn.cursor(dictionary=True)
cur.execute("SELECT id, supplier_id, brand, axis_number, work_hours, "
            "spec_x, spec_y, spec_z FROM fa_supplier_equipment "
            "WHERE delete_time IS NULL ORDER BY id")
rows = cur.fetchall()
conn.close()


def f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


print(f"{'id':>3} {'sup':>4} {'axis':>5} {'rate':>7}  {'envelope (sorted)':<26} qualifies for milling?")
print("-" * 88)
qualifying = []
for r in rows:
    j = sorted([f(r["spec_x"]), f(r["spec_y"]), f(r["spec_z"])], reverse=True)
    # craft == 'xi' branch, gongyi_tsh.py:1133
    ok = j[0] > x and j[1] > y1 and j[2] > y2
    if ok:
        qualifying.append(r)
    print(f"{r['id']:>3} {r['supplier_id']:>4} {str(r['axis_number']):>5} "
          f"{f(r['work_hours']):>7.2f}  "
          f"{f'{j[0]:.0f} x {j[1]:.0f} x {j[2]:.0f}':<26} {'YES' if ok else '-'}")

print(f"\n{len(qualifying)} machine(s) fit the part.")
if qualifying:
    first = qualifying[0]
    print(f"first in id order : id {first['id']}  {first['brand']}  "
          f"supplier {first['supplier_id']}  rate {f(first['work_hours']):.2f}")
    cheapest = min(qualifying, key=lambda r: f(r["work_hours"]))
    print(f"actually cheapest : id {cheapest['id']}  {cheapest['brand']}  "
          f"supplier {cheapest['supplier_id']}  rate {f(cheapest['work_hours']):.2f}")
    if first["id"] != cheapest["id"]:
        print("\n-> The loop picks the FIRST, not the cheapest, because every")
        print("   qualifying machine is scored with the same flat rate.")
