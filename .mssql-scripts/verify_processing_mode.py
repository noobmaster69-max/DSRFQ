"""Checks the Processing.Mode switch without running a real drawing.

Confirms that serial actually serialises (stages do not overlap and run in
order) and that parallel actually overlaps, plus that a bad value falls back
safely rather than crashing the consumer at import.
"""
import importlib
import os
import sys
import threading
import time

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
os.chdir(r"C:\Aizera\RPA\RFQ")

failures = []


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + ((" -- " + detail) if detail else ""))
    if not ok:
        failures.append(label)


def load(mode, stages=None):
    """Import handlers with Processing.Mode (and optionally Stages) forced."""
    import yaml

    with open("config.yaml", "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    cfg.setdefault("Processing", {})["Mode"] = mode
    if stages is not None:
        cfg["Processing"]["Stages"] = stages

    real_safe_load = yaml.safe_load
    yaml.safe_load = lambda *a, **k: cfg
    try:
        for name in ("handlers",):
            sys.modules.pop(name, None)
        return importlib.import_module("handlers")
    finally:
        yaml.safe_load = real_safe_load


def timeline(handlers):
    """Run two stages that each take 0.3s and record when each was active."""
    events = []
    lock = threading.Lock()

    def stage(name):
        def run():
            with lock:
                events.append(("start", name, time.perf_counter()))
            time.sleep(0.3)
            with lock:
                events.append(("end", name, time.perf_counter()))
        return run

    threads = handlers.run_stages("test", [
        ("one", stage("one"), ()),
        ("two", stage("two"), ()),
    ])
    for t in (threads or []):
        t.join()
    return events


def overlapped(events):
    """True if stage two started before stage one ended."""
    starts = {n: t for k, n, t in events if k == "start"}
    ends = {n: t for k, n, t in events if k == "end"}
    return starts.get("two", 0) < ends.get("one", 0)


print("=== serial ===")
h = load("serial")
check("mode parsed as serial", h.PROCESSING_MODE == "serial", h.PROCESSING_MODE)
check("OCR slot is a real semaphore", isinstance(h.OCR_SLOT, type(threading.Semaphore(1))))
ev = timeline(h)
order = [n for k, n, _ in ev if k == "start"]
check("stages ran in order", order == ["one", "two"], str(order))
check("stages did not overlap", not overlapped(ev))

print("\n=== parallel ===")
h = load("parallel")
check("mode parsed as parallel", h.PROCESSING_MODE == "parallel", h.PROCESSING_MODE)
check("OCR slot does not limit", not isinstance(h.OCR_SLOT, type(threading.Semaphore(1))))
ev = timeline(h)
check("stages overlapped", overlapped(ev))

print("\n=== bad value ===")
h = load("sideways")
check("falls back to serial", h.PROCESSING_MODE == "serial", h.PROCESSING_MODE)

print("\n=== stage selection ===")
h = load("serial", ["title-block"])
check("only title-block enabled", h.ENABLED_STAGES == ["title-block"], str(h.ENABLED_STAGES))
check("global-ocr (3500) is off", not h.stage_enabled("global-ocr"))
check("material (3501) is off", not h.stage_enabled("material"))
check("title-block (3600) is on", h.stage_enabled("title-block"))

h_all = load("serial", ["title-block", "material", "global-ocr"])
check("all three can be re-enabled",
      all(h_all.stage_enabled(s) for s in ("title-block", "material", "global-ocr")))


class FakeCursor:
    """Records what the finaliser would write."""

    def __init__(self):
        self.statements = []

    def execute(self, sql, *params):
        self.statements.append((" ".join(sql.split()), params))

    def commit(self):
        pass


print("\n=== finaliser (runs only when global-ocr is off) ===")
RESPONSE = {
    "table_content": {"PART NUMBER": "0023-62709", "REVISION": "01",
                      "DESCRIPTION": "BRIDGE, GRIPPING, HBBX", "MATERIAL": ""},
    "title_block": {"part1": {"COMPANY": "APPLIED MATERIALS",
                              "DRAWING NO.": "0023-62709", "MATERIAL": "AL 6061"}},
}

cur = FakeCursor()
h.finalize_from_title_block(5, cur, RESPONSE)
written = " | ".join(s for s, _ in cur.statements)
params = [p for _, p in cur.statements]
check("writes the part fields", "UPDATE dbo.CostingParts SET" in written)
check("closes OCR status", "OcrStatusID = 3" in written, written[-90:])
flat = [str(x) for group in params for x in group]
check("part number taken from table_content", "0023-62709" in flat, str(flat))
check("customer taken from title_block COMPANY", "APPLIED MATERIALS" in flat)
check("blank MATERIAL falls back to title_block", "AL 6061" in flat, str(flat))

cur2 = FakeCursor()
h_all.finalize_from_title_block(5, cur2, RESPONSE)
check("does nothing when global-ocr is on", not cur2.statements,
      "%d statement(s)" % len(cur2.statements))

print("\n=== configured values in config.yaml ===")
import yaml

with open("config.yaml", "r", encoding="utf-8") as f:
    proc = yaml.safe_load(f).get("Processing", {})
print("  Processing.Mode   =", proc.get("Mode"))
print("  Processing.Stages =", proc.get("Stages"))
configured = proc.get("Mode")

print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
