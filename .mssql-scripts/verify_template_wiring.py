"""Confirms the RFQ pipeline now reads its template from the database.

Checks the happy path, then each fallback, so a missing or broken template
degrades to the built-in constants instead of failing the conversion.
"""
import os
import sys

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
os.chdir(r"C:\Aizera\RPA\RFQ")

import pyodbc  # noqa: E402
import function  # noqa: E402

EXPECTED = {
    "REVISION": [5248, 1010, 5477, 1173],
    "PART NUMBER": [2898, 1002, 5241, 1173],
    "DESCRIPTION": [2898, 766, 5477, 937],
    "MATERIAL": [522, 1204, 1715, 1371],
    "WEIGHT": [4000, 1476, 4280, 1549],
    "ANGULAR TOLERANCE": [672, 940, 1152, 1006],
    "SURFACE": [1475, 940, 1715, 1006],
    "TOLERANCE 1": [19, 715, 860, 815],
    "TOLERANCE 2": [19, 830, 860, 934],
    "TOLERANCE 3": [880, 715, 1707, 815],
    "TOLERANCE 4": [880, 830, 1707, 934],
}

failures = []


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + ((" -- " + detail) if detail else ""))
    if not ok:
        failures.append(label)


def db():
    return pyodbc.connect(
        'DRIVER={' + function.DB_DRIVER + '};'
        f'SERVER={function.DB_SERVER};DATABASE={function.DB_DATABASE};'
        f'UID={function.DB_UID};PWD={function.DB_PWD}')


print("=== template loads from the database ===")
t = function.load_default_template()
check("a default template was found", t is not None)
if t:
    check("table artwork resolves on disk", os.path.exists(t["table_path"]), t["table_path"])
    check("logo artwork resolves on disk",
          bool(t["icon_path"]) and os.path.exists(t["icon_path"]), str(t["icon_path"]))
    check("all 11 fields present", len(t["coords"]) == 11, "%d field(s)" % len(t["coords"]))
    mismatched = {k: (t["coords"].get(k), v) for k, v in EXPECTED.items() if t["coords"].get(k) != v}
    check("coordinates match the constants they replace", not mismatched, str(mismatched))

print("\n=== fallbacks ===")
conn = db()
cur = conn.cursor()
cur.execute("SELECT ID FROM dbo.ToolTemplateConversion WHERE [Default] = 1")
row = cur.fetchone()
default_id = row[0] if row else None

try:
    # No row marked Default.
    cur.execute("UPDATE dbo.ToolTemplateConversion SET [Default] = 0")
    conn.commit()
    check("no default -> falls back", function.load_default_template() is None)

    # Marked Default but the artwork file is gone.
    if default_id:
        cur.execute("UPDATE dbo.ToolTemplateConversion SET [Default] = 1, "
                    "TablePicture = ? WHERE ID = ?",
                    "ToolTemplateConversion/Table/does-not-exist.png", default_id)
        conn.commit()
        check("missing artwork -> falls back", function.load_default_template() is None)
finally:
    if default_id:
        cur.execute("UPDATE dbo.ToolTemplateConversion SET [Default] = 1, TablePicture = ? "
                    "WHERE ID = ?", "ToolTemplateConversion/Table/rfq-default-table.png",
                    default_id)
        conn.commit()
    conn.close()

print("\n=== restored ===")
t = function.load_default_template()
check("default template loads again", t is not None and len(t["coords"]) == 11)

print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
