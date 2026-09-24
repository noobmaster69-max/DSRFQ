"""What new_tsh actually holds, and whether any of it belongs to part 9.

The DSRFQ costing part id is passed to new_tsh as quotation_id, so a run for
part 9 would leave a row with that id. If the newest row is older than the
upload, the log the user saw belongs to an earlier part.
"""
import sys

import pymysql

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 9

my = pymysql.connect(host="127.0.0.1", port=3307, user="joe", password="Welcome01",
                     database="tsh_new", cursorclass=pymysql.cursors.DictCursor)
cur = my.cursor()

cur.execute("""SELECT table_name FROM information_schema.tables
               WHERE table_schema = 'tsh_new' ORDER BY table_name""")
tables = [list(r.values())[0] for r in cur.fetchall()]
print("tables: %s\n" % ", ".join(tables))

for t in ("fa_quotation", "fa_file", "fa_file_processing", "fa_quotation_process"):
    if t not in tables:
        continue
    cur.execute("SELECT COUNT(*) AS n FROM `%s`" % t)
    n = cur.fetchone()["n"]
    print("=== %s (%d rows) ===" % (t, n))
    cur.execute("SHOW COLUMNS FROM `%s`" % t)
    cols = [c["Field"] for c in cur.fetchall()]
    order = "id" if "id" in cols else cols[0]
    cur.execute("SELECT * FROM `%s` ORDER BY `%s` DESC LIMIT 6" % (t, order))
    for r in cur.fetchall():
        keep = {k: str(v)[:48] for k, v in r.items()
                if k in ("id", "quotation_id", "material_id", "area_id", "name",
                         "file_name", "filename", "status", "create_time",
                         "update_time", "createtime", "updatetime", "path")}
        print("   %s" % keep)
    print()

print("=== anything referencing quotation %d ===" % PART)
found = False
for t in tables:
    cur.execute("SHOW COLUMNS FROM `%s`" % t)
    cols = [c["Field"] for c in cur.fetchall()]
    for col in ("quotation_id", "id"):
        if col not in cols:
            continue
        if col == "id" and t != "fa_quotation":
            continue
        cur.execute("SELECT COUNT(*) AS n FROM `%s` WHERE `%s` = %%s" % (t, col), (PART,))
        n = cur.fetchone()["n"]
        if n:
            found = True
            print("  %s.%s = %d -> %d row(s)" % (t, col, PART, n))
if not found:
    print("  NOTHING -- new_tsh has never seen part %d" % PART)

my.close()
