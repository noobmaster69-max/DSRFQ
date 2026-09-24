"""Re-classify balloons whose GD&T frame is written in the Y14.5M CAD font.

Before feature_symbols.py understood the CAD font, "{¿~|Ø~.005Ì|A|B|C}" (a
position frame) was filed as Diameter and "{¸~|.010}" (flatness) got nothing.

Only rows whose stored characteristic is exactly what the OLD matcher produced
are changed. A characteristic somebody picked by hand differs from that, and is
left alone. Every change is written to a CSV first, so it can be undone.

    python fix_cad_font_characteristics.py 42            # dry run, part 42
    python fix_cad_font_characteristics.py 42 --apply
    python fix_cad_font_characteristics.py all --apply   # every part
"""
import csv
import datetime
import io
import json
import os
import re
import sys

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import pyodbc  # noqa: E402

import feature_symbols  # noqa: E402

args = [a for a in sys.argv[1:] if a != "--apply"]
APPLY = "--apply" in sys.argv
if not args:
    sys.exit(__doc__)
PARTS = None if args[0] == "all" else [int(a) for a in args]

raw = json.load(io.open(r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json", encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect("DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;TrustServerCertificate=yes" % (
    g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"), g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")))
cur = conn.cursor()

new_matcher = feature_symbols.load_matcher(cur)
real = feature_symbols.is_cad_font_text


def old_of(symbol, original):
    """What the matcher gave before it knew the CAD font.

    normalize() looks up is_cad_font_text at call time, so the translation has
    to be switched off for the duration of the match, not just while building.
    """
    feature_symbols.is_cad_font_text = lambda _t: False
    try:
        return new_matcher.match(symbol, original)
    finally:
        feature_symbols.is_cad_font_text = real

names = {r[0]: r[1] for r in cur.execute("SELECT Id, Name FROM dbo.MasterFeatureSymbols").fetchall()}
where = "" if PARTS is None else "AND b.CostingPartID IN (%s)" % ",".join(map(str, PARTS))
rows = cur.execute(f"""
    SELECT b.ID, b.CostingPartID, b.BalloonNo, b.PageNumber, b.Symbol, b.OriginalSymbol, b.FeatureSymbolID
    FROM dbo.CostingPartBalloons b
    WHERE b.IsActive = 1 AND ISNULL(b.RemovedByUser, 0) = 0 {where}""").fetchall()

changes, kept = [], []
for r in rows:
    if not (real(r.Symbol) or real(r.OriginalSymbol)):
        continue
    new = new_matcher.match(r.Symbol, r.OriginalSymbol)
    if new == r.FeatureSymbolID:
        continue
    if r.FeatureSymbolID != old_of(r.Symbol, r.OriginalSymbol):
        kept.append(r)          # set to something else by hand - not ours to change
        continue
    changes.append((r, new))

for r, new in sorted(changes, key=lambda x: (x[0].CostingPartID, x[0].PageNumber or 1, x[0].BalloonNo)):
    print(f"  part {r.CostingPartID:<3} pg {r.PageNumber or 1} balloon {r.BalloonNo:<5} "
          f"{names.get(r.FeatureSymbolID, '-'):<12} -> {names.get(new, '-'):<16} {r.Symbol[:34]!r}")
if kept:
    print(f"  {len(kept)} left alone: their characteristic was set by hand")
if not changes:
    print("  nothing to change")
    sys.exit(0)
if not APPLY:
    print(f"\n{len(changes)} balloon(s) would change. Add --apply to write them.")
    sys.exit(0)

os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups"), exist_ok=True)
undo = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups",
                    f"characteristics_before_{datetime.datetime.now():%Y%m%d_%H%M%S}.csv")
with open(undo, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["ID", "CostingPartID", "BalloonNo", "OldFeatureSymbolID", "NewFeatureSymbolID"])
    for r, new in changes:
        w.writerow([r.ID, r.CostingPartID, r.BalloonNo, r.FeatureSymbolID, new])

for r, new in changes:
    # Guarded on the old value, so a row changed since it was read is skipped.
    cur.execute("UPDATE dbo.CostingPartBalloons SET FeatureSymbolID = ? WHERE ID = ? AND "
                "(FeatureSymbolID = ? OR (FeatureSymbolID IS NULL AND ? IS NULL))",
                new, r.ID, r.FeatureSymbolID, r.FeatureSymbolID)
conn.commit()
print(f"\n{len(changes)} balloon(s) re-classified. Previous values: {undo}")
