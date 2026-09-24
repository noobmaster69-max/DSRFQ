r"""Does the annotation list tell an instance apart from a child?

"1_1, 1_2" looks like the separator setting being ignored. It is not: the
underscore marks an INSTANCE - one balloon, several identical features, a line
each in the report - and never changes with the setting. The setting governs a
CHILD, "1-1", which is a different thing.

Checked together on one drawing, because the whole difficulty is telling them
apart at a glance.

    python .mssql-scripts/check_instance_vs_subnumber.py [part_id]
"""

import os
import subprocess
import sys

from playwright.sync_api import sync_playwright

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 12
BASE = "http://localhost:5001"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)
CHILD_SYMBOL = "ZZCHILD"
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


# The shop's mark for this run, and a real child balloon to render with it -
# the drawing has plenty of multipliers but no sub-numbers at all, which is
# exactly why nobody had ever seen the setting take effect.
sql("UPDATE dbo.MasterSettings SET SubNumberSeparator = '-';")
sql(f"DELETE FROM dbo.CostingPartBalloons WHERE CostingPartID = {PART} "
    f"AND Symbol = '{CHILD_SYMBOL}';")
sql(f"""
    INSERT INTO dbo.CostingPartBalloons
        (CostingPartID, BalloonNo, PageNumber, CenterX, CenterY,
         BBoxX1, BBoxY1, BBoxX2, BBoxY2, Symbol, OriginalSymbol,
         IsNote, IsDatum, Manual, RemovedByUser, BalloonColor, BalloonSize,
         InsertDate, InsertUserId, IsActive)
    VALUES ({PART}, '2-1', 2, 6.0, 6.0, 5.0, 5.0, 7.0, 7.0,
            '{CHILD_SYMBOL}', '{CHILD_SYMBOL}', 0, 0, 1, 0, '#27dc3c', 1,
            CURRENT_TIMESTAMP, 1, 1);
""")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1600, "height": 950})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

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

    # The multipliers are on page 2, and so is the child just inserted.
    nxt = page.locator("#btn-next-page")
    if nxt.count() and not nxt.is_disabled():
        nxt.click()
        page.wait_for_timeout(2500)

    cells = page.evaluate(
        """() => Array.from(document.querySelectorAll('.ab-table tbody tr[data-id]'))
             .map(tr => ({no: tr.querySelector('td').innerText.trim(),
                          title: tr.querySelector('td').getAttribute('title') || '',
                          qty: tr.querySelectorAll('td')[4]?.innerText.trim() || '',
                          sym: tr.querySelectorAll('td')[1]?.innerText.trim() || ''}))""")
    print(f"        {len(cells)} lines listed")
    print("        first few:", [c["no"] for c in cells[:8]])

    print("\n1. an instance is listed with the underscore")
    inst = [c for c in cells if "_" in c["no"]]
    check("there are instance lines", bool(inst), len(inst))
    if inst:
        print(f"        e.g. {inst[0]['no']}  qty={inst[0]['qty']}")
        check("its Qty cell says which of how many", "/" in inst[0]["qty"],
              inst[0]["qty"])
        check("hovering explains it is an instance, not a child",
              "instance" in inst[0]["title"].lower(), inst[0]["title"][:110])
        check("and says the separator does not affect it",
              "not the sub-number separator" in inst[0]["title"], inst[0]["title"][:160])

    print("\n2. a real child IS listed with the configured separator")
    child = [c for c in cells if c["sym"] == CHILD_SYMBOL]
    check("the child balloon is listed", bool(child), [c["no"] for c in cells][:12])
    if child:
        print(f"        {child[0]['no']}  title={child[0]['title'][:80]}")
        check("it reads 2-1, using the shop's separator", child[0]["no"] == "2-1",
              child[0]["no"])
        check("and hovering calls it a child", "child" in child[0]["title"].lower(),
              child[0]["title"][:110])

    print("\n3. the two are visibly different in the same list")
    check("instances use _ and the child uses -",
          bool(inst) and bool(child) and "_" in inst[0]["no"] and "-" in child[0]["no"],
          f"{inst[0]['no'] if inst else '-'} vs {child[0]['no'] if child else '-'}")

    page.screenshot(path=os.path.join(OUT, "instance-vs-child.png"))
    check("no page errors", not errors, errors[:2])
    browser.close()

sql(f"DELETE FROM dbo.CostingPartBalloons WHERE CostingPartID = {PART} "
    f"AND Symbol = '{CHILD_SYMBOL}';")

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
