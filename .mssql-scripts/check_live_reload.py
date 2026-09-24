r"""Do new balloons appear on the canvas without reopening the drawing?

Auto Balloon writes to the database and announces itself on the Progress topic;
the widget is supposed to hear that and re-read. When it does not, the run looks
like it did nothing until the operator closes and reopens the drawing - which is
also long enough for them to assume it failed and run it again.

This drives the reload path directly rather than running a real ballooning job:
a row is inserted, the same Progress message the consumer sends is published,
and the canvas is checked. That isolates the widget from the pipeline, so a
failure here is the widget's and not the engine's.

    python .mssql-scripts/check_live_reload.py [part_id]
"""

import json
import os
import subprocess
import sys
import time

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")

import pika                                                        # noqa: E402
from playwright.sync_api import sync_playwright                    # noqa: E402

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 12
BASE = "http://localhost:5001"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)
MARKER = "ZZLIVE"          # nothing else on any drawing reads like this
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


def publish_progress(message):
    """Exactly what handlers.send_message_to_topic does."""
    conn = pika.BlockingConnection(pika.ConnectionParameters("localhost", heartbeat=10))
    ch = conn.channel()
    ch.basic_publish(exchange="amq.topic", routing_key="Progress",
                     body=json.dumps({"Id": PART, "Message": message}),
                     properties=pika.BasicProperties(delivery_mode=2))
    conn.close()


