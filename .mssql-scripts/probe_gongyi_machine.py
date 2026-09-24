"""Dumps the machine block new_tsh actually returned for a quotation.

CostingParts got the machine NAME but no id, and every cost line got neither.
describe_machine builds the name from milling/turning, so a name without an id
means those sub-objects are not the shape handlers.py expects. This prints the
raw stored JSON rather than reasoning about it.

    python .mssql-scripts/probe_gongyi_machine.py [quotation_id]
"""

import json
import sys

import mysql.connector
import yaml

QUOTATION = sys.argv[1] if len(sys.argv) > 1 else "10"

with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)
db = cfg["CostingDatabase"]

conn = mysql.connector.connect(
    host=db["Host"], port=int(db["Port"]), user=db["User"],
    password=db["Password"], database=db["Database"])
cur = conn.cursor(dictionary=True)
cur.execute("SELECT quotation_id, gongyi_processing, create_time, gongyi_result "
            "FROM fee_calculations WHERE quotation_id = %s "
            "ORDER BY create_time DESC LIMIT 3", (QUOTATION,))
rows = cur.fetchall()
conn.close()

print(f"{len(rows)} fee_calculations row(s) for quotation {QUOTATION}\n")
for i, r in enumerate(rows):
    print(f"--- row {i}  created {r['create_time']}  processing={r['gongyi_processing']}")
    if not r["gongyi_result"]:
        print("    gongyi_result is NULL")
        continue
    try:
        data = json.loads(r["gongyi_result"])
    except Exception as exc:
        print(f"    unparseable: {exc}")
        continue

    if "error" in data:
        print(f"    error: {str(data['error'])[:200]}")
        continue

    send = (data.get("data_to_send") or {})
    machine = send.get("machine")
    print(f"    data_to_send keys: {sorted(send.keys())[:14]}")
    print(f"    machine block: {json.dumps(machine, ensure_ascii=False, indent=6)}")
    if i == 0 and machine:
        print("\n    what handlers.py reads:")
        mill = machine.get("milling") or {}
        turn = machine.get("turning") or {}
        print(f"      milling      = {mill!r}")
        print(f"      turning      = {turn!r}")
        print(f"      mill.id      = {mill.get('id')!r}  (truthy: {bool(mill.get('id'))})")
        print(f"      turn.id      = {turn.get('id')!r}")
        print(f"      supplier_id  = {machine.get('supplier_id')!r}")
        print(f"      machine_name = {machine.get('machine_name')!r}")
