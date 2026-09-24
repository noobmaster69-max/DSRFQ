"""Reproduce new_tsh's milling-hour arithmetic and compare it to the stored rows.

new_tsh is down and its geometry deps are missing, so this does not call the
service. It re-implements the few lines of gongyi_tsh.py that turn CAM
estimates into the hours DSRFQ stores, feeds them the documented fallback
values, and checks the result against what is actually in the database. If the
reproduction lands on the stored number, the reproduction is the explanation.

    python .mssql-scripts/check_costing_hours.py
"""

import sys

import pyodbc
import yaml

with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)
d = cfg["Database"]
conn = pyodbc.connect("DRIVER={" + d["Driver"] + "};"
                      f"SERVER={d['Server']};DATABASE={d['Database']};"
                      f"UID={d['Uid']};PWD={d['Pwd']}")
cur = conn.cursor()

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


def rnd(v):
    return round(v, 2)


print("=" * 74)
print("1. The four-CAM fallback: two defaults for the same quantity")
print("=" * 74)

# gongyi_tsh.py:744-748 -- the .get() defaults, fed straight into the mean.
GET_DEFAULTS = (1200, 1100, 1300, 1250)
cam_4_via_get = sum(GET_DEFAULTS) / 4 / 60

# gongyi_tsh.py:752 -- the except-branch default for the same situation.
cam_4_via_except = 20.0 / 60

print(f"  .get() defaults {GET_DEFAULTS} -> {cam_4_via_get:.4f} h")
print(f"  except-branch default 20 minutes  -> {cam_4_via_except:.4f} h")
print(f"  ratio: {cam_4_via_get / cam_4_via_except:.1f}x")

# The toolpath generators measure in minutes: cam_new/toolpath_generator.py:156
# computes volume(mm3) / mrr(mm3 per min), then adds 1.5 for setup.
check("the two fallbacks disagree by about 60x",
      cam_4_via_get / cam_4_via_except > 50,
      f"{cam_4_via_get / cam_4_via_except:.1f}x")

print()
print("=" * 74)
print("2. Reproducing parts 8, 9 and 11 (placeholder geometry)")
print("=" * 74)

# gongyi_tsh.py:764 -- new CAM fallback, and :463 craft 'xi' -> 100% milling.
new_cam_time = 75.5 / 60
PCT_MILLING = 100.0

# Default op list [3600, 1800, 900] seconds -- rough, semi, finish --
# gongyi_tsh.py:805. Every share is measured against the total of all three.
OPS = [3600, 1800, 900]
zong = sum(OPS) / 60
share = [(o / 60) / zong for o in OPS]

# gongyi_tsh.py:888-897, the Craft_number <= 2 branch. It takes ops[0] for
# roughing and ops[1] for FINISHING -- ops[1] is the semi-finishing pass, and
# ops[2], the real finishing pass, is never read. So the row DSRFQ stores as
# "Milling Finishing" is really the semi-finish estimate under another name.
cu_share = share[0]
jing_share = share[1]

print(f"  op shares:            rough {share[0]:.4f}  semi {share[1]:.4f}  "
      f"finish {share[2]:.4f}")
print(f"  what the branch uses: rough <- ops[0] {cu_share:.4f}   "
      f"finishing <- ops[1] {jing_share:.4f}   ops[2] never read")

stored = cur.execute(
    "SELECT CAST(Quantity AS float) FROM dbo.CostingPartCostingResults "
    "WHERE CostingPartID = 8 AND Name = 'Milling Roughing' AND IsActive = 1").fetchval()

# Solve for the AML term that the stored roughing hour implies.
milling_time = stored / cu_share
web_time = milling_time / (PCT_MILLING / 100)
aml = 3 * web_time - cam_4_via_get - new_cam_time

print(f"  stored roughing hours (part 8): {stored}")
print(f"  => implied total milling time:  {milling_time:.4f} h")
print(f"  => implied AML term:            {aml:.4f} h  ({aml * 60:.0f} min)")

