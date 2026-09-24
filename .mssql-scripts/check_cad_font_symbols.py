"""GD&T frames written in the Y14.5M CAD font get the right characteristic.

"{¸~|.`0`1`0}" is a flatness frame and "{¿~|Ø~.`0`0`5`Ì~|A~|B~|C}" a position
frame, but read as plain text neither holds a catalogued symbol: part 42's
balloon 14 got no characteristic and 17/18 were filed as Diameter (the Ø inside
the frame). Uses the real catalogue from the database.

    python check_cad_font_symbols.py            # tests + what a backfill would change
"""
import io
import json
import re
import sys
from collections import Counter

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import pyodbc  # noqa: E402

from feature_symbols import load_matcher, normalize, is_cad_font_text  # noqa: E402

raw = json.load(io.open(r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json", encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect("DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;TrustServerCertificate=yes" % (
    g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"), g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")))
cur = conn.cursor()
m = load_matcher(cur)
names = {r[0]: r[1] for r in cur.execute("SELECT Id, Name FROM dbo.MasterFeatureSymbols").fetchall()}
name = lambda text: names.get(m.match(text), "-")

fails = 0


def check(label, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {label}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


print("1. part 42")
check("balloon 14 {¸~|.`0`1`0} is Flatness", name("{¸~|.`0`1`0}") == "Flatness", name("{¸~|.`0`1`0}"))
pos = "{¿~|Ø~.`0`0`5`Ì~|A~|B~|C}"
check("balloons 17/18 {¿~|Ø~.005Ⓜ|A|B|C} are Position, not Diameter", name(pos) == "Position", name(pos))
check("balloon 22, the same frame in Unicode, is still Position", name("⊕⌀.005ⓂABC") == "Position")

print("\n2. every characteristic in the font")
for code, want in [("¸", "Flatness"), ("´", "Circularity (Roundness)"), ("³", "Cylindricity"),
                   ("¶", "Straightness"), ("¹", "Profile of a Line"), ("º", "Profile of a Surface"),
                   ("¼", "Perpendicularity"), ("·", "Parallelism"), ("½", "Circular Runout"),
                   ("¾", "Total Runout"), ("¿", "Position"), ("µ", "Concentricity")]:
    got = name("{%s~|.`0`0`5`|A}" % code)
    check(f"{{{code}~|.005|A}} -> {want}", got == want, got)
check("{Û~...} (a spherical diameter frame) -> Spherical Diameter",
      name("{¿~|Û~.`0`1~|A}") == "Position")  # frame characteristic still wins
check("a plain diameter is still Diameter", name("⌀2.17") == "Diameter" and name("Ø.330") == "Diameter")

print("\n3. ordinary text is left alone")
check("a stray middle dot in OCR text is not parallelism", name("2.80 · TYP") == "-", name("2.80 · TYP"))
check("a cedilla in a note is not flatness", name("CLEAN PER SPEC ¸ APPENDIX D") == "-")
check("only brace frames count as CAD-font text",
      is_cad_font_text("{¿~|0}") and not is_cad_font_text("¿ 0.5") and not is_cad_font_text("R.75"))
check("normalize leaves Unicode frames as they were", normalize("⊕⌀.005") == "⌖Ø.005")

print("\n4. what a backfill would change (active balloons, all parts)")
rows = cur.execute("""
    SELECT b.ID, b.CostingPartID, b.BalloonNo, b.Symbol, b.OriginalSymbol, b.FeatureSymbolID, b.Manual
    FROM dbo.CostingPartBalloons b
    WHERE b.IsActive = 1 AND ISNULL(b.RemovedByUser, 0) = 0""").fetchall()
changes = []
for r in rows:
    new = m.match(r.Symbol, r.OriginalSymbol)
    if new != r.FeatureSymbolID and (is_cad_font_text(r.Symbol) or is_cad_font_text(r.OriginalSymbol)):
        changes.append((r.CostingPartID, r.BalloonNo, names.get(r.FeatureSymbolID, "-"), names.get(new, "-"), r.Symbol))
print(f"  {len(changes)} CAD-font balloon(s) would change:")
for part, no, old, new, sym in sorted(changes)[:30]:
    print(f"    part {part:<3} balloon {no:<4} {old:<12} -> {new:<14} {sym[:36]!r}")
print("  by change:", dict(Counter(f"{o} -> {n}" for _, _, o, n, _ in changes)))

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
