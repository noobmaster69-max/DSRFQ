"""Where does REPLACE-api-v2's 5-10 minutes actually go?

It writes one directory per stage under OUTPUT/, all named with the job's start
stamp. Directory creation/modification times therefore give a real per-stage
timeline without instrumenting the service.
"""
import os
import re
from datetime import datetime

ROOT = r"C:\Aizera\RPA\REPLACE-api-v2\REPLACE-api-v2\OUTPUT"

# Stage directory -> what that stage does.
STAGES = [
    ("step1_table", "flow 1: title-block table detect + replace"),
    ("step2_icon", "flow 2: icon detect + replace"),
    ("step3_ocr", "flow 3: full-page OCR + CrewAI analysis"),
    ("final", "flow 4 + assembly: text replace, paste, write PDF"),
]

STAMP = re.compile(r"(\d{8}_\d{6})$")


def sessions(stage_dir):
    """{stamp: (created, modified, file_count, bytes)} for one stage."""
    path = os.path.join(ROOT, stage_dir)
    out = {}
    if not os.path.isdir(path):
        return out
    for entry in os.scandir(path):
        if not entry.is_dir():
            continue
        m = STAMP.search(entry.name)
        if not m:
            continue
        count = size = 0
        newest = entry.stat().st_mtime
        for dirpath, _, names in os.walk(entry.path):
            for n in names:
                full = os.path.join(dirpath, n)
                try:
                    st = os.stat(full)
                except OSError:
                    continue
                count += 1
                size += st.st_size
                newest = max(newest, st.st_mtime)
        out[m.group(1)] = (entry.stat().st_ctime, newest, count, size)
    return out


by_stage = {name: sessions(name) for name, _ in STAGES}

# Profile the most recent job that reached the final stage.
stamps = sorted(by_stage["final"], reverse=True)
if not stamps:
    raise SystemExit("no completed jobs found under OUTPUT/final")

for stamp in stamps[:2]:
    job_start = datetime.strptime(stamp, "%Y%m%d_%H%M%S")
    print("=" * 78)
    print("job %s (started %s)" % (stamp, job_start.strftime("%H:%M:%S")))
    print("=" * 78)
    print("%-14s %-46s %8s %7s %9s" % ("stage", "what it does", "seconds", "files", "output"))
    print("-" * 78)

    total = 0.0
    prev_end = job_start.timestamp()
    for name, description in STAGES:
        entry = by_stage[name].get(stamp)
        if not entry:
            print("%-14s %-46s %8s" % (name, description, "-"))
            continue
        created, modified, count, size = entry
        # Stages run back to back, so a stage starts when the previous ended.
        start = max(prev_end, min(created, modified))
        seconds = max(0.0, modified - start)
        prev_end = modified
        total += seconds
        print("%-14s %-46s %8.0f %7d %8.1f MB"
              % (name, description, seconds, count, size / 1e6))

    print("-" * 78)
    print("%-14s %-46s %8.0f" % ("TOTAL", "", total))
    print()
