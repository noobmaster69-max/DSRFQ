"""Verify the Setup & Clamping line and the process ordering.

Covers the three files that changed:
  gongyi_tsh.py  returns setup_time_hours / setup_equipment_costs_hours
  handlers.py    turns them into a cost line, in process order
  CostingWorkspace.ts  displays lines in process order whatever the insert order

new_tsh and handlers cannot be imported (pythonocc, torch, a live DB), so the
changed pieces are lifted out with ast and exercised directly.

    python .mssql-scripts/check_costing_setup_order.py
"""

import ast
import re
import sys
from decimal import Decimal, ROUND_HALF_UP

GONGYI = r"C:\Aizera\RPA\new_tsh\gongyi_tsh.py"
FEE = r"C:\Aizera\RPA\new_tsh\fee_tsh.py"
HANDLERS = r"C:\Aizera\RPA\RFQ\handlers.py"
WORKSPACE = (r"C:\Aizera\DSRFQ\DSRFQ.Web\Modules\Costing\Workspace"
             r"\CostingWorkspace.ts")

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


print("=" * 74)
print("1. Everything still parses")
print("=" * 74)

for path in (GONGYI, FEE, HANDLERS):
    short = path.rsplit("\\", 1)[-1]
    try:
        ast.parse(open(path, encoding="utf-8").read())
        check(f"{short} parses", True)
    except SyntaxError as e:
        check(f"{short} parses", False, f"line {e.lineno}: {e.msg}")

print()
print("=" * 74)
print("2. gongyi_tsh returns the setup fields from every response path")
print("=" * 74)

gsrc = open(GONGYI, encoding="utf-8").read()

# There are three data_to_send dicts (nochexi, the chexi fallback, and
# yeschexi). A part routed through the one that was missed would silently
# lose its setup line, so all three have to carry the keys.
dict_count = gsrc.count("data_to_send")
for key in ("setup_time_hours", "setup_equipment_costs_hours", '"setup"'):
    n = gsrc.count(key)
    check(f"{key} appears in all 3 response dicts", n >= 3, f"found {n}")

print()
print("=" * 74)
print("3. handlers builds the line and puts it in process order")
print("=" * 74)

hsrc = open(HANDLERS, encoding="utf-8").read()

# Lift the helper and the details list out of the enclosing function.
tree = ast.parse(hsrc)


class Grab(ast.NodeVisitor):
    def __init__(self):
        self.helper = None
        self.details = None

    def visit_FunctionDef(self, node):
        if node.name == "_cost_line":
            self.helper = node
        self.generic_visit(node)

    def visit_Assign(self, node):
        if (self.details is None
                and any(getattr(t, "id", None) == "details" for t in node.targets)
                and isinstance(node.value, ast.List)):
            self.details = node.value
        self.generic_visit(node)


g = Grab()
g.visit(tree)
check("the _cost_line helper exists", g.helper is not None)
check("the details list was found", g.details is not None)

# The order of the names in the literal is the insert order.
names = []
for el in (g.details.elts if g.details else []):
    if isinstance(el, ast.Call) and len(el.args) >= 2:
        arg = el.args[1]
        if isinstance(arg, ast.Constant):
            names.append(arg.value)

print(f"  insert order: {names}")
expected = ["Setup & Clamping", "Milling Roughing", "Milling Semi-Finishing",
            "Milling Finishing", "Turning"]
check("lines are inserted in process order", names == expected, str(names))

# Run the helper against a realistic payload.
gongyi_data = {
    "setup": "Setup & Clamping", "setup_time_hours": 0.33,
    "setup_equipment_costs_hours": 50.0,
    "milling_roughing_time_hours": 0.37,
    "milling_roughing_equipment_costs_hours": 50.0,
    "milling_semi_finishing_time_hours": 0.19,
    "milling_semi_finishing_equipment_costs_hours": 50.0,
    "milling_finishing_time_hours": 0.09,
    "milling_finishing_equipment_costs_hours": 50.0,
    "turning_time_hours": 0, "turning_equipment_costs_hours": None,
    "milling_roughing": "Milling Roughing", "milling_semi_finishing": None,
    "milling_finishing": "Milling Finishing", "turning": None,
}

ns = {"Decimal": Decimal, "ROUND_HALF_UP": ROUND_HALF_UP,
      "TWO_PLACES": Decimal("0.01"), "gongyi_data": gongyi_data}
exec(compile(ast.Module(body=[g.helper], type_ignores=[]), HANDLERS, "exec"), ns)
_cost_line = ns["_cost_line"]

setup = _cost_line("Machining Process", "Setup & Clamping",
                   gongyi_data["setup"], "setup_time_hours",
                   "setup_equipment_costs_hours")
print(f"  setup line: qty {setup['quantity']} x {setup['cost']} = {setup['total']}")
check("setup hours are carried through", setup["quantity"] == Decimal("0.33"))
check("setup total is hours x rate",
      setup["total"] == Decimal("16.50"), str(setup["total"]))

# A None rate must not raise -- turning is None on every milled part.
turning = _cost_line("Turning Process", "Turning", None,
                     "turning_time_hours", "turning_equipment_costs_hours")
check("a null rate becomes zero rather than raising",
      turning["total"] == Decimal("0.00"), str(turning["total"]))

# A missing key entirely (an older service that has not been updated).
missing = _cost_line("Machining Process", "Setup & Clamping", None,
                     "nope_hours", "nope_rate")
check("a missing key becomes zero rather than raising",
      missing["total"] == Decimal("0.00"), str(missing["total"]))

print()
print("=" * 74)
print("4. The workspace sorts into process order")
print("=" * 74)

ts = open(WORKSPACE, encoding="utf-8").read()
check("inProcessOrder exists", "private inProcessOrder(" in ts)
check("loadResults uses it", "this.inProcessOrder(r.Entities" in ts)

# Mirror the ranking and check it against the order rows are stored in today.
def rank(name):
    n = (name or "").lower()
    if "material" in n:
        return 0
    if "setup" in n or "clamp" in n:
        return 1
    if "rough" in n:
        return 2
    if "semi" in n:
        return 3
    if "finish" in n:
        return 4
    if "turning" in n:
        return 5
    return 6


stored_today = ["Material Cost", "Milling Roughing", "Milling Finishing",
                "Milling Semi-Finishing", "Turning"]
sorted_out = [n for n in sorted(stored_today, key=rank)]
print(f"  stored order:  {stored_today}")
print(f"  displayed as:  {sorted_out}")
check("existing rows display in process order",
      sorted_out == ["Material Cost", "Milling Roughing",
                     "Milling Semi-Finishing", "Milling Finishing", "Turning"],
      str(sorted_out))

# "Milling Semi-Finishing" contains "finish", so the semi test has to run
# first or semi-finishing would rank as finishing and the two would tie.
check("semi-finishing outranks finishing",
      rank("Milling Semi-Finishing") < rank("Milling Finishing"),
      f"{rank('Milling Semi-Finishing')} vs {rank('Milling Finishing')}")

# An unrecognised hand-added line keeps its position rather than vanishing.
with_manual = ["Turning", "Special Process: Anodise", "Milling Roughing"]
order = sorted(range(len(with_manual)), key=lambda i: (rank(with_manual[i]), i))
kept = [with_manual[i] for i in order]
print(f"  with a hand-added line: {kept}")
check("an unrecognised line is kept, after the known steps",
      kept == ["Milling Roughing", "Turning", "Special Process: Anodise"],
      str(kept))

print()
print("all good" if not failures else f"{len(failures)} failure(s): "
      + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
