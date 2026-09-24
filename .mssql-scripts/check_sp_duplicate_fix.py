"""The costing run no longer duplicates special processes, and can't wedge the lane.

Two defects, one block of code:

  duplicate  the costing handler re-INSERTed every special process it read, so
             one drawing run plus one costing run left two identical rows
  wedged     the INSERT went uncommitted until after calculate_sp_cost, and that
             call raised TypeError whenever the TSH portal was unreachable
             (E0101 swallows its errors and returns None). The handler died,
             the row rolled back, CostingStatusID stayed 2 (In Progress) and the
             queue slot was held until the 45-minute watchdog -- part 16.

Also cleans up the duplicate rows already in the database.

    python .mssql-scripts/check_sp_duplicate_fix.py [--fix]
"""

import ast
import sys

import pyodbc
import yaml

HANDLERS = r"C:\Aizera\RPA\RFQ\handlers.py"
FUNCTION = r"C:\Aizera\RPA\RFQ\function.py"
FIX = "--fix" in sys.argv

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


print("=" * 74)
print("1. The costing handler no longer re-inserts what it read")
print("=" * 74)

src = open(HANDLERS, encoding="utf-8").read()
for path in (HANDLERS, FUNCTION):
    try:
        ast.parse(open(path, encoding="utf-8").read())
        check(f"{path.rsplit(chr(92), 1)[-1]} parses", True)
    except SyntaxError as e:
        check(f"{path.rsplit(chr(92), 1)[-1]} parses", False, f"line {e.lineno}: {e.msg}")

# The pricing loop reads sp_items then prices them; it must not INSERT.
i = src.index("sp_items = cursor.fetchall()")
j = src.index("update_query = f\"UPDATE dbo.CostingParts SET CostingStatusID = 3", i)
loop = src[i:j]

check("the pricing loop contains no INSERT into the special-process table",
      "INSERT INTO dbo.CostingPartSpecialProcessResults" not in loop)
check("it still prices each process", "calculate_sp_cost(" in loop)
check("a pricing failure is caught rather than killing the run",
      "except Exception" in loop and "sp_unit_price = 0" in loop)

print()
print("=" * 74)
print("2. calculate_sp_cost survives an unreachable portal")
print("=" * 74)

fsrc = open(FUNCTION, encoding="utf-8").read()
tree = ast.parse(fsrc)
fn = next(n for n in ast.walk(tree)
          if isinstance(n, ast.FunctionDef) and n.name == "calculate_sp_cost")
seg = ast.get_source_segment(fsrc, fn)

check("the library fetch is guarded against a None response",
      'if not sp or not sp.get("Entities")' in seg)
check("the cost fetch is guarded too",
      'if not sp_cost_response or not sp_cost_response.get("Entities")' in seg)

# Prove it: run the function with an ExpressClient that always returns None,
# which is exactly what E0101 does when the portal is unreachable.
ns = {"print": print}
stub = """
class _DeadExpress:
    def __init__(self, *a, **k): pass
    def E0101(self, *a, **k): return None      # what E0101 does on any error
"""
exec(stub, ns)
ns["ExpressClient"] = ns["_DeadExpress"]
ns["TSH_URL"] = ns["TSH_USERNAME"] = ns["TSH_PASSWORD"] = ""
exec(compile(ast.Module(body=[fn], type_ignores=[]), FUNCTION, "exec"), ns)

try:
    got = ns["calculate_sp_cost"]("CLEAN PER APPLIED MATERIALS 0250-20000")
    check("an unreachable portal returns 0 instead of raising", got == 0, repr(got))
except Exception as exc:
    check("an unreachable portal returns 0 instead of raising", False,
          f"{type(exc).__name__}: {exc}")

print()
print("=" * 74)
print("3. Duplicates already in the database")
print("=" * 74)

with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)
d = cfg["Database"]
conn = pyodbc.connect("DRIVER={" + d["Driver"] + "};"
                      f"SERVER={d['Server']};DATABASE={d['Database']};"
                      f"UID={d['Uid']};PWD={d['Pwd']}")
cur = conn.cursor()

dupes = cur.execute(
    "SELECT CostingPartID, SpecialProcessName, COUNT(*) "
    "FROM dbo.CostingPartSpecialProcessResults "
    "WHERE IsActive = 1 AND IsManual = 0 "
    "GROUP BY CostingPartID, SpecialProcessName HAVING COUNT(*) > 1 "
    "ORDER BY CostingPartID").fetchall()

for pid, name, n in dupes:
    print(f"  part {pid}: {n}x  {name[:60]}")
if not dupes:
    print("  none")

if dupes and FIX:
    # Keep the lowest ID of each group -- the one the drawing stage wrote.
    cur.execute("""
        UPDATE s SET s.IsActive = 0, s.DeleteDate = GETDATE()
        FROM dbo.CostingPartSpecialProcessResults s
        WHERE s.IsActive = 1 AND s.IsManual = 0
          AND s.ID > (SELECT MIN(t.ID)
                      FROM dbo.CostingPartSpecialProcessResults t
                      WHERE t.CostingPartID = s.CostingPartID
                        AND t.SpecialProcessName = s.SpecialProcessName
                        AND t.IsActive = 1 AND t.IsManual = 0)
    """)
    conn.commit()
    left = cur.execute(
        "SELECT COUNT(*) FROM (SELECT CostingPartID, SpecialProcessName "
        "FROM dbo.CostingPartSpecialProcessResults "
        "WHERE IsActive = 1 AND IsManual = 0 "
        "GROUP BY CostingPartID, SpecialProcessName HAVING COUNT(*) > 1) x").fetchval()
    print(f"\n  deduplicated; {left} duplicate group(s) left")
    check("the duplicates were removed", left == 0, str(left))
elif dupes:
    print("\n  re-run with --fix to deduplicate")

conn.close()
print()
print("all good" if not failures else f"{len(failures)} failure(s): "
      + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
