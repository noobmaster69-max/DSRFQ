"""Does _write_special_processes actually insert rows?

The extraction tests so far called mbd/notes_ocr directly and never touched the
database, so "0 rows" could mean either "nothing has run" or "the write is
broken". This runs the real function against the real table for part 15, then
rolls back.

Note: the function commits internally, so the rollback here cannot undo it --
the script deletes what it inserted instead.
"""

import ast
import os
import sys
import types

import pyodbc
import yaml

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import mbd
import notes_ocr

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 15
UP = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing"

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


before = cur.execute(
    "SELECT COUNT(*) FROM dbo.CostingPartSpecialProcessResults "
    "WHERE CostingPartID = ? AND IsActive = 1", PART).fetchval()
print(f"part {PART}: {before} active row(s) before\n")

# Lift the real function out of handlers.py -- importing handlers pulls in
# torch, transformers and a database connection at module scope.
src = open(r"C:\Aizera\RPA\RFQ\handlers.py", encoding="utf-8").read()
tree = ast.parse(src)
fn = next(n for n in tree.body
          if isinstance(n, ast.FunctionDef) and n.name == "_write_special_processes")
mod = types.ModuleType("probe")
mod.__dict__.update({"INSERT_USER_ID": 1, "GREEN": "", "RED": "", "YELLOW": "",
                     "RESET": "", "notes_ocr": notes_ocr})
exec(compile(ast.Module(body=[fn], type_ignores=[]), "handlers.py", "exec"),
     mod.__dict__)

folder = os.path.join(UP, str(PART))
pdf = next(os.path.join(folder, f) for f in os.listdir(folder)
           if f.lower().endswith(".pdf"))
data = open(pdf, "rb").read()
notes = (mbd.extract(data) or {}).get("notes")
print(f"mbd notes passed in: {len(notes or [])}")

mod._write_special_processes(cur, PART, data, mbd_notes=notes)

rows = cur.execute(
    "SELECT SpecialProcessName, IsManual FROM dbo.CostingPartSpecialProcessResults "
    "WHERE CostingPartID = ? AND IsActive = 1 ORDER BY ID", PART).fetchall()
print(f"\n{len(rows)} active row(s) after:")
for r in rows:
    print(f"  manual={r.IsManual}  {r.SpecialProcessName[:88]}")

# One row, not four: PACKAGE, COSMETIC and IDENTIFY are verifiable by
# inspecting the finished part, so they are not special processes under
# AS9100D 8.5.1.2 and must not be stored as such.
check("one row inserted", len(rows) == 1, f"got {len(rows)}")
check("CLEAN stored", any("CLEAN" in r.SpecialProcessName for r in rows))
for word in ("COSMETIC", "IDENTIFY", "PACKAGE"):
    check(f"{word} not stored",
          not any(word in r.SpecialProcessName for r in rows))

# Re-run must replace, not duplicate.
mod._write_special_processes(cur, PART, data, mbd_notes=notes)
again = cur.execute(
    "SELECT COUNT(*) FROM dbo.CostingPartSpecialProcessResults "
    "WHERE CostingPartID = ? AND IsActive = 1", PART).fetchval()
check("re-run replaces rather than duplicates", again == len(rows), f"{again}")

# Clean up: the function commits, so a rollback would not undo it.
cur.execute("DELETE FROM dbo.CostingPartSpecialProcessResults "
            "WHERE CostingPartID = ?", PART)
cur.commit()
left = cur.execute("SELECT COUNT(*) FROM dbo.CostingPartSpecialProcessResults "
                   "WHERE CostingPartID = ?", PART).fetchval()
print(f"\ncleaned up, {left} row(s) left for part {PART}")
conn.close()

print()
print("all good" if not failures else f"{len(failures)} failure(s)")
sys.exit(1 if failures else 0)
