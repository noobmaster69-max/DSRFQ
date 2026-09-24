"""Queue depths and consumer counts via the RabbitMQ management API.

Used instead of rabbitmqctl because that lives inside WSL and needs sudo, which
hangs waiting for a password in a non-interactive shell.
"""
import base64
import json
import sys
import urllib.error
import urllib.request

BASE = "http://localhost:15672/api"
AUTH = base64.b64encode(b"guest:guest").decode()

INTERESTING = ("NewCostingParts", "Ballooning", "Costing", "RetryOcr",
               "CostingFileUpload", "CostingFileUploadData",
               "CostingSuanfei", "CostingGongyi")


def api(path):
    req = urllib.request.Request(BASE + path, headers={"Authorization": "Basic " + AUTH})
    return json.load(urllib.request.urlopen(req, timeout=10))


try:
    queues = api("/queues")
except urllib.error.URLError as exc:
    print("cannot reach the management API:", exc)
    sys.exit(1)

print("%-26s %8s %8s %10s" % ("queue", "ready", "unacked", "consumers"))
print("-" * 56)
for q in sorted(queues, key=lambda q: q["name"]):
    if INTERESTING and q["name"] not in INTERESTING:
        continue
    print("%-26s %8s %8s %10s" % (
        q["name"], q.get("messages_ready", 0),
        q.get("messages_unacknowledged", 0), q.get("consumers", 0)))

others = [q["name"] for q in queues if q["name"] not in INTERESTING]
if others:
    print("\nother queues present:", ", ".join(sorted(others)))
