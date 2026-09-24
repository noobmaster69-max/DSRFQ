"""Classify the balloons that were saved before the column existed.

Detection runs as the consumer inserts a balloon, so it only reaches balloons
ballooned from now on. Every balloon already in the database has
FeatureSymbolID NULL, and re-running recognition to fix that would cost minutes
a page for an answer that is computable from text we already have.

This applies the same matcher to those rows. It only ever writes where the
column is NULL, so a value set by hand or by a later run is never overwritten.

    python .mssql-scripts/backfill_feature_symbols.py          # dry run
    python .mssql-scripts/backfill_feature_symbols.py --apply
"""

import os
import sys
from collections import Counter

RFQ = r"C:\Aizera\RPA\RFQ"
sys.path.insert(0, RFQ)

import pyodbc                                                   # noqa: E402
import yaml                                                     # noqa: E402

from feature_symbols import load_matcher                        # noqa: E402

apply = "--apply" in sys.argv

cfg = yaml.safe_load(open(os.path.join(RFQ, "config.yaml"), encoding="utf-8"))["Database"]
cn = pyodbc.connect(
    f"DRIVER={{{cfg['Driver']}}};SERVER={cfg['Server']};DATABASE={cfg['Database']};"
    f"UID={cfg['Uid']};PWD={cfg['Pwd']};TrustServerCertificate=yes")
cur = cn.cursor()

m = load_matcher(cur)
names = {int(r[0]): r[1] for r in cur.execute(
    "SELECT Id, Name FROM dbo.MasterFeatureSymbols").fetchall()}
print(f"catalogue: {len(m)} symbols")

# Notes are prose and are not classified - see the consumer for why.
rows = cur.execute("""
    SELECT ID, Symbol, OriginalSymbol FROM dbo.CostingPartBalloons
    WHERE FeatureSymbolID IS NULL AND ISNULL(IsNote, 0) = 0
""").fetchall()
print(f"unclassified dimensions: {len(rows)}")

hits = [(int(r[0]), m.match(r[1], r[2])) for r in rows]
hits = [(bid, sid) for bid, sid in hits if sid is not None]

tally = Counter(sid for _bid, sid in hits)
for sid, n in tally.most_common():
    print(f"  {n:>4}  {names.get(sid, sid)}")
print(f"would set {len(hits)} of {len(rows)}")

if not apply:
    print("\ndry run - pass --apply to write")
    sys.exit(0)

cur.fast_executemany = True
cur.executemany(
    "UPDATE dbo.CostingPartBalloons SET FeatureSymbolID = ? "
    "WHERE ID = ? AND FeatureSymbolID IS NULL",
    [(sid, bid) for bid, sid in hits])
cn.commit()

done = cur.execute(
    "SELECT COUNT(*) FROM dbo.CostingPartBalloons "
    "WHERE FeatureSymbolID IS NOT NULL").fetchval()
print(f"applied. {done} balloons now carry a characteristic.")
cn.close()
