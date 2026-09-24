"""Re-running the drawing clears the previous special processes.

Two halves have to agree:

  DSRFQ    RerunStage.Drawing clears them (they are the drawing stage's output)
           and RerunStage.Costing no longer does (it never writes them back)
  consumer _write_special_processes clears before its "found none" return, so a
           revision that drops a callout does not keep showing the old one

    python .mssql-scripts/check_sp_rerun_clears.py
"""

import ast
import os
import re
import sys
import types

import pyodbc
import yaml

ENDPOINT = (r"C:\Aizera\DSRFQ\DSRFQ.Web\Modules\Costing\CostingParts"
            r"\CostingPartsEndpoint.cs")
HANDLERS = r"C:\Aizera\RPA\RFQ\handlers.py"
PART = 15
UP = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing"

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


print("=" * 74)
print("1. ClearPreviousOutput maps the table to the stage that writes it")
print("=" * 74)

cs = open(ENDPOINT, encoding="utf-8").read()
body = cs[cs.index("private static void ClearPreviousOutput"):]
body = body[:body.index("private static void Deactivate")]

def arm(stage):
    i = body.index(f"case RerunStage.{stage}:")
    j = body.index("break;", i)
    return body[i:j]

drawing, costing = arm("Drawing"), arm("Costing")

check("the drawing re-run clears special processes",
      "CostingPartSpecialProcessResults" in drawing)
check("the costing re-run no longer clears them",
      "CostingPartSpecialProcessResults" not in costing)
check("the costing re-run still clears costing results",
      "CostingPartCostingResults" in costing)
check("the clear preserves hand-added rows",
      "DeactivateMachineRead" in drawing and "IsManual = 0" in cs)

print()
print("=" * 74)
print("2. The consumer clears before its 'found none' return")
print("=" * 74)

src = open(HANDLERS, encoding="utf-8").read()
tree = ast.parse(src)
fn = next(n for n in tree.body
          if isinstance(n, ast.FunctionDef) and n.name == "_write_special_processes")
seg = ast.get_source_segment(src, fn)

clear_at = seg.index("SET IsActive = 0")
none_at = seg.index("if not processes:")
check("the clear runs before the empty-result return", clear_at < none_at,
      f"clear@{clear_at} return@{none_at}")

# The returns that mean "could not read" must NOT clear.
head = seg[:clear_at]
check("the unreadable-drawing returns do not clear",
      head.count("return") >= 4 and "SET IsActive = 0" not in head,
      f"{head.count('return')} early return(s) before the clear")

print()
print("=" * 74)
print("3. Behaviour against the real table")
print("=" * 74)

with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)
d = cfg["Database"]
conn = pyodbc.connect("DRIVER={" + d["Driver"] + "};"
                      f"SERVER={d['Server']};DATABASE={d['Database']};"
                      f"UID={d['Uid']};PWD={d['Pwd']}")
cur = conn.cursor()

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import mbd
import notes_ocr

mod = types.ModuleType("probe")
mod.__dict__.update({"INSERT_USER_ID": 1, "GREEN": "", "RED": "", "YELLOW": "",
                     "RESET": "", "notes_ocr": notes_ocr})
exec(compile(ast.Module(body=[fn], type_ignores=[]), HANDLERS, "exec"), mod.__dict__)

folder = os.path.join(UP, str(PART))
pdf = next(os.path.join(folder, f) for f in os.listdir(folder)
           if f.lower().endswith(".pdf"))
data = open(pdf, "rb").read()
notes = (mbd.extract(data) or {}).get("notes")

before = cur.execute("SELECT COUNT(*) FROM dbo.CostingPartSpecialProcessResults "
                     "WHERE CostingPartID = ? AND IsActive = 1", PART).fetchval()
print(f"  part {PART}: {before} active row(s) before")

# A hand-added row that must survive everything below.
cur.execute("INSERT INTO dbo.CostingPartSpecialProcessResults "
            "(CostingPartID, SpecialProcessName, IsManual, InsertDate, "
            " InsertUserId, IsActive) VALUES (?, ?, 1, GETDATE(), 1, 1)",
            PART, "HAND-ADDED anodise per operator")
cur.commit()

mod._write_special_processes(cur, PART, data, mbd_notes=notes)
rows = cur.execute(
    "SELECT SpecialProcessName, IsManual FROM dbo.CostingPartSpecialProcessResults "
    "WHERE CostingPartID = ? AND IsActive = 1 ORDER BY ID", PART).fetchall()
print(f"  after a run that finds one: {len(rows)} row(s)")
for r in rows:
    print(f"    manual={r.IsManual}  {r.SpecialProcessName[:70]}")
check("the machine-read process was written",
      any(r.IsManual == 0 and "CLEAN" in r.SpecialProcessName for r in rows))
check("the hand-added row survived",
      any(r.IsManual == 1 for r in rows))

# Run again with notes that name nothing: the CLEAN row must go, the hand-added
# row must stay. This is the case that used to leave stale rows behind.
mod._write_special_processes(cur, PART, data,
                             mbd_notes=["1. ALL DIMENSIONS IN INCHES."])
rows = cur.execute(
    "SELECT SpecialProcessName, IsManual FROM dbo.CostingPartSpecialProcessResults "
    "WHERE CostingPartID = ? AND IsActive = 1 ORDER BY ID", PART).fetchall()
print(f"  after a run that finds none: {len(rows)} row(s)")
for r in rows:
    print(f"    manual={r.IsManual}  {r.SpecialProcessName[:70]}")
check("the stale machine-read row was cleared",
      not any(r.IsManual == 0 for r in rows), f"{len(rows)} left")
check("the hand-added row still survived",
      any(r.IsManual == 1 for r in rows))

# An unreadable drawing must NOT clear.
mod._write_special_processes(cur, PART, data, mbd_notes=notes)   # put one back
mod._write_special_processes(cur, PART, None)                     # no pdf bytes
rows = cur.execute("SELECT COUNT(*) FROM dbo.CostingPartSpecialProcessResults "
                   "WHERE CostingPartID = ? AND IsActive = 1 AND IsManual = 0",
                   PART).fetchval()
check("an unreadable drawing leaves the rows alone", rows > 0, f"{rows}")

# --- clean up ------------------------------------------------------------
cur.execute("DELETE FROM dbo.CostingPartSpecialProcessResults WHERE CostingPartID = ?",
            PART)
cur.commit()
left = cur.execute("SELECT COUNT(*) FROM dbo.CostingPartSpecialProcessResults "
                   "WHERE CostingPartID = ?", PART).fetchval()
print(f"\n  cleaned up, {left} row(s) left for part {PART}")
check("cleanup left nothing behind", left == 0, str(left))
conn.close()

print()
print("all good" if not failures else f"{len(failures)} failure(s): "
      + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
