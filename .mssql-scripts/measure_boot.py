"""How long a service really takes to answer after a cold start.

slow_start in services.yaml is the number that decides whether the supervisor
treats a booting service as a failed one, so it should come from a
measurement rather than a guess.
"""
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request

PANEL = "http://localhost:7171"
SID = sys.argv[1] if len(sys.argv) > 1 else "table-recognize"
ROUNDS = int(sys.argv[2]) if len(sys.argv) > 2 else 2


def status(sid):
    d = json.load(urllib.request.urlopen(PANEL + "/api/status", timeout=120))
    return {s["id"]: s for s in d}[sid]


def post(path):
    req = urllib.request.Request(PANEL + path, data=b"", method="POST")
    return json.load(urllib.request.urlopen(req, timeout=300))


svc = status(SID)
url = svc.get("open") or ""
print("%s (port %s)" % (svc["name"], svc["port"]))

times = []
for r in range(1, ROUNDS + 1):
    post("/api/stop/" + SID)
    for _ in range(20):
        time.sleep(1)
        if status(SID)["state"] != "up":
            break

    t0 = time.time()
    post("/api/start/" + SID)
    bound = None
    while time.time() - t0 < 420:
        try:
            urllib.request.urlopen("http://localhost:%d/docs" % svc["port"], timeout=3)
            bound = time.time() - t0
            break
        except Exception:
            time.sleep(1)
    if bound is None:
        print("  round %d: did not bind within 420s" % r)
    else:
        times.append(bound)
        print("  round %d: bound after %.0fs" % (r, bound))

if times:
    worst = max(times)
    print("\nslowest cold start: %.0fs" % worst)
    print("suggested slow_start: %d  (worst + 60%% headroom)" % int(worst * 1.6 + 10))
sys.exit(0 if times else 1)