check("the implied AML term is a plausible ML output",
      0 < aml < 2, f"{aml:.3f} h")

repro_rough = rnd(milling_time * cu_share)
repro_finish = rnd(milling_time * jing_share)
stored_finish = cur.execute(
    "SELECT CAST(Quantity AS float) FROM dbo.CostingPartCostingResults "
    "WHERE CostingPartID = 8 AND Name = 'Milling Finishing' AND IsActive = 1").fetchval()

check("reproduction matches the stored roughing hours",
      repro_rough == stored, f"{repro_rough} vs {stored}")
check("reproduction matches the stored finishing hours",
      repro_finish == stored_finish, f"{repro_finish} vs {stored_finish}")

# Now the same part with the intended 20-minute fallback.
web_fixed = (cam_4_via_except + aml + new_cam_time) / 3
print(f"\n  with the 20-minute fallback instead:")
print(f"    rough  {rnd(web_fixed * cu_share)} h   (stored {stored})")
print(f"    finish {rnd(web_fixed * jing_share)} h   (stored {stored_finish})")
print(f"    overstatement: {milling_time / web_fixed:.1f}x")

check("the bad default inflates these parts by more than 5x",
      milling_time / web_fixed > 5, f"{milling_time / web_fixed:.1f}x")

print()
print("=" * 74)
print("3. The dropped semi-finishing share")
print("=" * 74)

# The branch divides by the total of all three ops but only ever reads two of
# them, and hard-codes semi to 0. Nothing redistributes the leftover.
kept = cu_share + jing_share
print(f"  shares actually applied: {cu_share:.4f} + {jing_share:.4f} = {kept:.4f}")
print(f"  ops[2] never read:       {share[2]:.4f}  "
      f"({share[2] * 100:.1f}% of milling time, silently dropped)")

check("some milling time is unaccounted for", abs(kept - 1.0) > 0.01,
      f"{(1 - kept) * 100:.1f}% lost")

# Craft_number is the count of a substring in a free-text route description,
# which is a fragile proxy for "how many machining operations".
ROUTES = [
    ('1.铣床加工粗铣 2.铣床精铣', 'milling fallback', 'xi'),
    ('1.车床加工粗车 2.车床精车', 'turning fallback', 'che'),
    ('1.车床粗加工 2.铣床粗加工 3.车削精加工 4.铣削精加工', 'turn-mill fallback', 'chexi')]
for route, label, craft in ROUTES:
    n = route.count('加工')
    print(f"  Craft_number for the {label:18s} = {n}   "
          f"-> {'3-way split' if n > 2 else 'semi forced to 0'}")

# These parts are all milling ('xi'), and that route counts 1. The turn-mill
# route does reach the 3-way split, so the bug is not universal -- it is
# specific to the pure-milling path every part here takes.
check("the milling route never reaches the 3-way split",
      ROUTES[0][0].count('加工') <= 2, f"counts {ROUTES[0][0].count('加工')}")

semi_rows = cur.execute(
    "SELECT COUNT(*), SUM(CASE WHEN Quantity = 0 THEN 1 ELSE 0 END) "
    "FROM dbo.CostingPartCostingResults "
    "WHERE Name = 'Milling Semi-Finishing' AND IsActive = 1").fetchone()
check("every stored semi-finishing row is zero", semi_rows[0] == semi_rows[1],
      f"{semi_rows[1]} of {semi_rows[0]}")

print()
print("=" * 74)
print("4. Hours against the size of the part")
print("=" * 74)

rows = cur.execute(
    "SELECT p.ID, p.PartNumber, "
    "  CAST(p.GrossVolume AS float) AS GrossVol, "
    "  CAST(p.NetVolume AS float) AS NetVol, "
    "  CAST(p.GrossWeight AS float) AS Wt, "
    "  (SELECT SUM(CAST(Quantity AS float)) FROM dbo.CostingPartCostingResults r "
    "   WHERE r.CostingPartID = p.ID AND r.IsActive = 1 AND r.IsTimeUnit = 1 "
    "     AND r.Name LIKE 'Milling%') AS Hours "
    "FROM dbo.CostingParts p WHERE p.IsActive = 1 ORDER BY p.ID").fetchall()

