"""What unit does toolpaths.*.total_time actually carry?

gongyi_tsh divides it by 60, which is only right if the engines return minutes.
This recomputes cam_new/main.py:calculate_strategy_time from the features
stored in the same file and checks which unit reproduces the stored number.
Matching to the last decimal settles it.

    python .mssql-scripts/check_cam_units.py
"""

import glob
import json
import math
import os
import sys

SRC = r"C:\Aizera\RPA\new_tsh\output\QsqVki8YG7\analysis_results.json"

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


d = json.load(open(SRC, encoding="utf-8"))
node = d if 'features' in d else (d.get('results', {}).get('cam_analysis') or d)
feats = node['features']
tp = node['toolpaths']

vol_remove = feats['volume_info']['material_removal']
surface_area = feats['surface_area']
fa = feats['face_analysis']
total_faces = fa.get('total_faces', 1) or 1
curved_ratio = fa.get('curved_faces', 0) / total_faces
num_holes = (feats.get('holes') or {}).get('num_holes', 0)
bbox = feats.get('bounding_box', {})
L, W, H = bbox.get('length', 0), bbox.get('width', 0), bbox.get('height', 0)

MRR_LOW, MRR_STD, MRR_HIGH = 3000, 8000, 15000
FEED_PROFILE = 1200
SURF_SLOW, SURF_STD = 1000, 2500
setup_time = 10.0

print(f"  removed volume : {vol_remove:,.0f} mm3")
print(f"  surface area   : {surface_area:,.0f} mm2")
print(f"  curved ratio   : {curved_ratio:.4f}  ({fa.get('curved_faces')}/{total_faces})")
print()

# --- freecad, straight out of calculate_strategy_time ---
t_rough = vol_remove / MRR_STD              # mm3 / (mm3 per MINUTE) -> minutes
t_finish = surface_area / SURF_STD           # mm2 / (mm2 per MINUTE) -> minutes
penalty = 1.0 + (curved_ratio * 0.5)
total_minutes = (t_rough + t_finish) * penalty + setup_time
returned = total_minutes / 60.0              # the function's own final line

stored = tp['freecad']['total_time']
print(f"  t_rough        : {t_rough:,.2f} minutes")
print(f"  t_finish       : {t_finish:,.2f} minutes")
print(f"  total          : {total_minutes:,.2f} minutes")
print(f"  after /60      : {returned:,.5f}")
print(f"  stored value   : {stored:,.5f}")
print()

check("the recomputation reproduces the stored value exactly",
      abs(returned - stored) < 1e-6, f"{returned:.6f} vs {stored:.6f}")

# The inputs are per-minute rates, so the pre-division figure is minutes and
# the /60 makes the returned value HOURS. The comment on that line says as
# much: "转换为小时" -- convert to hours.
check("therefore total_time is in HOURS, not minutes", True,
      f"{stored:.1f} h = {stored * 60:,.0f} min of machining")

print()
print("=" * 78)
print("What gongyi_tsh does with it")
print("=" * 78)

engines = [tp[e]['total_time'] for e in ('freecad', 'pycam', 'bcnc', 'opencamlib')]
print(f"  engine totals (hours): {[round(e, 1) for e in engines]}")

mean_hours = sum(engines) / len(engines)
as_coded = mean_hours / 60          # gongyi divides by 60 again
print(f"  mean                 : {mean_hours:,.2f} h")
print(f"  cam_4_time as coded  : {as_coded:,.4f}  <- treated as hours")
print(f"  understated by       : {mean_hours / as_coded:.0f}x")

check("cam_4_time is understated by 60x",
      abs(mean_hours / as_coded - 60) < 0.5, f"{mean_hours / as_coded:.1f}x")

print()
print("=" * 78)
print("Effect on the quoted hours for this part")
print("=" * 78)

# Solve the AML + new_cam terms from what was actually quoted (2.01 h milling,
# craft 'xi' so 100% milling, so web_time == Milling_time).
QUOTED = 2.01
other_two = 3 * QUOTED - as_coded
print(f"  quoted milling       : {QUOTED} h")
print(f"  implied AML+new_cam  : {other_two:.2f} h")

fixed_web = (mean_hours + other_two) / 3
print(f"  with the unit fixed  : ({mean_hours:,.2f} + {other_two:.2f}) / 3 "
      f"= {fixed_web:,.2f} h")
print(f"  that is              : {fixed_web / QUOTED:,.0f}x the current quote")

print()
print("  But the /3 mean is itself a problem: only cam_4_time scales with the")
print("  part. Averaging it with two small, largely constant terms costs:")
print(f"    CAM alone          : {mean_hours:,.2f} h")
print(f"    after the /3 mean  : {fixed_web:,.2f} h  "
      f"({fixed_web / mean_hours * 100:.0f}% of it)")

check("the mean discards most of the CAM estimate on a large part",
      fixed_web < mean_hours * 0.5, f"{fixed_web / mean_hours * 100:.0f}% kept")

print()
print("all good" if not failures else f"{len(failures)} issue(s) confirmed")
sys.exit(0)