sql(f"DELETE FROM dbo.CostingPartBalloons WHERE CostingPartID = {PART} "
    f"AND Symbol = '{MARKER}';")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1600, "height": 950})
    console = []
    page.on("console", lambda m: console.append(m.text))
    page.on("pageerror", lambda e: console.append("PAGEERROR " + str(e)))

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.wait_for_timeout(1500)
    u = page.get_by_placeholder("user name")
    if u.count():
        u.fill("admin")
        page.get_by_placeholder("password").fill("serenity")
        page.get_by_role("button", name="Sign In").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)

    page.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="networkidle")
    page.wait_for_timeout(3000)
    d = page.locator(".cw-rail-docs [class*=row]:has-text('2D')").first
    if not d.count():
        d = page.locator(".cw-rail-docs >> text=2D").first
    if d.count():
        d.click()
        page.wait_for_timeout(3500)
    m = page.locator(".cw-modes button:has-text('Balloon')").first
    if m.count():
        m.click()
    page.wait_for_timeout(6000)

    before_rows = page.locator(".ab-table tbody tr[data-id]").count()
    before_boxes = page.locator(".ab-annotation-box").count()
    print(f"        before: {before_rows} rows, {before_boxes} boxes on canvas")
    check("the drawing opened with balloons", before_rows > 0, before_rows)

    print("\n1. is the live channel even connected?")
    warned = [c for c in console if "Live progress unavailable" in c]
    check("no 'Live progress unavailable' warning", not warned, warned[:1])

    print("\n2. a balloon written behind the widget's back, then announced")
    # Page 1, well away from the drawing's own content so it cannot be
    # mistaken for something that was already there.
    sql(f"""
        INSERT INTO dbo.CostingPartBalloons
            (CostingPartID, BalloonNo, PageNumber, CenterX, CenterY,
             BBoxX1, BBoxY1, BBoxX2, BBoxY2, Symbol, OriginalSymbol,
             IsNote, IsDatum, Manual, RemovedByUser, BalloonColor, BalloonSize,
             InsertDate, InsertUserId, IsActive)
        VALUES ({PART}, '999', 1, 8.0, 8.0, 7.0, 7.0, 9.0, 9.0,
                '{MARKER}', '{MARKER}', 0, 0, 0, 0, '#27dc3c', 1,
                CURRENT_TIMESTAMP, 1, 1);
    """)
    inserted = sql(f"SELECT COUNT(*) FROM dbo.CostingPartBalloons "
                   f"WHERE CostingPartID = {PART} AND Symbol = '{MARKER}';")
    check("the row is in the database", inserted and inserted[0] == "1", inserted)

    publish_progress("✅ Ballooning done - 1 balloon from 1/1 pages")
    print("        published the Progress message; waiting for the reload...")

    # The widget debounces 1500ms after the last message, then re-reads.
    appeared = False
    for _ in range(20):                       # up to ~10s
        time.sleep(0.5)
        if page.locator(f".ab-table tbody tr[data-id]:has-text('{MARKER}')").count():
            appeared = True
            break

    after_rows = page.locator(".ab-table tbody tr[data-id]").count()
    print(f"        after: {after_rows} rows")
    check("the toolbar showed the progress text",
          page.locator(".ab-progress-text").count() > 0
          or after_rows != before_rows, "no progress chip seen")
    check("the new balloon appeared WITHOUT reopening", appeared,
          f"{before_rows} -> {after_rows} rows")
    page.screenshot(path=os.path.join(OUT, "live-reload.png"))

    print("\n3. and it is drawn on the canvas, not just listed")
    boxes = page.locator(".ab-annotation-box").count()
    print(f"        boxes on canvas: {before_boxes} -> {boxes}")
    check("the canvas gained the balloon", boxes > before_boxes,
          f"{before_boxes} -> {boxes}")

    print("\n4. with an unsaved edit, the reload is refused")
    # Correct on its own: replacing the set would silently discard work that
    # exists only in memory. It becomes the reported fault only in combination
    # with Auto Balloon, which asks about those edits and then leaves the flag
    # set - see section 5.
    page.locator(".ab-table tbody tr[data-id]").first.click()
    page.wait_for_timeout(1200)
    page.locator("#ab-qty").fill("7")
    page.locator("#ab-qty").dispatch_event("change")
    page.wait_for_timeout(800)

    rows_dirty = page.locator(".ab-table tbody tr[data-id]").count()
    sql(f"""
        INSERT INTO dbo.CostingPartBalloons
            (CostingPartID, BalloonNo, PageNumber, CenterX, CenterY,
             BBoxX1, BBoxY1, BBoxX2, BBoxY2, Symbol, OriginalSymbol,
             IsNote, IsDatum, Manual, RemovedByUser, BalloonColor, BalloonSize,
             InsertDate, InsertUserId, IsActive)
        VALUES ({PART}, '998', 1, 12.0, 12.0, 11.0, 11.0, 13.0, 13.0,
                '{MARKER}2', '{MARKER}2', 0, 0, 0, 0, '#27dc3c', 1,
                CURRENT_TIMESTAMP, 1, 1);
    """)
    publish_progress("✅ Ballooning done")
    time.sleep(5)
    check("an unsaved edit blocks the reload, as designed",
          page.locator(f".ab-table tbody tr[data-id]:has-text('{MARKER}2')").count() == 0,
          "it reloaded over unsaved work")
    print(f"        rows still {page.locator('.ab-table tbody tr[data-id]').count()} "
          f"(was {rows_dirty})")

    print("\n5. after consenting to Auto Balloon, the flag must be cleared")
    # The confirm says the unsaved edits will be lost, and the endpoint has
    # already deactivated those rows. Leaving dirty set after that means the
    # results arrive and the widget refuses to show them - the operator sees
    # nothing until they close and reopen the drawing.
    src = open(r"C:\Aizera\DSRFQ\DSRFQ.Web\Modules\Common\Widgets\BallooningWidget"
               r"\BallooningWidget.ts", encoding="utf-8").read()
    start = src.find("private async handleAutoBalloon")
    body = src[start:start + 3400]
    cleared = body.find("this.dirty = false")
    queued = body.find("CostingPartsService.Rerun")
    check("handleAutoBalloon clears dirty once the run is queued", cleared != -1,
          "it never clears it, so reloadFromServer refuses the results")
    # After the call, not before: clearing it first would drop the operator's
    # work even when the queue call turns out to fail.
    check("and only after the run is actually accepted",
          cleared > queued > -1, f"clear@{cleared} rerun@{queued}")

    interesting = [c for c in console
                   if "reload" in c.lower() or "progress" in c.lower()
                   or "PAGEERROR" in c]
    if interesting:
        print(f"        console: {interesting[:3]}")

    browser.close()

sql(f"DELETE FROM dbo.CostingPartBalloons WHERE CostingPartID = {PART} "
    f"AND Symbol LIKE '{MARKER}%';")

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
