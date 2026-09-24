"""One-shot health check for the whole RFQ pipeline.

Answers, in order: is each service up, is the part in the database, did a
message reach the queue, and is a consumer attached to drain it.
"""
import base64
import io
import json
import re
import socket
import sys
import urllib.error
import urllib.request

import pyodbc

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 6
APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"

SERVICES = [
    ("DSRFQ web", 5001, "the app that publishes the message"),
    ("RabbitMQ", 5672, "carries the message to the consumer"),
    ("table-recognize", 3600, "title block + drawing conversion"),
    ("REPLACE-api-v2", 3500, "global OCR (only if enabled)"),
    ("table-to-json", 3501, "material (only if enabled)"),
    ("new_tsh", 8888, "costing"),
    ("RPA API", 8000, "ballooning middleware"),
    ("Bubble engine", 5998, "ballooning"),
    ("MySQL", 3307, "new_tsh database"),
]


def port_open(port, host="127.0.0.1", timeout=2.0):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


print("=" * 74)
print("SERVICES")
print("=" * 74)
down = []
for name, port, why in SERVICES:
    ok = port_open(port)
    if not ok:
        down.append(name)
    print("  %-18s %-6s %-4s %s" % (name, port, "UP" if ok else "DOWN", why))

print("\n" + "=" * 74)
print("QUEUES")
print("=" * 74)
try:
    req = urllib.request.Request(
        "http://localhost:15672/api/queues",
        headers={"Authorization": "Basic " + base64.b64encode(b"guest:guest").decode()})
    queues = json.load(urllib.request.urlopen(req, timeout=10))
    for q in sorted(queues, key=lambda q: q["name"]):
        if not q["name"].startswith(("Costing", "NewCostingParts", "Ballooning", "RetryOcr")):
            continue
        flag = ""
        if q.get("consumers", 0) == 0:
            flag = "   <-- NO CONSUMER: messages will sit here"
        elif q.get("messages_ready", 0) > 0:
            flag = "   <-- backlog"
        print("  %-24s ready=%-4s unacked=%-4s consumers=%s%s" % (
            q["name"], q.get("messages_ready", 0),
            q.get("messages_unacknowledged", 0), q.get("consumers", 0), flag))
except Exception as exc:
    print("  cannot reach the management API: %s" % exc)

print("\n" + "=" * 74)
print("PART %d" % PART)
print("=" * 74)
with io.open(APPSETTINGS, encoding="utf-8-sig") as f:
    raw = json.load(f)["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
try:
    conn = pyodbc.connect(
        "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
        "TrustServerCertificate=yes" % (
            g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
            g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")), timeout=90)
except Exception as exc:
    print("  SQL Server unreachable: %s" % exc)
    raise SystemExit(1)

cur = conn.cursor()
row = cur.execute("""
    SELECT p.ID, p.ProcessingMode, p.InsertDate,
           conv.Name, ocr.Name, ball.Name, cost.Name
    FROM dbo.CostingParts p
    LEFT JOIN dbo.MasterCostingStatus conv ON conv.ID = p.DrawingConversionStatusID
    LEFT JOIN dbo.MasterCostingStatus ocr  ON ocr.ID  = p.OcrStatusID
    LEFT JOIN dbo.MasterCostingStatus ball ON ball.ID = p.BalloonStatusID
    LEFT JOIN dbo.MasterCostingStatus cost ON cost.ID = p.CostingStatusID
    WHERE p.ID = ?""", PART).fetchone()

if not row:
    print("  no such part -- the upload did not create a CostingParts row")
else:
    print("  created        : %s" % row[2])
    print("  ProcessingMode : %s" % (row[1] or "(null -> consumer default)"))
    print("  Conversion=%s  OCR=%s  Balloon=%s  Costing=%s" % (row[3], row[4], row[5], row[6]))

print("\n  documents:")
docs = cur.execute("""
    SELECT ID, Type, FileName, FileDirectory FROM dbo.CostingPartDocuments
    WHERE CostingPartID = ? AND IsActive = 1 ORDER BY ID""", PART).fetchall()
if not docs:
    print("    NONE -- nothing was attached, so there is nothing to process")
for d in docs:
    kind = {1: "2D", 2: "3D", 3: "CAD"}.get(d[1], str(d[1]))
    print("    id=%-4s %-4s %s" % (d[0], kind, d[2]))

print("\n  recorded processing steps:")
steps = cur.execute("""
    SELECT TOP 8 Stage, Status, DurationMs, StartTime
    FROM dbo.CostingPartStageTimings
    WHERE CostingPartID = ? AND IsActive = 1 ORDER BY StartTime DESC""", PART).fetchall()
if not steps:
    print("    NONE -- the consumer never started work on this part")
for s in steps:
    print("    %-24s %-10s %8s  %s" % (s[0], s[1], s[2], s[3]))

conn.close()

print("\n" + "=" * 74)
print("LIKELY CAUSE")
print("=" * 74)
if down:
    print("  These are down: %s" % ", ".join(down))
if not docs:
    print("  The part has no documents attached.")
elif not steps:
    print("  Documents exist but no step was recorded: the message never reached")
    print("  a running consumer, or the consumer died before its first step.")
