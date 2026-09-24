r"""Does the consumer take its datums from RPA/API's geometry?

Three things have to hold, and none of them can be checked by running the
consumer - it needs RabbitMQ, SQL Server and the model service:

  1. handlers.py still parses, and the datum INSERT binds exactly as many
     values as the shared statement has placeholders. A miscount is a runtime
     ProgrammingError that only shows up mid-ballooning, after the model has
     already been paid for.
  2. Geometry OUTRANKS the text rule. A balloon whose OCR text lost the
     triangle - "A" alone - must still come out flagged when a triangle was
     found sitting on it, and the old text rule alone says no.
  3. A datum the OCR pass never produced a balloon for is ADDED, not dropped,
     and is skipped when the operator has tombstoned it.

    python .mssql-scripts/check_datum_from_geometry.py
"""

import ast
import os
import sys

RFQ = r"C:\Aizera\RPA\RFQ"
HANDLERS = os.path.join(RFQ, "handlers.py")
sys.path.insert(0, RFQ)

fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + str(detail) if detail else ''}")
    if not ok:
        fails.append(name)


print("1. handlers.py parses, and the datum INSERT binds the right count")
source = open(HANDLERS, encoding="utf-8").read()
try:
    tree = ast.parse(source)
    check("handlers.py parses", True)
except SyntaxError as e:
    check("handlers.py parses", False, f"line {e.lineno}: {e.msg}")
    print(f"\n{len(fails)} FAILED")
    sys.exit(1)

# The shared statement's placeholder count, read off the source rather than
# assumed - it has been edited before and will be again.
fn = next(n for n in ast.walk(tree)
          if isinstance(n, ast.FunctionDef) and n.name == "ballooning_in_thread")
sql = next(n.value.value for n in ast.walk(fn)
           if isinstance(n, ast.Assign) and isinstance(n.value, ast.Constant)
           and getattr(n.targets[0], "id", "") == "insert_sql")
placeholders = sql.count("?")
print(f"        insert_sql has {placeholders} placeholders")

# Every cursor.execute(insert_sql, ...) in the function must match it.
calls = [n for n in ast.walk(fn)
         if isinstance(n, ast.Call)
         and isinstance(n.func, ast.Attribute) and n.func.attr == "execute"
         and n.args and getattr(n.args[0], "id", "") == "insert_sql"]
check("both the balloon and the datum insert are present", len(calls) == 2, len(calls))
for i, call in enumerate(calls):
    bound = len(call.args) - 1        # minus the statement itself
    check(f"insert #{i + 1} at line {call.lineno} binds {placeholders}",
          bound == placeholders, bound)

print("\n2. geometry outranks the text rule")
import handlers                                                   # noqa: E402
from feature_symbols import is_datum_symbol                        # noqa: E402

# A 4000x3000 page. The triangle sits at (1000,1500); OCR read the letter box
# beside it but lost the triangle, so the text is a bare "A".
PAGE_W, PAGE_H = 4000, 3000
api_datums = [{
    "Letter": "A", "Symbol": "A", "OriginalSymbol": "A",
    "BBoxX1": 1000, "BBoxY1": 1500, "BBoxX2": 1060, "BBoxY2": 1560,
    "CenterX": 1030, "CenterY": 1530, "Confidence": 0.75,
}]
datums = handlers._datum_boxes(api_datums, PAGE_W, PAGE_H)
check("the pass converts to page percentages",
      abs(datums[0]["cx"] - 25.75) < 0.01 and abs(datums[0]["cy"] - 51.0) < 0.01,
      (datums[0]["cx"], datums[0]["cy"]))

# The balloon OCR produced over the same spot, its box a little wider.
balloon_box = (24.5, 49.5, 27.0, 52.5)
check("the old text rule alone would MISS this datum", not is_datum_symbol("A"))
hit = handlers._claim_datum(datums, balloon_box)
check("geometry finds it anyway", hit is not None)
check("and the datum is now claimed", datums[0]["claimed"])
check("a second balloon cannot claim the same triangle",
      handlers._claim_datum(datums, balloon_box) is None)

# A balloon somewhere else must not be dragged in.
far = handlers._datum_boxes(api_datums, PAGE_W, PAGE_H)
check("a balloon elsewhere on the sheet is not flagged",
      handlers._claim_datum(far, (60.0, 10.0, 63.0, 12.0)) is None)

