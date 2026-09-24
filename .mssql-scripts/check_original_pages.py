"""Original page images survive a drawing re-run, and restore 14/15.

Original = 1 rows are the as-uploaded renders. They are written once, at upload,
and nothing in the pipeline recreates them -- the consumer only ever inserts
Original = 0. ClearPreviousOutput's drawing arm was clearing both, which
permanently removed the "Original" sheet and starved ballooning (which reads
Original = 1).

    python .mssql-scripts/check_original_pages.py [--fix]
"""

import os
import sys

import pyodbc
import yaml

ENDPOINT = (r"C:\Aizera\DSRFQ\DSRFQ.Web\Modules\Costing\CostingParts"
            r"\CostingPartsEndpoint.cs")
UPLOAD = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload"
FIX = "--fix" in sys.argv

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


print("=" * 76)
print("1. The drawing re-run only clears the converted pages")
print("=" * 76)

cs = open(ENDPOINT, encoding="utf-8").read()
arm = cs[cs.index("case RerunStage.Drawing:"):]
arm = arm[:arm.index("break;")]

check("the image clear is scoped to Original = 0",
      "i.Original = 0" in arm)
check("it still clears the converted pages",
      "CostingPartDocumentImages" in arm)

print()
print("=" * 76)
print("2. Which parts lost their originals")
print("=" * 76)

with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)
d = cfg["Database"]
conn = pyodbc.connect("DRIVER={" + d["Driver"] + "};"
                      f"SERVER={d['Server']};DATABASE={d['Database']};"
                      f"UID={d['Uid']};PWD={d['Pwd']}")
cur = conn.cursor()

rows = cur.execute("""
    SELECT d.CostingPartID,
           SUM(CASE WHEN i.Original = 1 AND i.IsActive = 1 THEN 1 ELSE 0 END) AS LiveOrig,
           SUM(CASE WHEN i.Original = 1 AND i.IsActive = 0 THEN 1 ELSE 0 END) AS DeadOrig,
           SUM(CASE WHEN i.Original = 0 AND i.IsActive = 1 THEN 1 ELSE 0 END) AS LiveConv
    FROM dbo.CostingPartDocumentImages i
    JOIN dbo.CostingPartDocuments d ON d.ID = i.CostingPartDocumentID
    WHERE d.IsActive = 1
    GROUP BY d.CostingPartID
    ORDER BY d.CostingPartID
""").fetchall()

print(f"  {'part':>4} {'live orig':>10} {'dead orig':>10} {'live conv':>10}")
broken = []
for r in rows:
    flag = ""
    if r.LiveOrig == 0 and r.DeadOrig > 0:
        flag = "  <-- no original sheet, ballooning cannot run"
        broken.append(r.CostingPartID)
    print(f"  {r[0]:>4} {r.LiveOrig:>10} {r.DeadOrig:>10} {r.LiveConv:>10}{flag}")

print()
print("=" * 76)
print("3. Are the image files still on disk?")
print("=" * 76)

restorable = []
for pid in broken:
    imgs = cur.execute("""
        SELECT i.ID, i.FileDirectory FROM dbo.CostingPartDocumentImages i
        JOIN dbo.CostingPartDocuments d ON d.ID = i.CostingPartDocumentID
        WHERE d.CostingPartID = ? AND i.Original = 1 AND i.IsActive = 0
        ORDER BY i.Page
    """, pid).fetchall()
    present = [r for r in imgs
               if os.path.exists(os.path.join(UPLOAD, r.FileDirectory.replace("/", os.sep)))]
    print(f"  part {pid}: {len(present)}/{len(imgs)} file(s) present on disk")
    if present and len(present) == len(imgs):
        restorable.append((pid, [r.ID for r in present]))

check("every deactivated original still has its file",
      len(restorable) == len(broken),
      f"{len(restorable)} of {len(broken)} part(s) restorable")

if restorable and FIX:
    print()
    print("=" * 76)
    print("4. Restoring")
    print("=" * 76)
    for pid, ids in restorable:
        cur.execute(
            "UPDATE dbo.CostingPartDocumentImages SET IsActive = 1 "
            f"WHERE ID IN ({','.join('?' * len(ids))})", *ids)
        print(f"  part {pid}: reactivated {len(ids)} original page(s)")
    conn.commit()

    still = cur.execute("""
        SELECT COUNT(*) FROM (
            SELECT d.CostingPartID
            FROM dbo.CostingPartDocumentImages i
            JOIN dbo.CostingPartDocuments d ON d.ID = i.CostingPartDocumentID
            WHERE d.IsActive = 1
            GROUP BY d.CostingPartID
            HAVING SUM(CASE WHEN i.Original = 1 AND i.IsActive = 1 THEN 1 ELSE 0 END) = 0
               AND SUM(CASE WHEN i.Original = 1 THEN 1 ELSE 0 END) > 0) x
    """).fetchval()
    check("no part is left without its originals", still == 0, str(still))
elif restorable:
    print("\n  re-run with --fix to reactivate them")

conn.close()
print()
print("all good" if not failures else f"{len(failures)} failure(s): "
      + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
