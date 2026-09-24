"""Section views in the balloon editor: drawn, linked, and named on balloons.

Part 42: the SECTION A-A label and its cut are drawn; clicking the label goes
to the cut and clicking a cut letter comes back; balloons inside the section
carry "SECTION A-A" in the list. Read-only: writes blocked, nothing saved.

    python check_view_links_ui.py            (part 42)
"""
import os
import sys

from playwright.sync_api import sync_playwright

from _readonly_guard import make_read_only

BASE = os.environ.get("DSRFQ_BASE", "http://127.0.0.1:5001")
PART = int(os.environ.get("DSRFQ_PART", "42"))
fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1600, "height": 900})
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)[:160]))
    blocked = make_read_only(pg)
    for _ in range(3):
        try:
            pg.goto(f"{BASE}/Account/Login", wait_until="domcontentloaded")
            break
        except Exception:
            pg.wait_for_timeout(2000)
    pg.get_by_placeholder("user name").fill("admin")
    pg.get_by_placeholder("password").fill("serenity")
    pg.get_by_role("button", name="Sign In").click()
    pg.wait_for_load_state("networkidle")
    pg.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="domcontentloaded")
    pg.wait_for_selector(".cw-traytab", timeout=90000)
    pg.wait_for_timeout(2500)
    pg.locator("text=/\\.pdf/").first.click()
    pg.wait_for_timeout(2500)
    pg.locator(".cw-modes").get_by_text("Balloon", exact=True).click()
    pg.wait_for_selector("tr[data-id]", timeout=60000)
    pg.wait_for_timeout(2500)

    n = pg.locator(".ab-vl-label").count()
    check("the section labels are drawn", n >= 1, n)
    check("each with its view outline", pg.locator(".ab-vl-view").count() == n, pg.locator(".ab-vl-view").count())
    check("and both of each cut's letters", pg.locator(".ab-vl-mark").count() == 2 * n, pg.locator(".ab-vl-mark").count())
    pg.screenshot(path=os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots", "vl_ui_page.png"))

    pan = lambda: pg.evaluate("getComputedStyle(document.querySelector('.ab-canvas-container')).transform")
    before = pan()
    pg.locator(".ab-vl-label").first.click()
    pg.wait_for_timeout(600)
    check("clicking the label moves to the cut", pan() != before, pan())
    check("and highlights it", pg.locator(".ab-vl-mark.hot").count() == 2)
    pg.screenshot(path=os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots", "vl_ui_to_cut.png"))

    at_cut = pan()
    pg.locator(".ab-vl-mark").first.click()
    pg.wait_for_timeout(600)
    check("clicking a cut letter goes back to the view", pan() != at_cut)

    tags = pg.locator("tr[data-id] .ab-vl-tag").all_inner_texts()
    check("balloons in a section say so in the list", len(tags) > 0 and all(t.startswith("SECTION ") for t in tags),
          sorted(set(tags)))
    print("   ", len(tags), "balloon(s) tagged:", {t: tags.count(t) for t in set(tags)})

    if tags:
        row = pg.locator("tr[data-id]:has(.ab-vl-tag) td.ab-c-sym").first
        row.click()
        pg.wait_for_timeout(500)
        check("the editor names the view too",
              "SECTION " in pg.locator(".cw-balloon-editor .ab-panel-title, .ab-property-editor .ab-panel-title").first.inner_text())

    check("no script errors", not errors, errors[:2])
    check("and nothing was saved", not blocked, blocked[:3])
    b.close()

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
