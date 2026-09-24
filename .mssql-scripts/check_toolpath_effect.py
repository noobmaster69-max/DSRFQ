"""What the toolpath data contributes, and why the quoted hours stay low.

Two separate questions:
  1. Did the CAM engines actually return toolpaths for the recent parts?
  2. If they did, what time do their own formulas imply, versus what was quoted?

The second is computed from cam_new/toolpath_generator.py's real numbers, so
this is the pipeline's own arithmetic, not an outside opinion.

    python .mssql-scripts/check_toolpath_effect.py
"""

import glob
import json
import math
import os
import sys

import pyodbc
import yaml

OUT = r"C:\Aizera\RPA\new_tsh\output"

# --- cam_new/toolpath_generator.py -----------------------------------------
ALU = {'cutting_speed': {'rough': 250, 'semi': 280, 'finish': 300},
       'chip_load': {'rough': 0.08, 'semi': 0.06, 'finish': 0.05},
       'doc_factor': {'rough': 0.3, 'semi': 0.2, 'finish': 0.1},
       'woc_factor': {'rough': 0.6, 'semi': 0.4, 'finish': 0.3},
       'mrr_factor': 1.2}


def cutting_params(tool_d, op):
    doc = min(tool_d * ALU['doc_factor'][op],
              6.0 if op == 'rough' else 3.0 if op == 'semi' else 0.5)
    woc = tool_d * ALU['woc_factor'][op]
    rpm = int((ALU['cutting_speed'][op] * 1000) / (math.pi * tool_d))
    feed = int(rpm * ALU['chip_load'][op] * 4)      # 4-flute assumption
    return doc, woc, feed, ALU['mrr_factor']


def freecad_minutes(removed_mm3, curved_ratio=0.0):
    """generate_freecad_toolpath's rough + semi legs, in minutes."""
    doc, woc, feed, mf = cutting_params(20, 'rough')
    mrr = doc * woc * feed * 0.8
    rough = removed_mm3 / (mrr * mf)
    rough *= (1 + curved_ratio * 0.2)
    rough += 1.5

    doc, woc, feed, mf = cutting_params(12, 'semi')
    semi_mrr = doc * woc * feed * 0.7
    semi = (removed_mm3 * 0.3) / (semi_mrr * mf)
    semi *= (1 + curved_ratio * 0.3)
    semi += 1.0
    return rough, semi


print("=" * 78)
print("1. Did the CAM engines return toolpaths?")
print("=" * 78)

files = sorted(glob.glob(os.path.join(OUT, "*", "analysis_results*.json")),
               key=os.path.getmtime, reverse=True)[:10]
if not files:
    print("  no analysis_results*.json under output/")

seen = 0
for f in files:
    try:
        with open(f, encoding="utf-8") as fh:
            d = json.load(fh)
    except Exception as e:
        print(f"  {os.path.basename(os.path.dirname(f))}: unreadable ({e})")
        continue

    # The complete file wraps each algorithm under results.<name>.
    node = d
    if 'features' not in d and isinstance(d.get('results'), dict):
        node = d['results'].get('cam_analysis') or {}

    tp = (node.get('toolpaths') or {})
    engines = {k: (v or {}).get('total_time') for k, v in tp.items()} if tp else {}
    ops = ((tp.get('freecad') or {}).get('operations') or [])
    vol = ((node.get('features') or {}).get('volume_info') or {})

    print(f"\n  {os.path.basename(os.path.dirname(f))}  "
          f"({os.path.basename(f)}, {os.path.getsize(f):,} bytes)")
    print(f"    toolpath engines : {engines if engines else 'NONE'}")
    print(f"    freecad ops      : {len(ops)}"
          + (f"  times={[round(float(o.get('time', 0)), 1) for o in ops]}" if ops else ""))
    if vol:
        print(f"    material_removal : {vol.get('material_removal')}")
    seen += 1
    if seen >= 4:
        break

print()
print("=" * 78)
print("2. What the toolpath formulas imply, versus what was quoted")
print("=" * 78)

with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)
dcfg = cfg["Database"]
conn = pyodbc.connect("DRIVER={" + dcfg["Driver"] + "};"
                      f"SERVER={dcfg['Server']};DATABASE={dcfg['Database']};"
                      f"UID={dcfg['Uid']};PWD={dcfg['Pwd']}")
cur = conn.cursor()

rows = cur.execute(
    "SELECT p.ID, p.PartNumber, "
    "  CAST(p.GrossVolume AS float) - CAST(p.NetVolume AS float) AS Removed, "
    "  (SELECT SUM(CAST(Quantity AS float)) FROM dbo.CostingPartCostingResults r "
    "   WHERE r.CostingPartID = p.ID AND r.IsActive = 1 AND r.Name LIKE 'Milling%') AS Hours "
    "FROM dbo.CostingParts p WHERE p.IsActive = 1 AND p.GrossVolume IS NOT NULL "
    "ORDER BY p.ID").fetchall()

print(f"  {'part':>4} {'removed cm3':>12} {'quoted h':>9} {'freecad h':>10} {'ratio':>8}")
worst = []
for r in rows:
    if not r.Hours or not r.Removed or r.Removed <= 0:
        continue
    rough, semi = freecad_minutes(r.Removed)
    cam_h = (rough + semi) / 60
    ratio = cam_h / r.Hours if r.Hours else 0
    print(f"  {r.ID:>4} {r.Removed / 1000:>12,.1f} {r.Hours:>9.2f} "
          f"{cam_h:>10.2f} {ratio:>7.1f}x")
    if ratio > 2:
        worst.append((r.ID, ratio))

print()
print("=" * 78)
print("3. Why the mean drags it down")
print("=" * 78)

# web_time = (cam_4_time + AML_processing_time + new_cam_time) / 3
# Only cam_4_time scales with the part. new_cam defaults to a constant, and
# AML is an ML prediction that stayed under an hour on every part measured.
NEW_CAM_DEFAULT = 75.5 / 60
AML_TYPICAL = 0.40

for label, cam_h in (("a small part  (cam says 0.5 h)", 0.5),
                     ("a medium part (cam says 6 h)", 6.0),
                     ("a large part  (cam says 27 h)", 27.0)):
    web = (cam_h + AML_TYPICAL + NEW_CAM_DEFAULT) / 3
    print(f"  {label:<32} -> quoted {web:>6.2f} h   "
          f"({web / cam_h * 100:>5.1f}% of the CAM estimate)")

print("\n  The divide-by-three is unconditional: two of the three inputs do not")
print("  scale with the part, so the bigger the part, the harder the mean pulls")
print("  the quote down toward those two constants.")

conn.close()
print()
if worst:
    print(f"{len(worst)} part(s) quoted well under their own toolpath estimate: "
          + ", ".join(f"part {p} ({r:.1f}x)" for p, r in worst))
sys.exit(0)
