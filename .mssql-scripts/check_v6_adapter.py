r"""Does the V6 adapter produce what One Supply's parser accepts?

Run against BOTH real payloads: the V6 response captured from 5999, and a
saved old-format response. The second matters as much as the first - the
adapter must be a no-op on the format that already worked, or fixing V6
breaks every older engine.

    python .mssql-scripts/check_v6_adapter.py
"""

import glob
import json
import os
import sys

BUBBLE = r"C:\Aizera\RPA\Bubble\(公共版)pyqt-bubble--api\(公共版)pyqt-bubble--api"
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BUBBLE)

fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + str(detail) if detail else ''}")
    if not ok:
        fails.append(name)


# Import the function alone - importing the module would pull in PySide6.
import re                                                       # noqa: E402
src = open(os.path.join(BUBBLE, "core", "cloud_ocr_worker.py"), encoding="utf-8").read()
body = re.search(r"\ndef _adapt_v6_response\(.*?(?=\n\nclass )", src, re.S).group(0)
ns = {"logger": type("L", (), {"info": lambda *a, **k: None})()}
exec(compile(body, "adapter", "exec"), ns)                      # noqa: S102
adapt = ns["_adapt_v6_response"]


def client_accepts(d):
    """The three checks in _call_cloud_api, reproduced exactly."""
    if not isinstance(d, dict):
        return False
    status = d.get("status_code", d.get("status"))
    if status is not None:
        if status in (200, 0, "200", "success", "ok"):
            if "data" in d and isinstance(d["data"], dict):
                return True
            return "rec_text" in d or "rec_texts" in d
        return False
    if ("rec_text" in d or "rec_texts" in d) and "rec_scores" in d:
        return True
    if "data" in d and isinstance(d["data"], dict):
        o = d["data"]
        return any(k in o for k in ("rec_text", "rec_texts", "normal", "tolerance", "rec_polys"))
    return False


print("1. the real V6 response from 5999")
v6_path = os.path.join(HERE, "v6_response.json")
if not os.path.exists(v6_path):
    sys.exit("run probe_v6_shape.py first")
v6 = json.load(open(v6_path, encoding="utf-8"))
check("raw V6 is REJECTED by the client (the bug)", not client_accepts(v6))

out = adapt(v6)
check("adapted V6 is accepted", client_accepts(out))
check("it gained a data wrapper", isinstance(out.get("data"), dict))
check("data carries normal", "normal" in out.get("data", {}))
check("table_info is at root too", "table_info" in out)
# The parser branches on 'normal' being present; without it the newest-format
# branch never runs and nothing is produced.
check("the parser's newest-format branch would fire", "normal" in out["data"])

print("\n2. every field V6 sent survives")
missing = [k for k in v6 if k not in out["data"]]
check("no root field was dropped", not missing, missing)

print("\n3. a populated response flattens correctly")
# The probe image was near-blank, so synthesise a populated one from the real
# shape rather than pretend 0 items proves the mapping.
populated = json.loads(json.dumps(v6))
populated["views"] = [{
    "view_id": 1, "core_bbox": [0, 0, 100, 100],
    "ocr_results": {
        "rec_text": ["\u2300.380", "1.250", ""],
        "rec_scores": [0.99, 0.97, 0.5],
        "rec_polys": [[[1, 1], [2, 1], [2, 2], [1, 2]], [[3, 3], [4, 3], [4, 4], [3, 4]], []],
        "type": ["dim", "dim", "x"],
        "belong": ["D8", "A1", "UNMATCHED"],
    }}]
res = adapt(populated)
normal = res["data"]["normal"]
check("empty text is skipped", len(normal) == 2, len(normal))
check("text is wrapped in a list", normal[0]["text"] == ["\u2300.380"], normal[0]["text"])
check("location is the polygon", normal[0]["location"] == [[1, 1], [2, 1], [2, 2], [1, 2]])
check("belong carries the grid cell", normal[0]["belong"] == "D8")
check("score is a string, as the old format had it",
      normal[0]["score"] == "0.99", normal[0]["score"])
check("a second view's items follow", normal[1]["belong"] == "A1")

print("\n4. the old format is untouched")
saved = sorted(glob.glob(os.path.join(os.path.expanduser("~"),
                                      ".yilian_app", "api_responses", "*.json")),
               key=os.path.getmtime)
if saved:
    old = json.load(open(saved[-1], encoding="utf-8"))
    check("old format was already accepted", client_accepts(old))
    same = adapt(old)
    # Identity, not merely "still accepted": a fix for V6 that quietly rewrote
    # working payloads would be a regression nobody would attribute to this.
    check("adapter is a no-op on it", same is old)
else:
    print("  (no saved old-format response to compare)")

print("\n5. junk in, junk out - safely")
check("None passes through", adapt(None) is None)
check("a list passes through", adapt([1, 2]) == [1, 2])
check("no views, no change", adapt({"foo": 1}) == {"foo": 1})

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
