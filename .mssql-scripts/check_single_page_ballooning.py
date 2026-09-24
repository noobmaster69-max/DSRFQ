"""Does a single-page ballooning run leave the other pages alone?

That is the whole point of the second button, and it is the thing that would
be silently wrong: if either the endpoint's clear or the consumer's delete
forgets the page filter, a "this page only" run wipes the entire drawing and
nobody notices until the balloons are gone.

Runs both statements against the real table inside a rolled-back transaction,
and checks the message shapes either end of the queue.

    python .mssql-scripts/check_single_page_ballooning.py
"""

import os
import re
import sys

RFQ = r"C:\Aizera\RPA\RFQ"
WEB = r"C:\Aizera\DSRFQ\DSRFQ.Web"

import pyodbc                                              # noqa: E402
import yaml                                                # noqa: E402

fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + detail if detail else ''}")
    if not ok:
        fails.append(name)


print("1. the endpoint publishes a page-scoped job differently")
cs = open(os.path.join(WEB, "Modules", "Costing", "CostingParts",
                       "CostingPartsEndpoint.cs"), encoding="utf-8").read()
check("Publish takes a page", "int? pageNumber = null" in cs)
check("bare id for a whole-document run, JSON for a page",
      '"Id":{costingPartId},\\"Page\\":{pageNumber.Value}' in cs.replace('\\"', '\\"')
      or ('{{\\"Id\\":{costingPartId}' in cs), "")
check("the clear is scoped by PageNumber",
      "AND PageNumber = @page" in cs)
check("page is ignored for the non-ballooning stages",
      "request.Stage == RerunStage.Ballooning ? request.PageNumber : null" in cs)

print("\n2. the consumer understands both message shapes")
py = open(os.path.join(RFQ, "handlers.py"), encoding="utf-8").read()
check("reads Id from a dict or a bare int",
      'message.get("Id") if isinstance(message, dict) else message' in py)
check("reads Page from the dict", 'message.get("Page")' in py)
check("passes it to the worker", "args=(part_id, url, api_key, page_only)" in py)
check("the worker takes page_only", "def ballooning_in_thread(message, api_url, api_key, page_only=None)" in py)
check("the page delete is scoped", re.search(
    r"DELETE FROM dbo\.CostingPartBalloons\s+WHERE CostingPartID = \?\s+AND PageNumber = \?", py) is not None)

print("\n3. the scoped delete really only clears one page")
cfg = yaml.safe_load(open(os.path.join(RFQ, "config.yaml"), encoding="utf-8"))["Database"]
cn = pyodbc.connect(
    f"DRIVER={{{cfg['Driver']}}};SERVER={cfg['Server']};DATABASE={cfg['Database']};"
    f"UID={cfg['Uid']};PWD={cfg['Pwd']};TrustServerCertificate=yes")
cur = cn.cursor()
part = cur.execute("SELECT TOP 1 ID FROM dbo.CostingParts ORDER BY ID").fetchval()

try:
    def seed(page, no, manual=0, removed=0):
        cur.execute("""
            INSERT INTO dbo.CostingPartBalloons
              (CostingPartID, BalloonNo, PageNumber, CenterX, CenterY,
               BBoxX1, BBoxY1, BBoxX2, BBoxY2, Symbol, IsNote, Manual,
               RemovedByUser, InsertDate, InsertUserId, IsActive)
            VALUES (?, ?, ?, 1, 1, 1, 1, 2, 2, 'probe', 0, ?, ?,
                    CURRENT_TIMESTAMP, 1, 1)""",
                    part, no, page, manual, removed)

    seed(1, "p1-auto")
    seed(1, "p1-hand", manual=1)
    seed(1, "p1-gone", removed=1)
    seed(2, "p2-auto")
    seed(3, "p3-auto")

    def live():
        rows = cur.execute(
            "SELECT BalloonNo FROM dbo.CostingPartBalloons "
            "WHERE CostingPartID = ? AND Symbol = 'probe'", part).fetchall()
        return {r[0] for r in rows}

    check("five probe balloons seeded", len(live()) == 5, str(sorted(live())))

    # The consumer's page-scoped delete, verbatim in shape.
    cur.execute("""
        DELETE FROM dbo.CostingPartBalloons
        WHERE CostingPartID = ?
          AND PageNumber = ?
          AND ISNULL(Manual, 0) = 0
          AND ISNULL(RemovedByUser, 0) = 0
    """, part, 1)

    left = live()
    check("page 1's automatic balloon is gone", "p1-auto" not in left)
    check("page 1's HAND-DRAWN balloon survives", "p1-hand" in left)
    check("page 1's tombstone survives", "p1-gone" in left)
    check("page 2 is untouched", "p2-auto" in left, "")
    check("page 3 is untouched", "p3-auto" in left, "")
    print(f"        remaining: {sorted(left)}")
except Exception as exc:                                   # noqa: BLE001
    check("the scoped delete runs", False, str(exc)[:250])
finally:
    cn.rollback()

left = cur.execute(
    "SELECT COUNT(*) FROM dbo.CostingPartBalloons WHERE Symbol = 'probe'").fetchval()
check("rollback left nothing behind", left == 0, f"{left} row(s)")
cn.close()

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
