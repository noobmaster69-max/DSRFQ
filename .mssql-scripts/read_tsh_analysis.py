"""Read the analysis JSON new_tsh produced for a quotation.

gongyi_tsh falls back to a hardcoded 100 x 50 x 30 when it cannot find
dimensions, so the question is whether this file has them and gongyi is
looking in the wrong place, or whether the analysis itself came out empty.
"""
import json
import os
import sys

import pymysql

QUOTATION = int(sys.argv[1]) if len(sys.argv) > 1 else 9

my = pymysql.connect(host="127.0.0.1", port=3307, user="joe", password="Welcome01",
                     database="tsh_new", cursorclass=pymysql.cursors.DictCursor)
cur = my.cursor()
cur.execute("""SELECT task_id, file_3d_id, json_path, create_time FROM data
               WHERE quotation_id = %s ORDER BY create_time DESC LIMIT 1""", (QUOTATION,))
row = cur.fetchone()
my.close()

if not row:
    print("no task for quotation %d" % QUOTATION)
    raise SystemExit(1)

path = row["json_path"]
print("task %s, 3D file %s, created %s" % (row["task_id"], row["file_3d_id"],
                                           row["create_time"]))
print("json: %s" % path)
if not path or not os.path.exists(path):
    print("  NOT ON DISK")
    raise SystemExit(1)

print("  size: %d bytes\n" % os.path.getsize(path))
with open(path, encoding="utf-8") as f:
    data = json.load(f)


def walk(node, prefix="", depth=0):
    if depth > 3:
        return
    if isinstance(node, dict):
        for k, v in node.items():
            if isinstance(v, (dict, list)):
                size = len(v)
                print("  %-52s %s(%d)" % (prefix + k, type(v).__name__, size))
                walk(v, prefix + k + ".", depth + 1)
            else:
                print("  %-52s %s" % (prefix + k, str(v)[:60]))
    elif isinstance(node, list) and node:
        walk(node[0], prefix + "[0].", depth + 1)


print("=== structure ===")
walk(data)

print("\n=== what gongyi looks for ===")
for path_expr in ("basic_info.dimensions", "dimensions", "bounding_box",
                  "basic_info", "volume", "features"):
    node = data
    ok = True
    for part in path_expr.split("."):
        if isinstance(node, dict) and part in node:
            node = node[part]
        else:
            ok = False
            break
    print("  %-24s %s" % (path_expr, json.dumps(node)[:100] if ok else "-- absent --"))
