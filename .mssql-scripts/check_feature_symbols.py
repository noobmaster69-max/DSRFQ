"""Does symbol detection actually match what the recogniser writes?

The catalogue and the engine disagree on codepoints for the two commonest
symbols on any drawing - perpendicularity and diameter - so this checks the
matcher against the LIVE catalogue and the LIVE balloon text already in the
database, not against invented strings. Then it runs the real INSERT inside a
rolled-back transaction.

    python .mssql-scripts/check_feature_symbols.py
"""

import ast
import os
import sys

RFQ = r"C:\Aizera\RPA\RFQ"
sys.path.insert(0, RFQ)

import pyodbc                                                   # noqa: E402
import yaml                                                     # noqa: E402

from feature_symbols import load_matcher, normalize             # noqa: E402

fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + detail if detail else ''}")
    if not ok:
        fails.append(name)


cfg = yaml.safe_load(open(os.path.join(RFQ, "config.yaml"), encoding="utf-8"))["Database"]
cn = pyodbc.connect(
    f"DRIVER={{{cfg['Driver']}}};SERVER={cfg['Server']};DATABASE={cfg['Database']};"
    f"UID={cfg['Uid']};PWD={cfg['Pwd']};TrustServerCertificate=yes")
cur = cn.cursor()

print("1. the catalogue")
m = load_matcher(cur)
check("the catalogue loaded", len(m) == 15, f"{len(m)} symbols")

by_name = {r[1]: int(r[0]) for r in cur.execute(
    "SELECT Id, Name FROM dbo.MasterFeatureSymbols").fetchall()}

print("\n2. the codepoint disagreements that would silently miss")
# These are the whole reason the module exists: both render identically to the
# catalogue's glyph and compare unequal to it.
check("engine's \u22a5 matches the catalogue's \u27c2 perpendicularity",
      m.match("\u22a5 0.005 A") == by_name["Perpendicularity"],
      f"got {m.match(chr(0x22a5) + ' 0.005 A')}, want {by_name['Perpendicularity']}")
check("engine's \u2300 matches the catalogue's \u00d8 diameter",
      m.match("\u2300.380") == by_name["Diameter"],
      f"got {m.match(chr(0x2300) + '.380')}, want {by_name['Diameter']}")
check("\u2295 reads as position",
      m.match("\u2295 \u2300.005 A B C") == by_name["Position"])

print("\n3. specificity")
check("S\u00d8 beats \u00d8",
      m.match("S\u00d8.500") == by_name["Spherical Diameter"],
      f"got {m.match('S' + chr(0xd8) + '.500')}")
# A feature control frame holds both. The characteristic is what is controlled;
# the diameter describes the tolerance zone inside it.
check("a control frame reads as its characteristic, not its diameter",
      m.match("\u2316 \u2300.005 A B C") == by_name["Position"],
      f"got {m.match(chr(0x2316) + ' ' + chr(0x2300) + '.005')}")
check("plain text matches nothing", m.match("1.250 \u00b1.005") is None,
      repr(m.match("1.250 \u00b1.005")))
check("empty matches nothing", m.match("", None) is None)

print("\n4. against the balloon text actually in the database")
rows = cur.execute("""
    SELECT TOP 400 Symbol, OriginalSymbol, IsNote FROM dbo.CostingPartBalloons
    WHERE Symbol IS NOT NULL AND LEN(Symbol) > 0
""").fetchall()
matched = [r for r in rows if not r[2] and m.match(r[0], r[1]) is not None]
print(f"        {len(rows)} balloons, {len(matched)} classified")
for r in matched[:8]:
    print(f"          {r[0][:44]!r:<48} -> {m.match(r[0], r[1])}")
check("real balloons do get classified", len(matched) > 0)
# Not a threshold on quality - just that the run is not accidentally matching
# every single balloon, which would mean a glyph is being found in plain text.
check("not everything matches", len(matched) < len(rows),
      f"{len(matched)}/{len(rows)}")

print("\n5. the INSERT, against the real column")
# A real part: CostingPartID is a foreign key, so a made-up id fails on the
# constraint rather than on anything this test is about.
part = cur.execute("SELECT MIN(ID) FROM dbo.CostingParts").fetchval()
try:
    cur.execute("""
        INSERT INTO dbo.CostingPartBalloons
            (CostingPartID, BalloonNo, PageNumber, CenterX, CenterY,
             BBoxX1, BBoxY1, BBoxX2, BBoxY2, Symbol, OriginalSymbol,
             FeatureSymbolID, UpperTol, LowerTol, Multiplier, Section,
             GridStart, GridEnd, IsNote, Manual, RemovedByUser, BalloonColor,
             BalloonSize, InsertDate, InsertUserId, IsActive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0,
                '#27dc3c', 1, CURRENT_TIMESTAMP, ?, 1)
    """, part, "999", 1, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0,
         "\u2300.380", "\u2300.380", by_name["Diameter"],
         None, None, None, None, None, None, 0, 1)
    got = cur.execute(
        "SELECT FeatureSymbolID, Symbol FROM dbo.CostingPartBalloons "
        "WHERE CostingPartID = ? AND BalloonNo = '999'", part).fetchone()
    check("the id round-trips", got[0] == by_name["Diameter"], str(got[0]))
    # The glyph must survive the driver too - a column with the wrong collation
    # or a non-N literal would land as '?' and nobody would notice until a
    # re-run stopped matching.
    check("the glyph survived the round trip", got[1] == "\u2300.380", repr(got[1]))
except Exception as exc:                                        # noqa: BLE001
    check("the INSERT runs", False, str(exc)[:250])
finally:
    cn.rollback()

check("rollback left nothing behind", cur.execute(
    "SELECT COUNT(*) FROM dbo.CostingPartBalloons WHERE BalloonNo = '999' "
    "AND CostingPartID = ?", part).fetchval() == 0)

print("\n6. handlers.py still parses")
src = open(os.path.join(RFQ, "handlers.py"), encoding="utf-8").read()
try:
    ast.parse(src)
    check("handlers.py parses", True)
except SyntaxError as exc:
    check("handlers.py parses", False, str(exc))
check("the insert lists FeatureSymbolID", "FeatureSymbolID," in src)

cn.close()
print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
