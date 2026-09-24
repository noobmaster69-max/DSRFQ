"""Render a STEP from a worker thread, twice, the way the consumer does.

The first attempt failed in production but succeeded when called directly:
gmsh.initialize() installs a SIGINT handler, and signal.signal() off the main
thread raises. Rendering twice also covers the "Gmsh has already been
initialized" warning that followed.
"""
import os
import sys
import threading
import time

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
os.chdir(r"C:\Aizera\RPA\RFQ")

from function import render_isometric_view

STEP = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\9\715-303824-001A.STP"
OUT = r"C:\Aizera\DSRFQ\.mssql-scripts\iso-threaded-%d.png"

results = {}


def render(n):
    started = time.time()
    results[n] = (render_isometric_view(STEP, OUT % n), time.time() - started)


failures = []
for n in (1, 2):
    t = threading.Thread(target=render, args=(n,))
    t.start()
    t.join(timeout=180)
    path, took = results.get(n, (None, 0))
    ok = path is not None and os.path.exists(path) and os.path.getsize(path) > 5000
    print(("  PASS  " if ok else "  FAIL  ") +
          "render %d from a worker thread -- %s (%.1fs, %s bytes)"
          % (n, path, took,
             os.path.getsize(path) if path and os.path.exists(path) else 0))
    if not ok:
        failures.append("render %d" % n)

print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
