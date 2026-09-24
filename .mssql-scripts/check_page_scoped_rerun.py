r"""Does "This Page" actually stay on this page?

It did not, and every link in the chain looked correct on its own. The widget
sent PageNumber, the endpoint honoured it when clearing, and the RabbitMQ
message carried {"Id","Page"}. What was missing sat between them: the endpoint
writes the CostingPartQueue row BEFORE publishing, that row had no Payload
column in its INSERT, and the consumer's own enqueue keeps whichever row it
finds rather than adding a second - so the page was dropped and the dispatcher
started a whole-document run from a bare part id.

That is why this checks the ROW, not the message. The row is what the
dispatcher runs from.

    python .mssql-scripts/check_page_scoped_rerun.py [part_id] [page]
"""

import json
import os
import subprocess
import sys

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 12
PAGE = int(sys.argv[2]) if len(sys.argv) > 2 else 2
BASE = "http://localhost:5001"
RFQ = r"C:\Aizera\RPA\RFQ"
sys.path.insert(0, RFQ)

fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + str(detail) if detail else ''}")
    if not ok:
        fails.append(name)


def sql(query):
    out = subprocess.run(
        ["sqlcmd", "-S", "deskdev,65001", "-U", "sa", "-P", "Tsh9989", "-C",
         "-W", "-h", "-1", "-s", "|", "-Q", f"USE RFQ; SET NOCOUNT ON; {query}"],
        capture_output=True, text=True, encoding="utf-8")
    return [l.strip() for l in (out.stdout or "").splitlines()
            if l.strip() and not l.startswith("Changed database")]


print("1. the endpoint writes the scope onto the queue row")
# Start clean: no live ballooning row for this part, or the endpoint refuses.
sql(f"UPDATE dbo.CostingPartQueue SET IsActive = 0 "
    f"WHERE CostingPartID = {PART} AND Lane = 'ballooning';")
sql(f"UPDATE dbo.CostingParts SET BalloonStatusID = 3 WHERE ID = {PART};")

from playwright.sync_api import sync_playwright                    # noqa: E402

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1600, "height": 950})
    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.wait_for_timeout(1500)
    u = page.get_by_placeholder("user name")
    if u.count():
        u.fill("admin")
        page.get_by_placeholder("password").fill("serenity")
        page.get_by_role("button", name="Sign In").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)

    # Call the service directly. The button is a confirm() dialog and two
    # clicks away; what is under test is the endpoint, not the prompt.
    result = page.evaluate(
        """async ([part, pg]) => {
            const res = await fetch('/Services/Costing/CostingParts/Rerun', {
                method: 'POST',
                headers: {'Content-Type': 'application/json',
                          'X-CSRF-TOKEN': (document.cookie.match(
                              /CSRF-TOKEN=([^;]+)/) || [])[1] || ''},
                body: JSON.stringify({CostingPartId: part, Stage: 3,
                                      Force: true, PageNumber: pg}),
            });
            return {status: res.status, body: (await res.text()).slice(0, 300)};
        }""", [PART, PAGE])
    print(f"        Rerun -> {result['status']} {result['body'][:140]}")
    check("the endpoint accepted the page-scoped re-run", result["status"] == 200,
          result["body"][:160])
    browser.close()

row = sql(f"SELECT TOP 1 ID, ISNULL(Payload,'<null>'), Status "
          f"FROM dbo.CostingPartQueue WHERE CostingPartID = {PART} "
          f"AND Lane = 'ballooning' AND IsActive = 1 ORDER BY ID DESC;")
print(f"        queue row: {row}")
check("a ballooning queue row exists", bool(row), row)
payload = row[0].split("|")[1] if row else "<none>"
check("the row carries the page, not NULL", payload != "<null>", payload)
if payload != "<null>":
    try:
        parsed = json.loads(payload)
        check(f"and it names page {PAGE}", parsed.get("Page") == PAGE, parsed)
        check("and the right part", parsed.get("Id") == PART, parsed)
    except ValueError:
        check("the payload is JSON", False, payload)

print("\n2. the dispatcher would run it page-scoped")
# The exact conversion the dispatcher does, against the row just written.
import queue_store                                                 # noqa: E402
import handlers                                                    # noqa: E402

message = PART
if payload != "<null>":
    try:
        message = json.loads(payload)
    except ValueError:
        pass
part_id = message.get("Id") if isinstance(message, dict) else message
page_only = message.get("Page") if isinstance(message, dict) else None
check("the handler would receive a page", page_only == PAGE,
      f"part={part_id} page={page_only}")

print("\n3. scope is widened, never narrowed")
# The safety net for a row that already exists: doing more work than asked
# wastes time, doing less leaves pages silently unprocessed.
cases = [
    # (existing row payload, incoming message,        expected)
    (None,                       {"Id": 1, "Page": 3}, False),   # doc covers it
    ('{"Id":1,"Page":3}',        {"Id": 1, "Page": 3}, False),   # same page
    ('{"Id":1,"Page":3}',        1,                    None),    # widen to doc
    ('{"Id":1,"Page":3}',        {"Id": 1, "Page": 5}, None),    # two pages -> doc
]
for existing, incoming, expected in cases:
    got = queue_store._widen_scope(existing, incoming)
    check(f"{existing} + {incoming} -> "
          f"{'no change' if expected is False else 'whole document'}",
          got == expected, got)

check("a page is read out of a JSON payload", queue_store._page_of('{"Id":1,"Page":7}') == 7)
check("a bare id is the whole document", queue_store._page_of("12") is None)
check("junk is the whole document, not a crash", queue_store._page_of("{not json") is None)

print("\n4. the C# row insert names Payload")
# Asserted against the source: the column was simply absent from the INSERT,
# which no amount of correct calling code would have fixed.
cs = open(r"C:\Aizera\DSRFQ\DSRFQ.Web\Modules\Costing\CostingPartQueue\CostingQueue.cs",
          encoding="utf-8").read()
check("Enqueue accepts a payload", "string payload = null" in cs)
check("and the INSERT writes it", "Payload, Status, Priority" in cs and "@payload" in cs)
ep = open(r"C:\Aizera\DSRFQ\DSRFQ.Web\Modules\Costing\CostingParts\CostingPartsEndpoint.cs",
          encoding="utf-8").read()
check("the row and the message share one body builder",
      "MessageBody(request.CostingPartId, page)" in ep
      and "Publish(queue, body)" in ep)

# Leave nothing queued behind.
sql(f"UPDATE dbo.CostingPartQueue SET IsActive = 0 "
    f"WHERE CostingPartID = {PART} AND Lane = 'ballooning';")

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
