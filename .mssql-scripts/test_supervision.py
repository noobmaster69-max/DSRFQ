"""Prove the supervisor restarts a service that dies on its own.

Killing the process directly (not through /api/stop) is the whole test: a
panel-initiated stop must stay stopped, an unexpected death must not.
"""
import json
import socket
import subprocess
import sys
import time
import urllib.request

PANEL = "http://localhost:7171"
TARGET = sys.argv[1] if len(sys.argv) > 1 else "new-tsh"


def status(sid=None):
    d = json.load(urllib.request.urlopen(PANEL + "/api/status", timeout=120))
    return {s["id"]: s for s in d}[sid] if sid else d


def pid_on(port):
    out = subprocess.run(["netstat", "-ano", "-p", "TCP"],
                         capture_output=True, text=True).stdout
    for line in out.splitlines():
        parts = line.split()
        if len(parts) >= 5 and parts[3] == "LISTENING" and parts[1].endswith(":%d" % port):
            return int(parts[4])
    return None


s = status(TARGET)
print("target: %s (port %s), state=%s supervised=%s"
      % (TARGET, s["port"], s["state"], s["supervised"]))
if s["state"] != "up" or not s["supervised"]:
    print("FAIL: target must be up and supervised before the test")
    sys.exit(1)

pid = pid_on(s["port"])
print("killing pid %s ..." % pid)
subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"],
               capture_output=True, text=True)

# Confirm it actually went down, so a "still up" later is a restart and not
# a kill that never landed.
died = False
for _ in range(10):
    time.sleep(1)
    try:
        socket.create_connection(("127.0.0.1", s["port"]), timeout=1).close()
    except OSError:
        died = True
        break
print("port %s closed: %s" % (s["port"], died))
if not died:
    print("FAIL: process survived the kill; test is inconclusive")
    sys.exit(1)

print("waiting for the supervisor (checks every 15s)...")
back = False
t0 = time.time()
while time.time() - t0 < 150:
    time.sleep(5)
    cur = status(TARGET)
    if cur["state"] == "up":
        back = True
        break
    print("  %3ds  state=%s restarts=%s" % (time.time() - t0, cur["state"], cur["restarts"]))

cur = status(TARGET)
print("\nrecovered: %s after %ds (restarts in window: %s)"
      % (back, time.time() - t0, cur["restarts"]))
newpid = pid_on(cur["port"]) if back else None
print("new pid: %s (old %s)" % (newpid, pid))
print("PASS" if back and newpid != pid else "FAIL")
sys.exit(0 if back and newpid != pid else 1)
