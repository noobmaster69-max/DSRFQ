"""Costing Parts grid (card view) updates without a manual refresh.

Publishes a Progress message on RabbitMQ the way the RFQ consumer does, for a
part that is on screen, and checks that its card shows the message and that a
status change written to the database appears on the card - with no reload.

    python check_parts_grid_live_refresh.py
"""
import io
import json
import os
import re
import sys
import time

import pyodbc
from playwright.sync_api import sync_playwright

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
BASE = os.environ.get("DSRFQ_BASE", "http://127.0.0.1:5001")

raw = json.load(io.open(r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json", encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect("DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;TrustServerCertificate=yes" % (
    g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"), g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")))
cur = conn.cursor()

fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


_here = os.getcwd()
os.chdir(r"C:\Aizera\RPA\RFQ")                     # rabbitMQSend reads ./config.yaml
from rabbitMQSend import send_message_to_topic  # noqa: E402
os.chdir(_here)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1600, "height": 1000})
    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    if page.get_by_placeholder("user name").count():
        page.get_by_placeholder("user name").fill("admin")
        page.get_by_placeholder("password").fill("serenity")
        page.get_by_role("button", name="Sign In").click()
        page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)                      # let the post-login redirect settle
    for attempt in range(3):
        try:
            page.goto(f"{BASE}/Costing/CostingParts", wait_until="domcontentloaded")
            break
        except Exception as exc:                     # ERR_ABORTED when a redirect races the navigation
            print(f"  retrying navigation: {str(exc).splitlines()[0]}")
            page.wait_for_timeout(2000)
    page.wait_for_selector(".cp-card", timeout=30000)
    page.wait_for_timeout(3000)                     # MQTT connect + subscribe

    first = page.locator(".cp-card").first
    part_id = int(first.get_attribute("data-cp-id"))
    print(f"part on screen: {part_id}")
    card = page.locator(f".cp-card[data-cp-id='{part_id}']")

    print("1. a progress message shows on the card")
    marker = f"live-refresh check {int(time.time())}"
    send_message_to_topic("Progress", {"Id": part_id, "Message": marker})
    try:
        page.wait_for_function(
            "([id, text]) => (document.querySelector(`.cp-card[data-cp-id='${id}']`)?.innerText || '').includes(text)",
            arg=[part_id, marker], timeout=10000)
        shown = True
    except Exception:
        shown = False
    check("message appears on the card without a refresh", shown)

    print("2. a status written by the consumer shows on the card")
    before = cur.execute("SELECT BalloonStatusID FROM dbo.CostingParts WHERE ID = ?", part_id).fetchone()[0]
    names = dict(cur.execute("SELECT ID, Name FROM dbo.MasterCostingStatus").fetchall())
    new_status = 4 if before != 4 else 3
    try:
        cur.execute("UPDATE dbo.CostingParts SET BalloonStatusID = ? WHERE ID = ?", new_status, part_id)
        cur.commit()
        send_message_to_topic("Progress", {"Id": part_id, "Message": marker + " (status)"})
        want = names.get(new_status, "")
        try:
            # The Balloon chip's own value, not the whole card: another stage
            # may already carry the same word.
            page.wait_for_function(
                """([id, text]) => [...(document.querySelector(`.cp-card[data-cp-id='${id}']`)?.querySelectorAll('.cp-chip') || [])]
                     .some(c => c.querySelector('.cp-chip-label')?.textContent.trim() === 'Balloon'
                             && c.querySelector('.cp-chip-value')?.textContent.trim() === text)""",
                arg=[part_id, want], timeout=15000)
            changed = True
        except Exception:
            changed = False
        check(f"card shows the new balloon status '{want}' without a refresh", changed, card.inner_text()[:200].replace("\n", " | "))
    finally:
        cur.execute("UPDATE dbo.CostingParts SET BalloonStatusID = ? WHERE ID = ?", before, part_id)
        cur.commit()
    print("3. with no message at all, a finished stage still shows (15 s poll)")
    before = cur.execute("SELECT BalloonStatusID FROM dbo.CostingParts WHERE ID = ?", part_id).fetchone()[0]
    chip = """([id, text]) => [...(document.querySelector(`.cp-card[data-cp-id='${id}']`)?.querySelectorAll('.cp-chip') || [])]
                 .some(c => c.querySelector('.cp-chip-label')?.textContent.trim() === 'Balloon'
                         && c.querySelector('.cp-chip-value')?.textContent.trim() === text)"""
    try:
        cur.execute("UPDATE dbo.CostingParts SET BalloonStatusID = 2 WHERE ID = ?", part_id)
        cur.commit()
        send_message_to_topic("Progress", {"Id": part_id, "Message": "stage started"})
        page.wait_for_function(chip, arg=[part_id, names.get(2, "In Progress")], timeout=15000)
        cur.execute("UPDATE dbo.CostingParts SET BalloonStatusID = 3 WHERE ID = ?", part_id)
        cur.commit()                                   # finished - and deliberately no message
        t0 = time.time()
        try:
            page.wait_for_function(chip, arg=[part_id, names.get(3, "Completed")], timeout=25000)
            polled = True
        except Exception:
            polled = False
        check("card moves from In Progress to Completed with no message", polled, f"{time.time() - t0:.0f}s")
    finally:
        cur.execute("UPDATE dbo.CostingParts SET BalloonStatusID = ? WHERE ID = ?", before, part_id)
        cur.commit()
    browser.close()

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
