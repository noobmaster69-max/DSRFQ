"""RFQ consumer: ballooning still runs when costing cannot (part 31, PDF only).

Lifts maybe_start_ballooning / ballooning_without_costing out of handlers.py
(its imports load ML models) and runs them against a fake cursor.

    python check_ballooning_without_costing.py
"""
import ast
import sys

SRC = r"C:\Aizera\RPA\RFQ\handlers.py"
src = open(SRC, encoding="utf-8").read()
tree = ast.parse(src)
# requested_stages comes along because maybe_start_ballooning calls it; without
# it the exec'd copy raised NameError inside the try in ballooning_without_
# costing, which swallowed it - so three of these checks were passing because
# nothing ran at all.
wanted = {"maybe_start_ballooning", "ballooning_without_costing", "requested_stages"}
code = "\n\n".join(ast.get_source_segment(src, n) for n in tree.body
                   if isinstance(n, ast.FunctionDef) and n.name in wanted)

fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


class Cursor:
    def __init__(self, balloons, conversion, balloon_status, pages=1, stages=None):
        self.balloons, self.conversion, self.balloon_status = balloons, conversion, balloon_status
        self.pages, self.stages = pages, stages
        self.sql, self._row = [], None

    def execute(self, sql, *args):
        self.sql.append(sql)
        if "RequestedStages" in sql:
            self._row = (self.stages,)
        elif "COUNT(*) FROM dbo.CostingPartBalloons" in sql:
            self._row = (self.balloons,)
        elif "COUNT(*) FROM dbo.CostingPartDocumentImages" in sql:
            self._row = (self.pages,)
        elif "SELECT BalloonStatusID FROM" in sql:
            self._row = (self.balloon_status,)
        return self

    def fetchone(self):
        return self._row

    def commit(self):
        pass


NS = {"AUTO_BALLOONING": True, "ALL_STAGES": ("drawing", "costing", "ballooning"),
      "BALLOON_STATUS_NO_DRAWING": 6,
      "GREEN": "", "YELLOW": "", "BLUE": "", "RED": "", "RESET": ""}


def run(balloons, conversion, balloon_status=1, auto=True, pages=1):
    sent = []
    ns = {**NS, "send_message": lambda q, m: sent.append((q, m)), "AUTO_BALLOONING": auto}
    exec(code, ns)
    cur = Cursor(balloons, conversion, balloon_status, pages)
    ns["ballooning_without_costing"](31, cur, "no 3D model to cost")
    return sent, cur


sent, cur = run(balloons=0, conversion=3)
check("PDF-only part, drawing converted, no balloons -> ballooning queued", sent == [("Ballooning", 31)], sent)
check("its balloon status is set back to Pending first", any("BalloonStatusID = 1" in s for s in cur.sql))
sent, _ = run(balloons=25, conversion=3)
check("a part that already has balloons is left alone", sent == [], sent)

# Changed deliberately. Recognition reads the AS-UPLOADED page renders, which
# DSRFQ writes at upload; the drawing stage produces the *converted* pages and
# the title block fields, neither of which ballooning uses. Refusing here left a
# part with perfectly good pages unballooned whenever the title block reader
# (3600) was down - the whole point of the stage hand-off fix.
sent, _ = run(balloons=0, conversion=4)
check("a drawing whose conversion failed is ballooned anyway", sent == [("Ballooning", 31)], sent)
sent, cur = run(balloons=0, conversion=6, pages=0)
check("a part with no page images is not ballooned", sent == [], sent)
check("and is marked No drawing rather than left Pending",
      any("BalloonStatusID = ?" in s for s in cur.sql), cur.sql)

sent, _ = run(balloons=0, conversion=3, balloon_status=2)
check("ballooning already running is not queued twice", sent == [], sent)
sent, _ = run(balloons=0, conversion=3, auto=False)
check("AutoBallooning off is respected", sent == [], sent)


class Broken(Cursor):
    def execute(self, sql, *args):
        raise RuntimeError("connection lost")


ns = {**NS, "send_message": lambda q, m: None}
exec(code, ns)
try:
    ns["ballooning_without_costing"](31, Broken(0, 3, 1), "costing failed")
    check("never raises inside failure handling", True)
except Exception as e:
    check("never raises inside failure handling", False, e)

# def + the six places the chain can stop short: costing not asked for, auto
# costing off, the drawing stage did not finish, no 3D model, the upload to the
# costing service failed, costing failed.
calls = src.count("ballooning_without_costing(")
check("wired into every place the chain gives up (def + 6 calls)", calls == 7, calls)

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
