"""A stage whose service is down must not hold the part.

With the title block reader (3600) or the costing engine (8888) stopped, an
upload that asked for all three stages used to stop dead: the drawing stage
left both its status columns at In Progress, nothing was ever handed on, and
ballooning - which needs neither of those services - never ran. These check the
part carries on to ballooning instead.

  1. the hand-off never dead-ends
  2. ballooning does not depend on the drawing stage, only on page images
  3. the drawing stage always leaves an end status
  4. the costing stage always leaves an end status

    C:\\Aizera\\RPA\\PythonLibrary\\.venv\\Scripts\\python.exe check_stage_handoff.py
"""
import ast
import sys

SRC = r"C:\Aizera\RPA\RFQ\handlers.py"
src = open(SRC, encoding="utf-8").read()
tree = ast.parse(src)
want = {"requested_stages", "maybe_start_costing", "maybe_start_ballooning",
        "ballooning_without_costing"}
code = "\n\n".join(ast.get_source_segment(src, n) for n in tree.body
                   if isinstance(n, ast.FunctionDef) and n.name in want)
funcs = {n.name: ast.get_source_segment(src, n) for n in tree.body
         if isinstance(n, ast.FunctionDef)}

fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


class Cursor:
    """Answers the queries these helpers make.

    `conversion` doubles as the OCR status, which is how the pipeline writes
    them: one service produces both.
    """

    def __init__(self, stages="drawing,costing,ballooning", conversion=3, costing=1,
                 balloon=1, balloons=0, pages=1):
        self.stages, self.conversion, self.costing = stages, conversion, costing
        self.balloon, self.balloons, self.pages = balloon, balloons, pages
        self.writes, self._row = [], None

    def execute(self, sql, *args):
        if sql.strip().upper().startswith("UPDATE"):
            self.writes.append((" ".join(sql.split()), args))
        if "RequestedStages" in sql:
            self._row = (self.stages,)
        elif "COUNT(*) FROM dbo.CostingPartBalloons" in sql:
            self._row = (self.balloons,)
        elif "COUNT(*) FROM dbo.CostingPartDocumentImages" in sql:
            self._row = (self.pages,)
        elif "DrawingConversionStatusID, OcrStatusID, CostingStatusID" in sql:
            self._row = (self.conversion, self.conversion, self.costing)
        elif "SELECT BalloonStatusID FROM" in sql:
            self._row = (self.balloon,)
        return self

    def fetchone(self):
        return self._row

    def commit(self):
        pass


BASE = {"ALL_STAGES": ("drawing", "costing", "ballooning"), "STATUS_SKIPPED": 7,
        "AUTO_COSTING": True, "AUTO_BALLOONING": True, "BALLOON_STATUS_NO_DRAWING": 6,
        "GREEN": "", "YELLOW": "", "BLUE": "", "RED": "", "RESET": ""}


def load():
    sent = []
    ns = {**BASE, "send_message": lambda q, m: sent.append(q)}
    exec(code, ns)
    return ns, sent


# MasterCostingStatus: 1 Pending, 2 In Progress, 3 Completed, 4 Failed,
# 5 Upload Failed, 6 No drawing, 7 Skipped.
print("1. the hand-off never dead-ends")

for label, conversion in [("the drawing stage failed", 4),
                          ("the drawing stage was left In Progress", 2),
                          ("the drawing stage is still Pending", 1),
                          ("the part has no 2D drawing", 6)]:
    ns, sent = load()
    cur = Cursor(conversion=conversion)
    ns["maybe_start_costing"](7, cur)
    check(f"{label}: ballooning is queued anyway", sent == ["Ballooning"], sent)

ns, sent = load()
cur = Cursor(conversion=4)
ns["maybe_start_costing"](7, cur)
check("costing itself is refused - it would price stale geometry",
      "Costing" not in sent, sent)

ns, sent = load()
ns["maybe_start_costing"](7, Cursor(conversion=4, balloons=12))
check("a part that already has balloons is not re-ballooned", sent == [], sent)

ns, sent = load()
ns["maybe_start_costing"](7, Cursor(conversion=4, stages="drawing,costing"))
check("ballooning that was never asked for stays unqueued", sent == [], sent)

ns, sent = load()
ns["maybe_start_costing"](7, Cursor(conversion=3))
check("a drawing that DID succeed still goes to costing first", sent == ["Costing"], sent)

print("\n2. ballooning depends on page images, not on the drawing stage")
ns, sent = load()
check("queued even though conversion failed, because the pages are there",
      ns["maybe_start_ballooning"](7, Cursor(conversion=4, pages=5)) is True)

cur = Cursor(conversion=3, pages=0)
ns, sent = load()
check("refused when the part has no page images",
      ns["maybe_start_ballooning"](7, cur) is False)
check("and that part is marked No drawing, not left Pending",
      any("BalloonStatusID = ?" in sql and 6 in args for sql, args in cur.writes),
      cur.writes)

ns, sent = load()
check("refused while ballooning is already running",
      ns["maybe_start_ballooning"](7, Cursor(balloon=2)) is False)

check("the conversion status is no longer a gate",
      "DrawingConversionStatusID" not in funcs["maybe_start_ballooning"])
check("it reads the as-uploaded renders (Original = 1)",
      "Original = 1" in funcs["maybe_start_ballooning"])

print("\n3. the drawing stage always leaves an end status")
tb = funcs["replace_title_block_in_thread"]
check("the call to the reader has a timeout", "timeout=RECOGNISE_TIMEOUT" in tb)
check("a short connect timeout, so a stopped service fails in seconds",
      "RECOGNISE_TIMEOUT = (5, " in src)
check("a reader that does not answer fails the stage",
      "except requests.exceptions.RequestException" in tb and "_fail_drawing_stage" in tb)
check("a reader that answers with an error fails the stage too",
      tb.count("_fail_drawing_stage") >= 2, tb.count("_fail_drawing_stage"))
fd = funcs["_fail_drawing_stage"]
check("it writes both columns", "DrawingConversionStatusID = 4" in fd and "OcrStatusID = 4" in fd)
check("it tells the operator which service to start",
      "control panel" in fd and "Progress" in fd)
check("it does not queue ballooning itself - maybe_start_costing does, once",
      "send_message(" not in fd and "maybe_start_ballooning" not in fd)

pd = funcs["process_document_in_thread"]
check("a stage that crashes without setting a status is swept to Failed",
      "DrawingConversionStatusID = 2 THEN 4" in pd)
check("the sweep runs before the hand-off",
      pd.index("THEN 4") < pd.index("maybe_start_costing(message, cursor)"))
check("OCR is left alone when global-ocr will still run",
      'sweep_ocr = not stage_enabled("global-ocr")' in pd)

mat = funcs["get_material_in_thread"]
check("the material reader cannot hang the part either",
      "timeout=RECOGNISE_TIMEOUT" in mat and "except requests.exceptions.RequestException" in mat)

print("\n4. the costing stage always leaves an end status")
up = funcs["retrieve_and_upload_files_in_thread"]
check("a costing service that will not sign in fails the part",
      "_fail_costing(cursor, message" in up)
fc = funcs["_fail_costing"]
check("and hands the part on to ballooning", "ballooning_without_costing" in fc)

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
