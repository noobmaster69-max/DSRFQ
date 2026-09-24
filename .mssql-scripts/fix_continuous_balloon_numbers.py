"""Number existing balloons straight through, page 1 to the last page.

The consumer used to store each page's numbers as the engine gave them, so a
two-page drawing had balloons 1..n on both pages. This shifts each page to
carry on from the highest number on the pages before it - the same rule the
consumer now applies to new runs. The order within a page is untouched and a
sub-number keeps its suffix ("5-1" -> "28-1").

Only parts whose numbering actually restarts are touched: a part already
numbered through is left alone. Every change is written to a CSV first.

    python fix_continuous_balloon_numbers.py              # dry run, every part
    python fix_continuous_balloon_numbers.py --apply
    python fix_continuous_balloon_numbers.py 53 --apply   # one part
"""
import csv
import datetime
import io
import json
import os
import re
import sys
from collections import defaultdict

import pyodbc

APPLY = "--apply" in sys.argv
PARTS = [int(a) for a in sys.argv[1:] if a.isdigit()]

raw = json.load(io.open(r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json", encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect("DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;TrustServerCertificate=yes" % (
    g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"), g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")))
cur = conn.cursor()

where = "" if not PARTS else "AND CostingPartID IN (%s)" % ",".join(map(str, PARTS))
rows = cur.execute(f"""
    SELECT ID, CostingPartID, ISNULL(PageNumber, 1) AS Page, BalloonNo
    FROM dbo.CostingPartBalloons
    WHERE IsActive = 1 AND ISNULL(RemovedByUser, 0) = 0 {where}""").fetchall()

lead = lambda no: (lambda m: int(m.group(2)) if m else None)(re.match(r"(\s*)(\d+)(.*)$", str(no or ""), re.S))


def shift(no, offset):
    m = re.match(r"(\s*)(\d+)(.*)$", str(no or ""), re.S)
    return f"{m.group(1)}{int(m.group(2)) + offset}{m.group(3)}" if m else no


by_part = defaultdict(lambda: defaultdict(list))
for r in rows:
    by_part[r.CostingPartID][r.Page].append(r)

changes = []
for part, pages in sorted(by_part.items()):
    if len(pages) < 2:
        continue
    # Numbered through already? Then no top-level number is on two pages.
    seen = defaultdict(set)
    for page, rs in pages.items():
        for r in rs:
            n = lead(r.BalloonNo)
            if n is not None:
                seen[n].add(page)
    if all(len(p) <= 1 for p in seen.values()):
        continue
    highest = 0
    summary = []
    for page in sorted(pages):
        rs = pages[page]
        nums = [lead(r.BalloonNo) for r in rs if lead(r.BalloonNo) is not None]
        offset = highest
        if offset:
            for r in rs:
                new = shift(r.BalloonNo, offset)
                if new != r.BalloonNo:
                    changes.append((part, page, r.ID, r.BalloonNo, new))
        top = max(nums) + offset if nums else highest
        summary.append(f"p{page}: {min(nums) + offset if nums else '-'}-{top}")
        highest = max(highest, top)
    print(f"  part {part}: " + ", ".join(summary))

if not changes:
    print("  nothing to change")
    sys.exit(0)
print(f"\n{len(changes)} balloon number(s) to change across "
      f"{len({c[0] for c in changes})} part(s).")
if not APPLY:
    print("Dry run. Add --apply to write them.")
    sys.exit(0)

os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups"), exist_ok=True)
undo = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups",
                    f"balloon_numbers_before_{datetime.datetime.now():%Y%m%d_%H%M%S}.csv")
with open(undo, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["ID", "CostingPartID", "PageNumber", "OldBalloonNo", "NewBalloonNo"])
    w.writerows([(i, p, pg, old, new) for p, pg, i, old, new in changes])

for part, page, rid, old, new in changes:
    # Guarded on the old value: a row edited since it was read is skipped.
    cur.execute("UPDATE dbo.CostingPartBalloons SET BalloonNo = ? WHERE ID = ? AND BalloonNo = ?", new, rid, old)
conn.commit()
print(f"Written. Previous numbers: {undo}")
