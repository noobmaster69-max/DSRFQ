"""Prove the ballooning INSERT really stores Multiplier.

Reading the SQL only shows the column count adds up. This lifts the actual
statement out of handlers.py, binds it exactly as the handler does, and runs it
against the real table inside a transaction that is rolled back - so a column
in the wrong position, or a type SQL Server refuses, fails here rather than on
the next ballooning run.

    python .mssql-scripts/verify_multiplier_insert.py
"""

import os
import re
import sys

RFQ = r"C:\Aizera\RPA\RFQ"

import pyodbc                                              # noqa: E402
import yaml                                                # noqa: E402

fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + detail if detail else ''}")
    if not ok:
        fails.append(name)


src = open(os.path.join(RFQ, "handlers.py"), encoding="utf-8").read()

# The statement, verbatim from the handler.
insert_sql = re.search(
    r'insert_sql = """(.*?)"""', src, re.S).group(1)
# ...and the helper that decides what goes in the column.
ns = {}
exec(compile(re.search(                                    # noqa: S102
    r"\ndef _quantity_or_none.*?(?=\n(?:def |class |@))", src, re.S).group(0),
    "handlers", "exec"), ns)
quantity_or_none = ns["_quantity_or_none"]

print("1. the statement under test")
print("   " + " ".join(insert_sql.split())[:150] + " ...")

cfg = yaml.safe_load(open(os.path.join(RFQ, "config.yaml"), encoding="utf-8"))["Database"]
cn = pyodbc.connect(
    f"DRIVER={{{cfg['Driver']}}};SERVER={cfg['Server']};DATABASE={cfg['Database']};"
    f"UID={cfg['Uid']};PWD={cfg['Pwd']};TrustServerCertificate=yes")
cur = cn.cursor()

# A part that exists, so the foreign key holds.
part_id = cur.execute(
    "SELECT TOP 1 ID FROM dbo.CostingParts ORDER BY ID").fetchval()
print(f"\n2. binding against part {part_id}, inside a rolled-back transaction")


def insert(symbol, quantity):
    """Bind exactly as the handler does - same order, same count."""
    cur.execute(
        insert_sql,
        part_id,
        "999",              # BalloonNo
        1,                  # PageNumber
        10.0, 20.0,         # CenterX, CenterY
        1.0, 2.0, 3.0, 4.0,  # BBox
        symbol,             # Symbol
        symbol,             # OriginalSymbol
        None, None,         # UpperTol, LowerTol
        quantity_or_none(quantity),
        "D5",               # Section
        "A1", "H8",         # GridStart, GridEnd
        0,                  # IsNote
        1)                  # InsertUserId


try:
    insert("4X \u00d8.250", 4)
    insert("\u00d810.5", 1)
    insert("2X \u00d8.500", "2")     # the engine can send it as text
    rows = cur.execute(
        "SELECT Symbol, Multiplier FROM dbo.CostingPartBalloons "
        "WHERE CostingPartID = ? AND BalloonNo = '999'", part_id).fetchall()

    got = {r[0]: r[1] for r in rows}
    print(f"        stored: {got}")

    check("all three rows inserted", len(rows) == 3, f"{len(rows)}")
    check("a prefixed dimension stores its multiplier",
          got.get("4X \u00d8.250") == "4", repr(got.get("4X \u00d8.250")))
    check("a numeric string is accepted too",
          got.get("2X \u00d8.500") == "2", repr(got.get("2X \u00d8.500")))
    check("an unprefixed dimension stays NULL, not '1'",
          got.get("\u00d810.5") is None, repr(got.get("\u00d810.5")))
except Exception as exc:                                   # noqa: BLE001
    check("the INSERT executes against the real table", False, str(exc)[:300])
finally:
    cn.rollback()

left = cur.execute(
    "SELECT COUNT(*) FROM dbo.CostingPartBalloons WHERE BalloonNo = '999'").fetchval()
check("rollback left nothing behind", left == 0, f"{left} row(s)")
cn.close()

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