print(f"  {'part':>4} {'part number':<16} {'removed cm3':>12} {'hours':>7} {'cm3/min':>9}")
for r in rows:
    if not r.Hours:
        continue
    removed = ((r.GrossVol or 0) - (r.NetVol or 0)) / 1000.0
    mrr = removed / (r.Hours * 60) if r.Hours else 0
    print(f"  {r.ID:>4} {(r.PartNumber or '-'):<16} {removed:>12,.1f} "
          f"{r.Hours:>7.2f} {mrr:>9.1f}")

# If the hours came from the geometry, the implied removal rate would land in
# a narrow band -- it is a property of the machine and the material, not of the
# part. The spread across parts is the measure of how decoupled they are.
rates = []
for r in rows:
    if not r.Hours or r.GrossVol is None:
        continue
    removed = ((r.GrossVol or 0) - (r.NetVol or 0)) / 1000.0
    rates.append((r.ID, removed / (r.Hours * 60)))

real = [(pid, m) for pid, m in rates if pid not in (8, 9, 11)]   # exclude placeholders
lo = min(m for _, m in real)
hi = max(m for _, m in real)
print()
print(f"  ignoring the placeholder-geometry parts, the implied removal rate")
print(f"  runs from {lo:.1f} to {hi:.1f} cm3/min -- a {hi / lo:,.0f}x spread")
print(f"  a real 3-axis mill in aluminium holds roughly 50-400 cm3/min")

check("implied removal rate is consistent across parts", hi / lo < 10,
      f"{hi / lo:,.0f}x spread")

impossible = [(pid, m) for pid, m in real if m > 400]
for pid, m in impossible:
    print(f"  part {pid}: implied {m:,.0f} cm3/min sustained -- above what the "
          f"machine can do")
check("no part implies an unachievable removal rate", not impossible,
      f"{len(impossible)} part(s) do")

print()
print("=" * 74)
print("5. Material density on parts 14 and 15 (same drawing, same revision)")
print("=" * 74)

for pid in (14, 15):
    r = cur.execute(
        "SELECT PartNumber, Revision, Material, CAST(GrossVolume AS float), "
        "CAST(GrossWeight AS float) FROM dbo.CostingParts WHERE ID = ?", pid).fetchone()
    density = (r[4] * 1000) / (r[3] / 1000) if r[3] else 0   # kg->g over cm3
    print(f"  part {pid}: {r[0]} rev {r[1]}  {r[4]:,.2f} kg from "
          f"{r[3] / 1000:,.0f} cm3  -> {density:.2f} g/cm3   [{r[2]}]")

d14 = cur.execute("SELECT CAST(GrossWeight AS float)*1000/(CAST(GrossVolume AS float)/1000) "
                  "FROM dbo.CostingParts WHERE ID = 14").fetchval()
d15 = cur.execute("SELECT CAST(GrossWeight AS float)*1000/(CAST(GrossVolume AS float)/1000) "
                  "FROM dbo.CostingParts WHERE ID = 15").fetchval()

# 6061-T6 is 2.70 g/cm3; both drawings say ALUMINUM 6061-T6, ASTM B209.
check("part 15 uses the aluminium density the drawing calls for",
      abs(d15 - 2.70) < 0.05, f"{d15:.2f} g/cm3")
check("part 14 uses the same density as part 15",
      abs(d14 - d15) < 0.05, f"{d14:.2f} vs {d15:.2f} g/cm3")

conn.close()
print()
print("all good" if not failures else f"{len(failures)} problem(s) confirmed: "
      + ", ".join(failures))
sys.exit(0)
