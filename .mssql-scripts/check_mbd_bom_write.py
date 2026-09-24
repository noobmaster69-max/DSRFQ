"""Checks _write_mbd_bom actually stores what mbd.extract returns.

Exercises the real function against the real table, using a real assembly
drawing, then rolls back. The insert is the part that a syntax check cannot
cover -- column names, the Quantity cast, and the manual-row guard.
"""

import os
import sys

import pyodbc
import yaml

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import mbd

SAMPLE = (r"C:\Aizera\RPA\table-transformer\pdf"
          r"\0042-99944_02_Green_Standard_F2.pdf")
PART = 12          # any real part; everything is rolled back

with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)
d = cfg["Database"]
conn = pyodbc.connect("DRIVER={" + d["Driver"] + "};"
                      f"SERVER={d['Server']};DATABASE={d['Database']};"
                      f"UID={d['Uid']};PWD={d['Pwd']}", autocommit=False)
cur = conn.cursor()

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


data = mbd.extract(open(SAMPLE, "rb").read())
rows = data.get("bom") or []
check("extractor returned BOM rows", len(rows) >= 2, f"{len(rows)} rows")

# A hand-added row that must survive the rebuild.
cur.execute(
    "INSERT INTO dbo.CostingPartBomResults "
    "(CostingPartID, PartNumber, Description, Quantity, IsManual, "
    " InsertDate, InsertUserId, IsActive) "
    "VALUES (?, 'HAND-ADDED', 'typed by an operator', 1, 1, "
    " CURRENT_TIMESTAMP, 1, 1)", PART)

# Import the real writer rather than reimplementing it. handlers.py pulls in
# torch and a database at import time, so the function is lifted by source.
import ast
import types

src = open(r"C:\Aizera\RPA\RFQ\handlers.py", encoding="utf-8").read()
tree = ast.parse(src)
fn = next(n for n in tree.body
          if isinstance(n, ast.FunctionDef) and n.name == "_write_mbd_bom")
mod = types.ModuleType("probe")
mod.__dict__.update({"INSERT_USER_ID": 1, "GREEN": "", "RED": "", "RESET": ""})
exec(compile(ast.Module(body=[fn], type_ignores=[]), "handlers.py", "exec"),
     mod.__dict__)

mod._write_mbd_bom(cur, PART, rows)

got = cur.execute(
    "SELECT PartNumber, Description, Quantity, InternalEngineeringNumber, IsManual "
    "FROM dbo.CostingPartBomResults WHERE CostingPartID = ? AND IsActive = 1 "
    "ORDER BY IsManual, ID", PART).fetchall()

print("\nrows now active:")
for r in got:
    print(f"  manual={r.IsManual}  {str(r.PartNumber)[:22]:<24}"
          f"qty={str(r.Quantity):<8}{str(r.InternalEngineeringNumber)[:16]:<18}"
          f"{str(r.Description)[:40]}")

machine = [r for r in got if r.IsManual == 0]
manual = [r for r in got if r.IsManual == 1]
check("machine-read rows stored", len(machine) == len(rows),
      f"{len(machine)} of {len(rows)}")
check("hand-added row survived", len(manual) == 1, f"{len(manual)}")
check("quantity stored", all(r.Quantity is not None for r in machine))
check("engineering number stored",
      any(r.InternalEngineeringNumber for r in machine))

# Re-running must replace, not duplicate.
mod._write_mbd_bom(cur, PART, rows)
again = cur.execute(
    "SELECT COUNT(*) FROM dbo.CostingPartBomResults "
    "WHERE CostingPartID = ? AND IsActive = 1 AND IsManual = 0", PART).fetchval()
check("re-run replaces rather than duplicates", again == len(rows), f"{again}")

conn.rollback()
conn.close()
print("\nrolled back")
print("all good" if not failures else f"{len(failures)} failure(s)")
sys.exit(1 if failures else 0)
