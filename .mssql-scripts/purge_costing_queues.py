"""Drain the costing queues and settle a part back to a clean state.

Restarting the consumer requeues anything it held unacked, so overlapping test
runs pile up and each redelivery starts another suanfei/gongyi cycle. Purging
is the only way to stop that without waiting the backlog out.
"""
import base64
import io
import json
import re
import sys
import urllib.request

import pyodbc

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 9
QUEUES = ["Costing", "CostingFileUpload", "CostingFileUploadData",
          "CostingSuanfei", "CostingGongyi"]
AUTH = {"Authorization": "Basic " + base64.b64encode(b"guest:guest").decode()}


def api(path, method="GET"):
    req = urllib.request.Request("http://localhost:15672/api/" + path,
                                 headers=AUTH, method=method)
    return urllib.request.urlopen(req, timeout=30)


print("before:")
queues = json.load(api("queues"))
for q in sorted(queues, key=lambda x: x["name"]):
    if q["name"] in QUEUES:
        print("  %-24s ready=%-4s unacked=%s"
              % (q["name"], q.get("messages_ready", 0),
                 q.get("messages_unacknowledged", 0)))

for name in QUEUES:
    try:
        api("queues/%%2F/%s/contents" % name, method="DELETE")
        print("purged %s" % name)
    except Exception as exc:
        print("could not purge %s: %s" % (name, exc))

# Unacked messages only return to the queue when the consumer that holds them
# disconnects, so the purge above cannot see them. Bounce the consumer, then
# purge again.
try:
    req = urllib.request.Request("http://localhost:7171/api/restart/rfq-consumer",
                                 data=b"", method="POST")
    urllib.request.urlopen(req, timeout=180)
    print("bounced the consumer to release unacked messages")
except Exception as exc:
    print("could not bounce the consumer: %s" % exc)

import time
time.sleep(8)
for name in QUEUES:
    try:
        api("queues/%%2F/%s/contents" % name, method="DELETE")
    except Exception:
        pass

print("\nafter:")
for q in sorted(json.load(api("queues")), key=lambda x: x["name"]):
    if q["name"] in QUEUES:
        print("  %-24s ready=%-4s unacked=%s"
              % (q["name"], q.get("messages_ready", 0),
                 q.get("messages_unacknowledged", 0)))

APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"
raw = json.load(io.open(APPSETTINGS, encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")), timeout=90)
cur = conn.cursor()
n = cur.execute("UPDATE dbo.CostingPartCostingResults SET IsActive = 0 "
                "WHERE CostingPartID = ? AND IsActive = 1", PART).rowcount
cur.execute("UPDATE dbo.CostingParts SET CostingStatusID = 1 WHERE ID = ?", PART)
conn.commit()
print("\npart %d: %d duplicated cost line(s) retired, costing back to Pending"
      % (PART, n))
conn.close()
