"""Watch the panel bring supervised services back, printing only on change."""
import json
import sys
import time
import urllib.request

PANEL = "http://localhost:7171"
LIMIT = float(sys.argv[1]) if len(sys.argv) > 1 else 360.0

t0, seen = time.time(), None
while time.time() - t0 < LIMIT:
    d = json.load(urllib.request.urlopen(PANEL + "/api/status", timeout=120))
    snap = tuple((s["id"], s["state"], s["supervised"], s["restarts"], s["gaveUp"]) for s in d)
    if snap != seen:
        seen = snap
        print("[%4ds] %s" % (time.time() - t0, "  ".join(
            "%s=%s%s" % (s["id"], s["state"], "*" if s["supervised"] else "")
            for s in d if not s["external"])))
        for s in d:
            if s["gaveUp"]:
                print("        gave up on %s: %s" % (s["id"], s["gaveUp"]))
    want = [s for s in d if s["supervised"] and not s["external"]]
    if want and all(s["state"] == "up" for s in want):
        print("\nall supervised services are up after %ds" % (time.time() - t0))
        sys.exit(0)
    time.sleep(10)

print("\ntimed out with some supervised services still down")
sys.exit(1)
