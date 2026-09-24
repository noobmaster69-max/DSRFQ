"""What new_tsh's gongyi actually returns for a part, and why the weight is 0.

The Material Cost line multiplies the seeded price by gongyi's gross_weight,
so a zero there makes correct price data look broken. This reads the raw
response rather than inferring from the stored row.
"""
import io
import json
import re
import sys

import pyodbc
import requests
import urllib3

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 3
APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"

import yaml
with io.open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as f:
    cfg = yaml.safe_load(f)
url = cfg["Url"]["CostingGongyi"]
print("gongyi url: %s" % url)

# GET with the id as a query parameter, matching costing_gongyi().
resp = requests.get("%s?quotation_id=%d" % (url, PART), verify=False, timeout=180)
print("HTTP %s" % resp.status_code)
body = resp.json()
print("status: %s" % body.get("status"))

data = (body.get("data") or {}).get("data_to_send")
if not data:
    print(json.dumps(body, indent=1)[:1500])
    raise SystemExit(0)

for k in ("length", "width", "height", "volume", "net_volume", "remove_volume",
          "net_weight", "gross_weight", "material", "material_costs"):
    print("  %-16s %s" % (k, data.get(k)))

# The weight comes from volume x density inside new_tsh, so check what its own
# material table says about the material this quotation was priced against.
print("\n--- new_tsh's own material record ---")
try:
    import pymysql
    my = pymysql.connect(host="127.0.0.1", port=3307, user="joe",
                         password="Welcome01", database="tsh_new",
                         cursorclass=pymysql.cursors.DictCursor)
    with my.cursor() as c:
        c.execute("SELECT * FROM fa_quotation WHERE id = %s", (PART,))
        q = c.fetchone()
        if q:
            for k in ("id", "material_id", "area_id", "volume", "weight",
                      "gross_weight", "net_weight"):
                if k in q:
                    print("  quotation.%-14s %s" % (k, q[k]))
            mid = q.get("material_id")
            if mid:
                c.execute("SELECT * FROM fa_material WHERE id = %s", (mid,))
                m = c.fetchone()
                print("  material row: %s" % json.dumps(m, default=str)[:400])
    my.close()
except Exception as exc:
    print("  could not read tsh_new: %s" % exc)