print("\n2b. the whole-symbol box is drawn, but only the letter box matches")
# BBox now spans triangle + leader + letter so a client can outline the whole
# mark. That box is far too coarse to decide OWNERSHIP: a datum with a long
# leader crosses a third of the sheet, and matching on it would flag every
# dimension the leader passes over.
wide = handlers._datum_boxes([{
    "Letter": "C", "Symbol": "C", "OriginalSymbol": "C",
    # 314 x 128 px, taken from a real sheet: leader running up and left.
    "BBoxX1": 1972, "BBoxY1": 1073, "BBoxX2": 2286, "BBoxY2": 1201,
    "LetterBoxX1": 2216, "LetterBoxY1": 1134,
    "LetterBoxX2": 2286, "LetterBoxY2": 1201,
    "CenterX": 2251, "CenterY": 1167.5, "Confidence": 0.9,
}], PAGE_W, PAGE_H)[0]
check("the drawn box is the whole symbol",
      round(wide["box"][2] - wide["box"][0], 2) == round(314 / PAGE_W * 100, 2),
      wide["box"])
check("the match box is only the letter",
      round(wide["match"][2] - wide["match"][0], 2) == round(70 / PAGE_W * 100, 2),
      wide["match"])

# A dimension sitting under the leader, nowhere near the letter.
crossed = (_to_pct := lambda v, e: max(0.0, min(100.0, v / e * 100)))
under_leader = (_to_pct(2000, PAGE_W), _to_pct(1080, PAGE_H),
                _to_pct(2060, PAGE_W), _to_pct(1100, PAGE_H))
check("a dimension the leader merely crosses is NOT claimed",
      handlers._claim_datum([dict(wide)], under_leader) is None, under_leader)
# But the balloon over the letter still is.
on_letter = (_to_pct(2210, PAGE_W), _to_pct(1130, PAGE_H),
             _to_pct(2290, PAGE_W), _to_pct(1205, PAGE_H))
check("the balloon over the letter still is",
      handlers._claim_datum([dict(wide)], on_letter) is not None, on_letter)

# And the row written for an unclaimed datum carries the whole-symbol box.
check("an added datum row is boxed round the whole symbol",
      wide["box"][2] - wide["box"][0] > wide["match"][2] - wide["match"][0])

print("\n3. an uncovered datum is added, numbered past the engine's")
check("next number follows the highest, composites included",
      handlers._next_balloon_no(
          [{"BalloonNo": "1"}, {"BalloonNo": "12-3"}, {"BalloonNo": ""}]) == 13,
      handlers._next_balloon_no(
          [{"BalloonNo": "1"}, {"BalloonNo": "12-3"}, {"BalloonNo": ""}]))
check("an empty page starts at 1", handlers._next_balloon_no([]) == 1)

# What the row will read as, and the rule that keeps the two classifiers from
# disagreeing about it later.
marker = handlers.DATUM_MARKER + datums[0]["letter"]
check(f"the added row reads {marker!r}", marker == "\u25b2A")
check("and the widget's own text rule agrees with it", is_datum_symbol(marker))

# The unread-letter case: still a real finding, still a legible marker.
blank = handlers._datum_boxes(
    [dict(api_datums[0], Letter="?", Symbol="?")], PAGE_W, PAGE_H)
check("an unread letter degrades to the bare triangle",
      handlers.DATUM_MARKER + blank[0]["letter"] == "\u25b2")

print("\n4. the switches are real, and default to the documented values")
import yaml                                                        # noqa: E402

cfg = (yaml.safe_load(open(os.path.join(RFQ, "config.yaml"), encoding="utf-8"))
       .get("Processing", {}).get("Datums"))
check("Processing.Datums exists in config.yaml", isinstance(cfg, dict), cfg)
if isinstance(cfg, dict):
    check("AddMissing ships on", cfg.get("AddMissing") is True, cfg.get("AddMissing"))
    check("AddMinConfidence defers to the API", cfg.get("AddMinConfidence") == 0.0,
          cfg.get("AddMinConfidence"))
    # There must be no "use geometry" switch anywhere. The OpenCV pass runs in
    # the middleware on every upload regardless, so an off position would cost
    # the same and return less - a knob that can only make things worse.
    check("there is no Enabled switch", "Enabled" not in cfg, list(cfg))
