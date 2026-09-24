"""The replacement word comes from the template, not from a string literal.

Covers the whole chain:
  migration  ToolTemplateConversion gains ReplacementText, seeded to 'TSH'
  row/form   the field is editable in DSRFQ
  consumer   load_default_template returns it, and apply_dynamic_redaction uses
             it, falling back to TSH when it is blank

    python .mssql-scripts/check_replacement_text.py
"""

import ast
import sys
import time

import pyodbc
import yaml

FUNCTION = r"C:\Aizera\RPA\RFQ\function.py"
ROW = (r"C:\Aizera\DSRFQ\DSRFQ.Web\Modules\Master\ToolTemplateConversion"
       r"\ToolTemplateConversionRow.cs")
FORM = (r"C:\Aizera\DSRFQ\DSRFQ.Web\Modules\Master\ToolTemplateConversion"
        r"\ToolTemplateConversionForm.cs")

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


print("=" * 74)
print("1. The column exists and existing templates were seeded")
print("=" * 74)

with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)
d = cfg["Database"]

# The migration runs at DSRFQ startup; give it a moment if the app just booted.
col = None
for _ in range(20):
    conn = pyodbc.connect("DRIVER={" + d["Driver"] + "};"
                          f"SERVER={d['Server']};DATABASE={d['Database']};"
                          f"UID={d['Uid']};PWD={d['Pwd']}")
    cur = conn.cursor()
    col = cur.execute(
        "SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS "
        "WHERE TABLE_NAME = 'ToolTemplateConversion' AND COLUMN_NAME = 'ReplacementText'"
    ).fetchone()
    if col:
        break
    conn.close()
    time.sleep(3)

check("ReplacementText exists on the table", col is not None,
      f"{col[0]}({col[1]})" if col else "missing - has DSRFQ started?")

if col:
    rows = cur.execute(
        "SELECT ID, Name, ReplacementText, [Default] FROM dbo.ToolTemplateConversion "
        "WHERE IsActive = 1 ORDER BY ID").fetchall()
    for r in rows:
        star = " (default)" if r[3] == 1 else ""
        print(f"  template {r[0]}: {r[1]!r} -> {r[2]!r}{star}")
    check("every existing template was seeded",
          all(r[2] for r in rows), f"{sum(1 for r in rows if not r[2])} blank")
    conn.close()

print()
print("=" * 74)
print("2. It is editable in DSRFQ")
print("=" * 74)

row_src = open(ROW, encoding="utf-8").read()
form_src = open(FORM, encoding="utf-8").read()
check("the row exposes the property", "public string ReplacementText" in row_src)
check("the row declares the field", "public StringField ReplacementText" in row_src)
check("the form shows it", "public string ReplacementText" in form_src)
check("it is not hidden on the form",
      "[Hidden] public string ReplacementText" not in form_src)

print()
print("=" * 74)
print("3. The consumer reads and uses it")
print("=" * 74)

src = open(FUNCTION, encoding="utf-8").read()
tree = ast.parse(src)
check("function.py parses", True)

check("the query selects the column", "ReplacementText, %s" in src)
check("the template carries it", '"replacement_text": replacement_text' in src)
check("the coordinate quads shifted with it", "values = row[5:]" in src)
check("drawing_conversion passes it",
      'replace_text=(template or {}).get("replacement_text")' in src)
check("the literal is gone from the redaction",
      'replace_text = "TSH"' not in src)
check("a named default remains", 'DEFAULT_REPLACE_TEXT = "TSH"' in src)

# Exercise the fallback logic exactly as written.
fn = next(n for n in ast.walk(tree)
          if isinstance(n, ast.FunctionDef) and n.name == "apply_dynamic_redaction")
line = next(l for l in ast.get_source_segment(src, fn).splitlines()
            if "replace_text = (replace_text or" in l)
print(f"\n  fallback line: {line.strip()}")

ns = {"DEFAULT_REPLACE_TEXT": "TSH"}
for given, expect in [("ACME", "ACME"), ("  ACME  ", "ACME"),
                      ("", "TSH"), ("   ", "TSH"), (None, "TSH")]:
    ns["replace_text"] = given
    exec(line.strip(), ns)
    got = ns["replace_text"]
    check(f"{given!r} -> {expect!r}", got == expect, repr(got))

print()
print("all good" if not failures else f"{len(failures)} failure(s): "
      + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
