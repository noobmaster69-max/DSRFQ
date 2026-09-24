"""Do the analysis's narrative fields survive the trip into the database?

/gongyi_tsh returns 41 fields. The consumer kept every numeric one and dropped
the two that carry words - specific_recommendations and quality_control - so
the advice the analysis produced reached nobody. This checks the joiner, then
runs the real UPDATE against the real table inside a rolled-back transaction.

    python .mssql-scripts/check_process_notes.py [part_id]
"""

import os
import re
import sys

RFQ = r"C:\Aizera\RPA\RFQ"

import pyodbc                                              # noqa: E402
import requests                                            # noqa: E402
import yaml                                                # noqa: E402

PART = sys.argv[1] if len(sys.argv) > 1 else "29"
fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + detail if detail else ''}")
    if not ok:
        fails.append(name)


print("1. the joiner")
src = open(os.path.join(RFQ, "handlers.py"), encoding="utf-8").read()
ns = {}
exec(compile(re.search(r"\ndef _join_notes.*?(?=\n(?:def |class |@))",       # noqa: S102
                       src, re.S).group(0), "handlers", "exec"), ns)
join = ns["_join_notes"]

check("a list becomes one block per line",
      join(["a", "b"]) == "a\nb", repr(join(["a", "b"])))
check("a bare string is accepted", join("only one") == "only one")
# Empty must be NULL, not "": a blank field reads in the UI as "the analysis
# ran and had nothing to say", which is a different claim from "never stored".
check("an empty list is None, not an empty string", join([]) is None)
check("a list of blanks is None", join(["", "  "]) is None)
check("None stays None", join(None) is None)
check("blank entries are dropped from a real list",
      join(["keep", " ", "also"]) == "keep\nalso")

print("\n2. what the service actually returns")
try:
    r = requests.get(f"http://localhost:8888/gongyi_tsh?quotation_id={PART}", timeout=90)
    body = r.json()
    data = (body.get("data") or {}).get("data_to_send") or {}
except Exception as exc:                                   # noqa: BLE001
    data = {}
    check("gongyi reachable", False, str(exc)[:120])

if data:
    check("gongyi answered with data", True, f"{len(data)} fields")
    recs = data.get("specific_recommendations")
    qc = data.get("quality_control")
    print(f"        specific_recommendations : {recs}")
    print(f"        quality_control          : {qc}")
    check("both narrative fields are present",
          recs is not None and qc is not None)
    check("the numbers we already keep are there too",
          data.get("face") is not None and data.get("hole") is not None,
          f"face={data.get('face')} hole={data.get('hole')}")

print("\n3. the UPDATE, against the real column")
cfg = yaml.safe_load(open(os.path.join(RFQ, "config.yaml"), encoding="utf-8"))["Database"]
cn = pyodbc.connect(
    f"DRIVER={{{cfg['Driver']}}};SERVER={cfg['Server']};DATABASE={cfg['Database']};"
    f"UID={cfg['Uid']};PWD={cfg['Pwd']};TrustServerCertificate=yes")
cur = cn.cursor()

check("ProcessRecommendations column exists",
      cur.execute("SELECT COL_LENGTH('dbo.CostingParts','ProcessRecommendations')").fetchval() is not None)
check("QualityControlNotes column exists",
      cur.execute("SELECT COL_LENGTH('dbo.CostingParts','QualityControlNotes')").fetchval() is not None)

try:
    cur.execute(
        "UPDATE dbo.CostingParts SET ProcessRecommendations = ?, "
        "QualityControlNotes = ?, UpdateDate = CURRENT_TIMESTAMP WHERE ID = ?",
        (join(data.get("specific_recommendations")),
         join(data.get("quality_control")), int(PART)))
    got = cur.execute(
        "SELECT ProcessRecommendations, QualityControlNotes "
        "FROM dbo.CostingParts WHERE ID = ?", int(PART)).fetchone()
    print(f"        stored recs : {got[0]!r}")
    print(f"        stored qc   : {got[1]!r}")
    check("the recommendation round-trips",
          got[0] == join(data.get("specific_recommendations")))
    check("the qc note round-trips",
          got[1] == join(data.get("quality_control")))
except Exception as exc:                                   # noqa: BLE001
    check("the UPDATE runs", False, str(exc)[:250])
finally:
    cn.rollback()

after = cur.execute(
    "SELECT ProcessRecommendations FROM dbo.CostingParts WHERE ID = ?", int(PART)).fetchval()
check("rollback left the row as it was", after is None, repr(after))
cn.close()

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
