"""Verify the two costing fixes in gongyi_tsh.py / fee_tsh.py.

new_tsh cannot be imported here -- it pulls in pythonocc, torch and a database
connection at module scope -- so this lifts the two changed blocks out with
ast, runs them against synthetic inputs, and checks the arithmetic. Parsing the
real files is also what catches a syntax error in the edit.

    python .mssql-scripts/check_costing_fix.py
"""

import ast
import sys

GONGYI = r"C:\Aizera\RPA\new_tsh\gongyi_tsh.py"
FEE = r"C:\Aizera\RPA\new_tsh\fee_tsh.py"

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


print("=" * 74)
print("1. Both files still parse")
print("=" * 74)

for path in (GONGYI, FEE):
    try:
        ast.parse(open(path, encoding="utf-8").read())
        check(f"{path.rsplit(chr(92), 1)[-1]} parses", True)
    except SyntaxError as e:
        check(f"{path.rsplit(chr(92), 1)[-1]} parses", False, f"line {e.lineno}: {e.msg}")

print()
print("=" * 74)
print("2. The CAM fallback is now one value, in minutes")
print("=" * 74)

src = open(GONGYI, encoding="utf-8").read()
fee_src = open(FEE, encoding="utf-8").read()

for name, text in (("gongyi_tsh", src), ("fee_tsh", fee_src)):
    check(f"{name}: the 20-hour defaults are gone",
          "total_time', 1200" not in text and 'total_time", 1200' not in text)
    check(f"{name}: a single named fallback exists",
          "CAM_FALLBACK_MINUTES = 20.0" in text)


def cam_4_time(toolpaths, fallback_minutes=20.0):
    """The rewritten block, mirroring gongyi_tsh.py.

    No /60 on the success path: calculate_strategy_time already returns hours
    (see check_cam_units.py, which reproduces a stored value exactly). The
    fallback is quoted in minutes, so that one still converts.
    """
    toolpaths = toolpaths or {}
    cam_times = []
    for engine in ('freecad', 'pycam', 'bcnc', 'opencamlib'):
        t = (toolpaths.get(engine) or {}).get('total_time')
        if t is not None:
            cam_times.append(float(t))
    if cam_times:
        return sum(cam_times) / len(cam_times)
    return fallback_minutes / 60


missing = cam_4_time({})
print(f"\n  no toolpaths at all      -> {missing:.4f} h  ({missing * 60:.0f} min)")
check("a missing toolpath yields the 20-minute placeholder",
      abs(missing - 20.0 / 60) < 1e-9, f"{missing:.4f} h")

# Part 15's real engine totals, in hours.
real = {'freecad': {'total_time': 179.40}, 'pycam': {'total_time': 320.33},
        'bcnc': {'total_time': 191.46}, 'opencamlib': {'total_time': 76.88}}
got = cam_4_time(real)
old = sum(e['total_time'] for e in real.values()) / 4 / 60
print(f"  part 15's real engines   -> {got:.2f} h   (old code: {old:.2f} h)")
check("hours are no longer divided by 60 a second time",
      abs(got - 192.0175) < 0.01, f"{got:.4f} h")
check("that is 60x what the old code produced",
      abs(got / old - 60) < 0.5, f"{got / old:.1f}x")

# The old code averaged over four slots regardless, so one missing engine
# dragged the mean toward that engine's bogus default.
partial = cam_4_time({'freecad': {'total_time': 30}, 'pycam': {'total_time': 34}})
check("a partial result averages only the engines that reported",
      abs(partial - 32.0) < 1e-9, f"{partial:.4f} h")

print()
print("=" * 74)
print("3. The milling split no longer drops or mislabels time")
print("=" * 74)


def split(times, milling_time, remarks=None):
    """The rewritten split, mirroring gongyi_tsh.py including the remark pairing."""
    times = list(times or [])
    remarks = list(remarks) if remarks else []
    while len(remarks) < max(3, len(times)):
        remarks.append("Operation")

    ops = [(float(t), str(r)) for t, r in zip(times, remarks) if t]
    op_times = [t for t, _ in ops]
    op_remarks = [r for _, r in ops]
    has_semi = len(ops) >= 3

    if has_semi:
        used = [op_times[0], op_times[1], sum(op_times[2:])]
        picked = [op_remarks[0], op_remarks[1], op_remarks[2]]
    elif len(ops) == 2:
        used = [op_times[0], 0.0, op_times[1]]
        picked = [op_remarks[0], None, op_remarks[1]]
    elif len(ops) == 1:
        used = [op_times[0], 0.0, 0.0]
        picked = [op_remarks[0], None, None]
    else:
        used = [0.0, 0.0, 0.0]
        picked = [None, None, None]

    denom = sum(used)
    if denom <= 0:
        return has_semi, 0.0, 0.0, 0.0, picked
    return (has_semi,
            round(milling_time * used[0] / denom, 2),
            round(milling_time * used[1] / denom, 2),
            round(milling_time * used[2] / denom, 2),
            picked)


