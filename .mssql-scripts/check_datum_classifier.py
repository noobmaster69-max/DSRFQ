r"""Do the two datum classifiers agree, and do they refuse a control frame?

Two implementations exist by necessity - the consumer classifies at insert
(Python) and the widget classifies balloons that predate it (TypeScript). They
must agree, or a balloon's flag flips depending on which one last looked at it.

The dangerous case is a feature control frame. "⌖ ⌀.005 A B C" CITES datums;
it is very much something to inspect. Calling it a datum feature would drop a
real characteristic out of the report.

    python .mssql-scripts/check_datum_classifier.py
"""

import os
import pathlib
import re
import subprocess
import sys

RFQ = r"C:\Aizera\RPA\RFQ"
TS = (r"C:\Aizera\DSRFQ\DSRFQ.Web\Modules\Common\Widgets\BallooningWidget"
      r"\BallooningDimensionFilter.ts")
sys.path.insert(0, RFQ)

from feature_symbols import is_datum_symbol                     # noqa: E402

fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + str(detail) if detail else ''}")
    if not ok:
        fails.append(name)


# A datum feature marker, and the forms OCR turns it into.
DATUMS = ["\u25B2", "\u25B2A", "A\u25B2", "\u25B3B", "\u2206C", "-A-", "- B -"]
# Not datum features. The control frames are the ones that matter.
NOT_DATUMS = [
    "\u2316 \u2300.005 A B C",       # position, cites A B C
    "\u25B1 .002 A",                 # flatness against datum A
    "\u22A5 0.05 A",                 # perpendicularity
    "\u2300.380", ".500 THRU", "45\u00B0", "",
    "SEE NOTE 4", "M8x1.25",
    "A", "B",                        # a bare letter is not a marker
]

print("1. the Python classifier (consumer, at insert)")
for t in DATUMS:
    check(f"datum: {t!r}", is_datum_symbol(t))
for t in NOT_DATUMS:
    check(f"not datum: {t!r}", not is_datum_symbol(t))

print("\n2. the TypeScript classifier (widget)")
# Run the real TS through node rather than reimplementing its rules here -
# a reimplementation would agree with itself and prove nothing.
cases = DATUMS + NOT_DATUMS
import json                                                     # noqa: E402

_here = os.path.dirname(os.path.abspath(__file__))
proc = subprocess.run(
    ["node", "--experimental-strip-types",
     # The classifier now reads the shop's filter settings through
     # BallooningSettingsStore, which needs a Serenity service and a browser.
     # The loader swaps it for an in-memory stub; see ts-stub-loader.mjs.
     "--import", pathlib.Path(_here, "ts-stub-loader.mjs").as_uri(),
     os.path.join(_here, "check_datum_ts.mjs"),
     json.dumps(cases)],
    capture_output=True, text=True, encoding="utf-8", cwd=r"C:\Aizera\DSRFQ")
out = [l for l in (proc.stdout or "").strip().splitlines() if l.startswith("[")]
if not out:
    check("the TypeScript classifier ran", False,
          (proc.stderr or "no output").strip().splitlines()[-1][:160])
else:
    ts_results = json.loads(out[-1])
    py_results = [is_datum_symbol(c) for c in cases]
    for c, ts, py in zip(cases, ts_results, py_results):
        if ts != py:
            check(f"AGREE on {c!r}", False, f"ts={ts} py={py}")
    check("both classifiers agree on every case", ts_results == py_results)
    # And spelled out for the one that matters most.
    frame = cases.index("\u2316 \u2300.005 A B C")
    check("a control frame citing A B C is NOT a datum feature",
          ts_results[frame] is False and py_results[frame] is False)

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
