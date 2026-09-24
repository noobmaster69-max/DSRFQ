"""Dump the attendance trigger definitions and table shapes to files.

sqlcmd truncates long definitions and these run to ~118K characters between
them, so they are pulled with pyodbc and written out to read properly.

    python .mssql-scripts/dump_attendance_triggers.py [database]
"""

import os
import sys

import pyodbc

DB = sys.argv[1] if len(sys.argv) > 1 else "DSEFACTORY"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "attendance")
os.makedirs(OUT, exist_ok=True)

cn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=deskdev,65001;"
    f"DATABASE={DB};UID=sa;PWD=Tsh9989;TrustServerCertificate=yes")
cur = cn.cursor()

for name, definition, parent, disabled in cur.execute("""
    SELECT t.name, m.definition, OBJECT_NAME(t.parent_id), t.is_disabled
    FROM sys.triggers t JOIN sys.sql_modules m ON m.object_id = t.object_id
    WHERE OBJECT_NAME(t.parent_id) LIKE '%Attendance%'
""").fetchall():
    tag = "DISABLED_" if disabled else ""
    path = os.path.join(OUT, f"{tag}{parent}__{name}.sql")
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(definition)
    print(f"{len(definition):>7}  {path}")

for table in ("HumanResourcesAttendance", "HumanResourcesShiftAttendanceRecord",
              "HumanResourcesPayrollShiftAttendanceRecord", "HumanResourcesShift"):
    cols = cur.execute("""
        SELECT c.name, ty.name, c.max_length, c.is_nullable, c.is_identity,
               OBJECT_DEFINITION(c.default_object_id)
        FROM sys.columns c
        JOIN sys.types ty ON ty.user_type_id = c.user_type_id
        WHERE c.object_id = OBJECT_ID(?) ORDER BY c.column_id
    """, table).fetchall()
    if not cols:
        continue
    path = os.path.join(OUT, f"_schema_{table}.txt")
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        for c in cols:
            fh.write(f"{c[0]:<40} {c[1]:<16} len={c[2]:<6} null={c[3]} "
                     f"identity={c[4]} default={c[5]}\n")
    print(f"{len(cols):>7}  {path}")

cn.close()