check("handlers read both as fallbacks", (handlers.DATUMS_ADD_MISSING is True
                                          and handlers.DATUMS_ADD_MIN_CONFIDENCE == 0.0),
      (handlers.DATUMS_ADD_MISSING, handlers.DATUMS_ADD_MIN_CONFIDENCE))
check("and DATUMS_ENABLED is gone", not hasattr(handlers, "DATUMS_ENABLED"))

# The guards are per-run locals, not the module constants - that is what lets a
# setting change without a restart (section 5). Asserted against the source so
# a refactor that reaches back for a constant, and so silently pins the whole
# queue to whatever the file said at import, fails here.
src = open(HANDLERS, encoding="utf-8").read()
check("the datum list is read unconditionally",
      "datums = _datum_boxes(payload.get(\"datums\") or [], page_w, page_h)" in src)
check("AddMissing gates only the loop that inserts",
      "datums if datums_add_missing else []" in src)
check("the floor is applied to added rows only",
      "< datums_add_min_conf" in src)
check("no guard reads the module constant directly",
      "datums if DATUMS_ADD_MISSING" not in src
      and "< DATUMS_ADD_MIN_CONFIDENCE" not in src)

# An API too old to send the key yields an empty list, and that must still
# work: nothing claims a balloon, and every balloon falls back to the symbol
# test exactly as it did before the geometric pass existed.
none_sent = handlers._datum_boxes([], PAGE_W, PAGE_H)
check("an API sending no datums degrades to the symbol test",
      handlers._claim_datum(none_sent, (24.5, 49.5, 27.0, 52.5)) is None)

# And the floor: a 0.75 datum is added at the default and rejected at 0.8.
low = handlers._datum_boxes(
    [dict(api_datums[0], Confidence=0.75)], PAGE_W, PAGE_H)[0]
check("0.75 passes the default floor of 0", (low["confidence"] or 0) >= 0.0)
check("0.75 is held back by a floor of 0.8", not (low["confidence"] or 0) >= 0.8)

print("\n5. the live values come from the database, not the file")
# config.yaml is only the fallback now. The point of the table is that the
# widget and this consumer read the SAME answer, so this checks the consumer
# really reaches for it - and that a table it cannot read degrades to the file
# rather than to nothing.
import pyodbc                                                      # noqa: E402

conn = pyodbc.connect(
    'DRIVER={' + handlers.DB_DRIVER + '};'
    f'SERVER={handlers.DB_SERVER};DATABASE={handlers.DB_DATABASE};'
    f'UID={handlers.DB_UID};PWD={handlers.DB_PWD}')
cur = conn.cursor()

add_missing, floor, source = handlers._load_datum_settings(cur)
check("the settings came from MasterSettings", source == "MasterSettings", source)
check("and match the seeded row", (add_missing, floor) == (True, 0.0),
      (add_missing, floor))

# Flip a switch in the database and read it back - no restart, which is the
# whole reason for moving off the module-level constants.
cur.execute("UPDATE dbo.MasterSettings SET DatumAddMissing = 0, "
            "DatumAddMinConfidence = 0.80")
cur.commit()
try:
    add2, floor2, _ = handlers._load_datum_settings(cur)
    check("a change is picked up without restarting", add2 is False, add2)
    check("the confidence floor round-trips as a float", floor2 == 0.80, floor2)
    check("the module constant is NOT what is used",
          handlers.DATUMS_ADD_MISSING is True and add2 is False)
finally:
    cur.execute("UPDATE dbo.MasterSettings SET DatumAddMissing = 1, "
                "DatumAddMinConfidence = 0")
    cur.commit()

# A missing table must fall back to the file, not blow up the ballooning run.
class DeadCursor:
    def execute(self, *a, **k):
        raise RuntimeError("Invalid object name 'dbo.MasterSettings'.")


dead = handlers._load_datum_settings(DeadCursor())
check("an unreadable table falls back to config.yaml", dead[2] == "config.yaml", dead[2])
check("and the fallback carries the file's values",
      dead[:2] == (handlers.DATUMS_ADD_MISSING,
                   handlers.DATUMS_ADD_MIN_CONFIDENCE), dead[:2])
cur.close()
conn.close()

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
