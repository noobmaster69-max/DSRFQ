"""Upload runs only the stages that were ticked (RFQ consumer + upload dialog).

  1. requested_stages: reads the part's list, NULL/blank/junk means all three
  2. the hand-offs honour it: costing skipped hands straight to ballooning,
     ballooning skipped stops the chain
  3. the upload dialog offers three boxes, all ticked, sends what is ticked,
     and refuses to untick the last one

    C:\\Aizera\\RPA\\PythonLibrary\\.venv\\Scripts\\python.exe check_requested_stages.py
"""
import ast
import os
import sys

SRC = r"C:\Aizera\RPA\RFQ\handlers.py"
src = open(SRC, encoding="utf-8").read()
tree = ast.parse(src)
want = {"requested_stages", "maybe_start_costing", "maybe_start_ballooning", "ballooning_without_costing"}
code = "\n\n".join(ast.get_source_segment(src, n) for n in tree.body
                   if isinstance(n, ast.FunctionDef) and n.name in want)

fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


class Cursor:
    """Answers the three queries these helpers make."""

    def __init__(self, stages, conversion=3, costing=1, balloon=1, balloons=0, pages=1):
        self.stages, self.conversion, self.costing, self.balloon, self.balloons = stages, conversion, costing, balloon, balloons
        self.pages = pages
        self.sql, self._row = [], None

    def execute(self, sql, *args):
        self.sql.append(sql)
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


def run(stages, **kw):
    sent = []
    ns = {**BASE, "send_message": lambda q, m: sent.append(q)}
    exec(code, ns)
    cur = Cursor(stages, **kw)
    ns["maybe_start_costing"](7, cur)
    return sent, ns, cur


print("1. reading the list")
ns = {**BASE, "send_message": lambda q, m: None}
exec(code, ns)
rs = ns["requested_stages"]
check("all three when NULL", rs(Cursor(None), 7) == {"drawing", "costing", "ballooning"})
check("all three when blank", rs(Cursor("  "), 7) == {"drawing", "costing", "ballooning"})
check("just what is listed", rs(Cursor("ballooning"), 7) == {"ballooning"})
check("spacing and case do not matter", rs(Cursor(" Drawing , BALLOONING "), 7) == {"drawing", "ballooning"})
check("junk alone falls back to all three", rs(Cursor("nonsense"), 7) == {"drawing", "costing", "ballooning"})


class Broken(Cursor):
    def execute(self, sql, *args):
        raise RuntimeError("db down")


check("a database error falls back to all three", rs(Broken(None), 7) == {"drawing", "costing", "ballooning"})

print("\n2. the hand-offs")
sent, _, _ = run("drawing,costing,ballooning")
check("all ticked: costing is queued", sent == ["Costing"], sent)
sent, _, _ = run("drawing,ballooning")
check("costing unticked: ballooning is queued instead", sent == ["Ballooning"], sent)
sent, _, _ = run("drawing")
check("drawing only: nothing else is queued", sent == [], sent)
sent, _, _ = run("drawing,costing")
check("ballooning unticked: costing still runs", sent == ["Costing"], sent)

ns2 = {**BASE, "send_message": lambda q, m: None}
exec(code, ns2)
cur = Cursor("drawing,costing")
check("ballooning unticked is refused even when asked directly",
      ns2["maybe_start_ballooning"](7, cur) is False)
cur = Cursor("drawing,ballooning")
check("ballooning ticked is queued when costing cannot run",
      ns2["maybe_start_ballooning"](7, cur) is True)

print("\n3. the upload dialog")
dlg = open(r"C:\Aizera\DSRFQ\DSRFQ.Web\Modules\Costing\Drawing\DrawingImportDialog.ts", encoding="utf-8").read()
check("three stages offered", all(f"stage: '{s}'" in dlg for s in ("drawing", "costing", "ballooning")))
check("all ticked by default", "new Set<Stage>(['drawing', 'costing', 'ballooning'])" in dlg and 'type="checkbox" value="${s.stage}" checked' in dlg)
check("the last tick cannot be removed", "this.stages.size > 1" in dlg)
check("what was ticked is sent with the part", "RequestedStages: STAGE_CHOICES" in dlg)
api = open(r"C:\Aizera\DSRFQ\DSRFQ.Web\Modules\Common\General\ApiController.cs", encoding="utf-8-sig").read()
check("the server queues the first ticked stage", 'Wants("drawing") ? "NewCostingParts"' in api and 'Wants("ballooning") ? "Ballooning"' in api)
check("skipped stages are marked, not left pending", "StageSkipped" in api and "private const int StageSkipped = 7;" in api)

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
