"""Bring the pipeline up through the control panel, in dependency order.

Going through the panel (rather than launching the processes directly) is the
point: only services the panel started are put under supervision, so a service
started by hand is exactly the one that will silently stay dead.
"""
import json
import sys
import time
import urllib.request

PANEL = "http://localhost:7171"

# rabbitmq first (the consumer needs the broker), then the workers, then the
# consumer that dispatches to them, then the web app that publishes.
ORDER = [
    ("rabbitmq", 45),
    ("table-recognize", 90),
    ("new-tsh", 45),
    ("rpa-api", 30),
    ("dsrfq", 60),
    ("rfq-consumer", 30),
]


def status():
    return json.load(urllib.request.urlopen(PANEL + "/api/status", timeout=120))


def post(path):
    req = urllib.request.Request(PANEL + path, data=b"", method="POST")
    return json.load(urllib.request.urlopen(req, timeout=180))


state = {s["id"]: s for s in status()}
for sid, wait in ORDER:
    s = state.get(sid)
    if s is None:
        print("  %-18s unknown to the panel" % sid)
        continue
    if s["state"] == "up":
        print("  %-18s already up" % sid)
        continue
    print("  %-18s starting..." % sid, end="", flush=True)
    try:
        post("/api/start/" + sid)
    except Exception as exc:
        print(" request failed: %s" % exc)
        continue
    deadline = time.time() + wait
    ok = False
    while time.time() < deadline:
        time.sleep(3)
        cur = {x["id"]: x for x in status()}
        if cur[sid]["state"] == "up":
            ok = True
            break
    print(" %s (%ds)" % ("UP" if ok else "still down", wait if not ok else 0))

print()
final = status()
for s in final:
    mark = "UP  " if s["state"] == "up" else "DOWN"
    print("  %-18s %s  supervised=%s" % (s["id"], mark, s["supervised"]))

down = [s["id"] for s in final if s["state"] != "up"]
sys.exit(1 if down else 0)
