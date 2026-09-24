"""Does the axis test actually filter anything?

gongyi_tsh.py:1112-1122 reads as "keep machines whose axis count equals the
one the process needs". But line 1114 writes to `i`, and `i` is a row of the
shared equipment_data list:

    for i in equipment_data:
        ...
        if axis == 3: i['axis_number'] = '3'        # mutates the catalogue
        z = [d for d in equipment_data
             if str(d['axis_number']) == str(i['axis_number'])
             and d['supplier_id'] == supplier_id]

So the row being iterated has its axis count overwritten with the required
value just before it is compared against that same value. It always matches.

This replays the loop both ways -- as written, and with the mutation removed --
to show what the filter is really doing.

    python .mssql-scripts/probe_axis_filter.py [length width height] [axis] [craft]
"""

import copy
import sys

import mysql.connector
import yaml

L, W, H = 107.95, 79.25, 19.05      # part 10
REQ_AXIS = 3
CRAFT = "xi"                         # milling
args = [a for a in sys.argv[1:]]
if len(args) >= 3:
    L, W, H = float(args[0]), float(args[1]), float(args[2])
if len(args) >= 4:
    REQ_AXIS = int(args[3])

x, y1, y2 = sorted([L, W, H], reverse=True)

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
base = cur.fetchall()
conn.close()


def f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def fits(k):
    j = sorted([f(k["spec_x"]), f(k["spec_y"]), f(k["spec_z"])], reverse=True)
    return j[0] > x and j[1] > y1 and j[2] > y2      # craft == 'xi'


def run(mutate):
    data = copy.deepcopy(base)
    picked, seen = [], set()
    for i in data:
        sup = i["supplier_id"]
        if sup in seen:
            continue
        seen.add(sup)
        if mutate:
            i["axis_number"] = str(REQ_AXIS)          # gongyi_tsh.py:1114
        want = str(i["axis_number"]) if mutate else str(REQ_AXIS)
        z = [d for d in data
             if str(d["axis_number"]) == want and d["supplier_id"] == sup]
        ok = [k for k in z if fits(k)]
        if ok:
            # Prices are all equal (see probe_machine_choice.py), so min()
            # returns the first -- i.e. lowest id.
            picked.append(ok[0])
    return picked


for mutate, title in ((True, "AS WRITTEN (axis_number overwritten)"),
                      (False, "MUTATION REMOVED (true axis comparison)")):
    picked = run(mutate)
    print(f"\n=== {title} ===")
    print(f"part {L} x {W} x {H}, process needs {REQ_AXIS}-axis milling")
    for p in picked:
        print(f"  supplier {p['supplier_id']}: id {p['id']:>3}  "
              f"axis={p['axis_number']}  rate={f(p['work_hours']):>6.2f}  {p['brand'][:38]}")
    if picked:
        print(f"  -> quote uses: id {picked[0]['id']} {picked[0]['brand'][:38]} "
              f"@ {f(picked[0]['work_hours']):.2f}/h")
    else:
        print("  -> nothing qualifies; falls back to default rates")