MT = 7.28   # the total milling time parts 8/9/11 were built from

cases = [
    ("3 ops [3600,1800,900] (the default list)", [3600, 1800, 900]),
    ("2 ops [3600,1800]", [3600, 1800]),
    ("1 op  [3600]", [3600]),
    ("4 ops [3600,1800,900,600]", [3600, 1800, 900, 600]),
    ("no ops", []),
]

print(f"  {'case':<42} {'rough':>7} {'semi':>7} {'finish':>7} {'sum':>7}")
for label, ops in cases:
    has_semi, cu, semi, jing, _ = split(ops, MT)
    total = round(cu + semi + jing, 2)
    print(f"  {label:<42} {cu:>7.2f} {semi:>7.2f} {jing:>7.2f} {total:>7.2f}")

    if ops:
        check(f"{label}: no time is dropped", abs(total - MT) <= 0.02,
              f"{total} vs {MT}")

# Remarks must follow their own operation, and a short remark list must not
# cause zip to swallow the last operation's time.
_, _, _, _, picked = split([3600, 1800, 900], MT, ["Rough", "Semi", "Finish"])
check("remarks land on their own operation", picked == ["Rough", "Semi", "Finish"],
      str(picked))

_, cu4, semi4, jing4, _ = split([3600, 1800, 900, 600], MT, ["Rough", "Semi"])
check("a short remark list does not drop an operation's time",
      abs(round(cu4 + semi4 + jing4, 2) - MT) <= 0.02,
      f"{round(cu4 + semi4 + jing4, 2)} vs {MT}")

# A zero-duration operation drops out without shifting the remaining remarks.
_, _, _, _, picked0 = split([3600, 0, 900], MT, ["Rough", "Nothing", "Finish"])
check("a zero-time operation does not shift the remarks",
      picked0 == ["Rough", None, "Finish"], str(picked0))

# The old behaviour, for contrast.
old_cu = round(MT * (3600 / 60) / (6300 / 60), 2)
old_jing = round(MT * (1800 / 60) / (6300 / 60), 2)
print(f"\n  old code on the default list: rough {old_cu}, semi 0.00, "
      f"finish {old_jing} (sum {round(old_cu + old_jing, 2)}) -- "
      f"{MT - round(old_cu + old_jing, 2):.2f} h dropped")

has_semi, cu, semi, jing, _ = split([3600, 1800, 900], MT)
check("three operations now produce a non-zero semi-finishing row",
      semi > 0, f"{semi} h")
check("finishing is now the finishing pass, not the semi pass",
      jing != old_jing, f"{jing} vs the old {old_jing}")

has_semi2, _, semi2, _, _ = split([3600, 1800], MT)
check("two operations still produce no semi-finishing row",
      not has_semi2 and semi2 == 0, f"has_semi={has_semi2} semi={semi2}")

print()
print("=" * 74)
print("4. Combined effect on parts 8, 9 and 11")
print("=" * 74)

# Those parts had no toolpaths at all, so the unit fix does not reach them --
# they hit the fallback either way. Their geometry is the 1000 mm3 placeholder,
# so neither the old nor the new number describes a real part; they need
# re-costing with real geometry, at which point the fallback stops firing.
AML = 0.3733
NEW_CAM = 75.5 / 60

old_web = ((1200 + 1100 + 1300 + 1250) / 4 / 60 + AML + NEW_CAM) / 3
new_web = (20.0 / 60 + AML + NEW_CAM) / 3

ocu, osemi, ojing = 4.16, 0.0, 2.08                 # what is stored today
_, ncu, nsemi, njing, _ = split([3600, 1800, 900], new_web)

print(f"  stored today: rough {ocu}  semi {osemi}  finish {ojing}  "
      f"= {round(ocu + osemi + ojing, 2)} h")
print(f"  after fix:    rough {ncu}  semi {nsemi}  finish {njing}  "
      f"= {round(ncu + nsemi + njing, 2)} h")
print(f"  at $45/h: ${round((ocu + osemi + ojing) * 45, 2)} -> "
      f"${round((ncu + nsemi + njing) * 45, 2)}")

check("the quoted milling hours drop by roughly 10x",
      6 < (ocu + ojing) / (ncu + nsemi + njing) < 15,
      f"{(ocu + ojing) / (ncu + nsemi + njing):.1f}x")

print()
print("all good" if not failures else f"{len(failures)} failure(s): "
      + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
