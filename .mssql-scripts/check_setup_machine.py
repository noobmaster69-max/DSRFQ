"""The setup line is charged at the machine that does the work.

Lifts _machine_for out of handlers.py and checks the mapping, including the
turn-only and nothing-matched cases.

    python .mssql-scripts/check_setup_machine.py
"""

import ast
import sys

HANDLERS = r"C:\Aizera\RPA\RFQ\handlers.py"

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


src = open(HANDLERS, encoding="utf-8").read()
tree = ast.parse(src)

fn = None
for node in ast.walk(tree):
    if isinstance(node, ast.FunctionDef) and node.name == "_machine_for":
        fn = node
        break
check("_machine_for was found", fn is not None)


def build(mill, turn):
    ns = {"_mill": mill, "_turn": turn}
    exec(compile(ast.Module(body=[fn], type_ignores=[]), HANDLERS, "exec"), ns)
    return ns["_machine_for"]


MILL = {"id": 7, "name": "HWACHEON L3"}
TURN = {"id": 3, "name": "DOOSAN PUMA"}

print("\n--- a milled part ---")
f = build(MILL, TURN)
for line, expect in [("Milling Roughing", MILL), ("Milling Finishing", MILL),
                     ("Turning", TURN), ("Setup & Clamping", MILL),
                     ("Material Cost", {"id": None, "name": None})]:
    got_id, got_name = f(line)
    print(f"  {line:<24} -> {got_name or '(none)'}")
    check(f"{line} maps to the right machine",
          got_id == expect["id"], f"{got_id} vs {expect['id']}")

print("\n--- a turned part (no milling machine) ---")
f = build({}, TURN)
got_id, got_name = f("Setup & Clamping")
print(f"  Setup & Clamping         -> {got_name or '(none)'}")
check("setup falls back to the turning machine", got_id == 3, str(got_id))

print("\n--- nothing matched ---")
f = build({}, {})
got_id, _ = f("Setup & Clamping")
check("setup gets no machine when there is none", got_id is None, str(got_id))

# _machine_rate returns None for a falsy id, which leaves new_tsh's own rate in
# place rather than zeroing the line.
print("\n--- the rate then follows ---")
print("  a machine id means _machine_rate(id) replaces the flat default;")
print("  no machine id means the line keeps what new_tsh sent.")

print()
print("all good" if not failures else f"{len(failures)} failure(s): "
      + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
