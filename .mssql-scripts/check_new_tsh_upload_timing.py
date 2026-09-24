"""Where do the minutes in 'Upload 2D + 3D to new_tsh' actually go?

Joins DSRFQ's own stage timings to new_tsh's files table, so each part's
upload stage can be read next to the two file records it produced and how long
new_tsh spent processing each one.

    python .mssql-scripts/check_new_tsh_upload_timing.py
"""

import os
import sys

RFQ = r"C:\Aizera\RPA\RFQ"
sys.path.insert(0, RFQ)
os.chdir(RFQ)

import pymysql                                          # noqa: E402
import pyodbc                                           # noqa: E402
import yaml                                             # noqa: E402

cfg = yaml.safe_load(open(os.path.join(RFQ, "config.yaml"), "r"))

sql = pyodbc.connect(
    "DRIVER={%s};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;TrustServerCertificate=yes"
    % (cfg["Database"]["Driver"], cfg["Database"]["Server"],
       cfg["Database"]["Database"], cfg["Database"]["Uid"],
       cfg["Database"]["Pwd"]))

m = cfg["CostingDatabase"]
my = pymysql.connect(host=m["Host"], port=int(m["Port"]), user=m["User"],
                     password=m["Password"], database=m["Database"],
                     cursorclass=pymysql.cursors.DictCursor)

stages = sql.cursor().execute("""
    SELECT TOP 20 CostingPartID, Detail,
           DATEDIFF(second, StartTime, EndTime) AS Secs,
           CONVERT(varchar(19), StartTime, 120) AS Started
    FROM dbo.CostingPartStageTimings
    WHERE Stage = 'costing-upload' AND IsActive = 1 AND EndTime IS NOT NULL
    ORDER BY StartTime DESC""").fetchall()

print(f"{'part':>4}  {'stage s':>7}  {'started':<19}  file ids")
print("-" * 78)
ids = []
for s in stages:
    got = [int(t.split()[-1]) for t in (s.Detail or "").split(",") if t.strip()]
    ids += got
    print(f"{s.CostingPartID:>4}  {s.Secs:>7}  {s.Started:<19}  {got}")

if not ids:
    sys.exit("\nno upload stages recorded yet")

with my.cursor() as c:
    c.execute(
        "SELECT file_id, file_name, file_type, status_id, md5, "
        "       upload_time, process_time, "
        "       TIMESTAMPDIFF(SECOND, upload_time, process_time) AS secs "
        "FROM files WHERE file_id IN (%s) ORDER BY file_id"
        % ",".join(["%s"] * len(ids)), ids)
    files = c.fetchall()

print(f"\n{'file':>6}  {'type':<4} {'st':>2}  {'secs':>5}  {'name':<28}  md5")
print("-" * 96)
by_md5 = {}
for f in files:
    print(f"{f['file_id']:>6}  {f['file_type']:<4} {f['status_id']:>2}  "
          f"{str(f['secs']):>5}  {f['file_name'][:28]:<28}  {f['md5']}")
    by_md5.setdefault(f["md5"], []).append(f["file_id"])

# The endpoint short-circuits when the same bytes were already processed to
# status_id = 1, inheriting the previous run's json/png paths. That is the
# difference between a 6-second upload and a 6-minute one.
print("\nrepeat uploads of identical bytes (MD5 short-circuit candidates):")
repeats = {k: v for k, v in by_md5.items() if len(v) > 1}
if not repeats:
    print("  none in this window")
for md5, fids in repeats.items():
    print(f"  {md5}  file ids {fids}  <- all but the first should be instant")

with my.cursor() as c:
    c.execute("SELECT status_id, COUNT(*) n FROM files GROUP BY status_id")
    print("\nnew_tsh files by status: "
          + ", ".join(f"{r['status_id']}={r['n']}" for r in c.fetchall())
          + "   (1 = processed OK, so only these can be short-circuited)")

my.close()
sql.close()
