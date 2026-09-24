"""Why was the quote priced at the default rate instead of the machine's?

gongyi_tsh only matches equipment (and therefore only picks up a real hourly
rate) when a supplier_id is passed in:

    if supplier_id is not None and supplier_id != 1:   # gongyi_tsh.py:495
        ... supplier_hourly_rate = best_rate
    else:
        supplier_hourly_rate = default_turning_rate if craft == 'che' else 45.0

This scans new_tsh's log for the supplier_id each costing was given and for the
equipment-matching decisions, so the branch taken is observed rather than
inferred.
"""

import re
import sys

LOG = r"C:\Aizera\RPA\new_tsh\api.log"

text = open(LOG, encoding="utf-8", errors="ignore").read()

print("=== supplier_id passed into each costing ===")
seen = 0
for m in re.finditer(r"^(\S+ \S+).*Calling real process_upload.*$", text, re.M):
    line = m.group(0)
    sup = re.search(r"'supplier_id': ([^,]+)", line)
    name = re.search(r"'supplier_name': ([^,]+)", line)
    eqs = re.search(r"'supplier_equipment': (\[[^\]]*\])", line)
    print(f"  {m.group(1)}  supplier_id={sup.group(1) if sup else '?'}  "
          f"name={name.group(1) if name else '?'}  "
          f"equipment={(eqs.group(1)[:40] if eqs else '?')}")
    seen += 1
if not seen:
    print("  (none found)")

print("\n=== equipment-matching / rate decisions logged ===")
hits = re.findall(r"^.*(?:Equipment Matching|Hourly Rate|default rate|"
                  r"Selected best equipment).*$", text, re.M)
for h in hits[-25:]:
    print("  " + h.strip()[:160])
if not hits:
    print("  (none - the matching block never ran, which is what a")
    print("   supplier_id of None causes: gongyi_tsh.py:495 skips it)")

print("\n=== what rate ended up on the quote ===")
for m in re.finditer(r"'milling_roughing_equipment_costs_hours': ([0-9.]+)", text):
    pass
rates = re.findall(r"'milling_roughing_equipment_costs_hours': ([0-9.]+)", text)
print(f"  milling_roughing rates seen (last 8): {rates[-8:] or 'none'}")
