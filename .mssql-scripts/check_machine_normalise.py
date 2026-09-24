"""Checks _normalise_machine handles both shapes new_tsh returns.

The flat shape is what the running service actually sent for part 10; the
nested one is what the current gongyi_tsh source produces. Both have to yield
per-line machine ids, because the failure mode is silent -- the part-level name
survives either way, so a regression here looks like success.

Imports the function by source rather than importing handlers (which pulls in
torch, transformers and a database connection).
"""

import ast
import sys
import types

SRC = r"C:\Aizera\RPA\RFQ\handlers.py"

tree = ast.parse(open(SRC, encoding="utf-8").read())
fn = next((n for n in tree.body
           if isinstance(n, ast.FunctionDef) and n.name == "_normalise_machine"), None)
if fn is None:
    sys.exit("_normalise_machine not found in handlers.py")

mod = types.ModuleType("probe")
exec(compile(ast.Module(body=[fn], type_ignores=[]), SRC, "exec"), mod.__dict__)
normalise = mod._normalise_machine

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


# Exactly what the live service returned for part 10.
flat_one = {"matched": True, "machine_id": 1, "axis_number": "3", "hourly_rate": None,
            "supplier_id": 2, "machine_id_2": None,
            "machine_name": "MAKINO A61NX-5XR 3-axis 720x650x800"}
out = normalise(flat_one)
check("flat/one: milling id", (out.get("milling") or {}).get("id") == 1,
      repr(out.get("milling")))
check("flat/one: turning also set (one machine priced every line)",
      (out.get("turning") or {}).get("id") == 1)
check("flat/one: name preserved",
      (out.get("milling") or {}).get("name") == flat_one["machine_name"])
check("flat/one: supplier preserved", out.get("supplier_id") == 2)

# Turn-mill: two machines.
flat_two = dict(flat_one, machine_id=1, machine_id_2=23)
out = normalise(flat_two)
check("flat/two: mill=1, turn=23",
      (out.get("milling") or {}).get("id") == 1
      and (out.get("turning") or {}).get("id") == 23,
      f"mill={out.get('milling')} turn={out.get('turning')}")

# The nested shape must pass through untouched.
nested = {"matched": True, "supplier_id": 2,
          "milling": {"id": 7, "name": "MAKINO F9", "axis": "3"},
          "turning": None, "machine_name": "MAKINO F9"}
out = normalise(nested)
check("nested: passes through", (out.get("milling") or {}).get("id") == 7
      and out.get("turning") is None)

# No machine matched: keep the block so the name is still recorded, no ids.
none_matched = {"matched": False, "supplier_id": None, "machine_id": None,
                "machine_id_2": None,
                "machine_name": "Default rates (no matching machine)"}
out = normalise(none_matched)
check("no match: no machine ids invented",
      not (out.get("milling") or {}).get("id")
      and not (out.get("turning") or {}).get("id"))
check("no match: name kept",
      out.get("machine_name") == "Default rates (no matching machine)")

check("empty block", normalise(None) == {} and normalise({}) == {})

# And the per-line routing handlers.py applies on top.
out = normalise(flat_two)
mill, turn = out.get("milling") or {}, out.get("turning") or {}


def machine_for(line_name):
    n = (line_name or "").lower()
    if "turning" in n:
        return turn.get("id"), turn.get("name")
    if "milling" in n:
        return mill.get("id"), mill.get("name")
    return None, None


check("line routing: Milling Roughing -> mill", machine_for("Milling Roughing")[0] == 1)
check("line routing: Turning -> turn", machine_for("Turning")[0] == 23)
check("line routing: Material Cost -> none", machine_for("Material Cost")[0] is None)

print()
print("all good" if not failures else f"{len(failures)} failure(s): {', '.join(failures)}")
sys.exit(1 if failures else 0)
