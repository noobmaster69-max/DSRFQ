"""Did new_tsh actually analyse the STEP file it was sent?

gongyi falls back to a hardcoded 100 x 50 x 30 part (gongyi_tsh.py:239) when it
cannot find a features JSON, so the giveaway is not the numbers themselves but
whether files.json_path was ever populated for the uploaded 3D file.
"""
import json
import os
import sys

import pymysql

my = pymysql.connect(host="127.0.0.1", port=3307, user="joe", password="Welcome01",
                     database="tsh_new", cursorclass=pymysql.cursors.DictCursor)
cur = my.cursor()

cur.execute("SHOW COLUMNS FROM files")
cols = [c["Field"] for c in cur.fetchall()]
print("files columns: %s\n" % ", ".join(cols))

cur.execute("SELECT * FROM files ORDER BY file_id DESC LIMIT 8")
rows = cur.fetchall()
print("=== most recent uploaded files ===")
for r in rows:
    print("  file_id=%-5s name=%-34s" % (r.get("file_id"), str(r.get("file_name"))[:34]))
    for k in ("json_path", "png_path", "png_path2", "step_path", "file_path",
              "create_time", "status"):
        if k in r:
            v = r[k]
            mark = ""
            if k.endswith("_path") and v:
                mark = "  [exists]" if os.path.exists(str(v)) else "  [MISSING ON DISK]"
            print("      %-12s %s%s" % (k, str(v)[:70] if v else "(empty)", mark))
    print()

print("=== the task rows gongyi reads (data table) ===")
cur.execute("SHOW COLUMNS FROM data")
dcols = [c["Field"] for c in cur.fetchall()]
print("  columns: %s" % ", ".join(dcols))
cur.execute("SELECT * FROM data ORDER BY create_time DESC LIMIT 6")
for r in cur.fetchall():
    print("  task=%-38s quotation=%-5s file_3d=%-7s created=%s"
          % (str(r.get("task_id"))[:38], r.get("quotation_id"),
             r.get("file_3d_id"), r.get("create_time")))
    for k in ("json_path", "png_path_3d", "result"):
        v = r.get(k)
        mark = ""
        if k == "json_path" and v:
            mark = "  [exists]" if os.path.exists(str(v)) else "  [MISSING ON DISK]"
        print("      %-12s %s%s" % (k, (str(v)[:64] if v else "(empty)"), mark))

my.close()
