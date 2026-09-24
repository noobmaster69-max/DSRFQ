"""Does costing a DSRFQ part overwrite a pre-existing new_tsh quotation?

upload_costing_data_in_thread posts "quotation_id": costingPartId, so the
DSRFQ part id doubles as the new_tsh quotation id. new_tsh already holds
quotations from 2025, so the two id spaces overlap and a part silently lands
on someone else's record.
"""
import io
import json
import re

import pymysql
import pyodbc

APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"
raw = json.load(io.open(APPSETTINGS, encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
sql = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")), timeout=90)
cur = sql.cursor()

parts = cur.execute("""SELECT ID, PartNumber, InsertDate FROM dbo.CostingParts
                       ORDER BY ID""").fetchall()
sql.commit()
sql.close()

my = pymysql.connect(host="127.0.0.1", port=3307, user="joe", password="Welcome01",
                     database="tsh_new", cursorclass=pymysql.cursors.DictCursor)
c = my.cursor()
c.execute("SELECT MAX(id) AS m, COUNT(*) AS n FROM fa_quotation")
r = c.fetchone()
print("new_tsh holds %d quotations, highest id %d\n" % (r["n"], r["m"]))

print("%-5s %-16s %-21s | new_tsh quotation with the same id" % (
    "part", "part number", "uploaded to DSRFQ"))
print("-" * 100)
collisions = 0
for p in parts:
    c.execute("SELECT id, area_id, material_id, create_time, update_time "
              "FROM fa_quotation WHERE id = %s", (p[0],))
    q = c.fetchone()
    if not q:
        print("  %-3s %-16s %-21s | none (id is free)"
              % (p[0], p[1] or "", str(p[2])[:19]))
        continue
    # A quotation created before the DSRFQ part existed cannot be that part's.
    stale = q["create_time"] is not None and q["create_time"] < p[2]
    if stale:
        collisions += 1
    print("  %-3s %-16s %-21s | id=%s created %s%s"
          % (p[0], p[1] or "", str(p[2])[:19], q["id"], q["create_time"],
             "   <-- PRE-EXISTING, not this part" if stale else ""))

print("\n%d of %d parts are costed against a quotation that predates them."
      % (collisions, len(parts)))
if collisions:
    print("Those runs read that quotation's stored geometry and material, which is")
    print("why every part comes back 100 x 50 x 30 with gross_weight 0.")

my.close()
