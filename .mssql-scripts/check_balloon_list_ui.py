"""Is the balloon list big enough to read, filterable, and resizable?

    python .mssql-scripts/check_balloon_list_ui.py [part_id]
"""

import os
import sys

from playwright.sync_api import sync_playwright

PART = sys.argv[1] if len(sys.argv) > 1 else "12"
BASE = os.environ.get("DSRFQ_BASE", "http://localhost:5001")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)
fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + str(detail) if detail != '' else ''}")
    if not ok:
        fails.append(name)


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1600, "height": 950})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.wait_for_timeout(1500)
    if page.get_by_placeholder("user name").count():
        page.get_by_placeholder("user name").fill("admin")
        page.get_by_placeholder("password").fill("serenity")
        page.get_by_role("button", name="Sign In").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)

    page.evaluate("() => localStorage.removeItem('dsrfq.workspace.balloonRailWidth')")
    page.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="networkidle")
    page.wait_for_timeout(3000)
    doc2d = page.locator(".cw-rail-docs >> text=2D").first
    if doc2d.count():
        doc2d.click()
        page.wait_for_timeout(3500)
    mode = page.locator(".cw-modes button:has-text('Balloon')").first
    if mode.count():
        mode.click()
    page.wait_for_timeout(6000)

    rail = page.locator(".cw-rail")
    w = rail.bounding_box()["width"]
    check("balloon rail is wider than the old 300px", w >= 420, round(w))

    rows = page.locator(".cw-rail-balloon .ab-table tbody tr[data-id]")
    n = rows.count()
    check("the list has rows", n > 0, n)
    sizes = page.evaluate("""() => {
        const r = document.querySelector('.cw-rail-balloon .ab-table tbody tr[data-id]');
        const cs = c => getComputedStyle(r.querySelector(c));
        return {no: cs('.ab-c-no').fontSize, noWeight: cs('.ab-c-no').fontWeight, sym: cs('.ab-c-sym').fontSize};
    }""")
    check("symbol text is 15px", sizes["sym"] == "15px", sizes)
    check("number is bold 14px", sizes["no"] == "14px" and int(sizes["noWeight"]) >= 700, sizes)
    page.screenshot(path=os.path.join(OUT, f"balloon-list-{PART}.png"))

    print("filter")
    f = page.locator(".cw-rail-balloon .ab-table-filter")
    check("filter box is in the list header", f.count() == 1)
    first_label = rows.first.locator(".ab-no-label").inner_text().strip()
    f.click()
    f.type("zzqq-no-match")
    page.wait_for_timeout(400)
    check("a filter with no match empties the list", rows.count() == 0, rows.count())
    check("and keeps focus while typing", page.evaluate("() => document.activeElement.classList.contains('ab-table-filter')"))
    f.fill("")
    f.type(first_label)
    page.wait_for_timeout(400)
    check("filtering by a number finds it", 0 < rows.count() < n, f"{rows.count()} of {n} for '{first_label}'")
    f.press("Escape")
    page.wait_for_timeout(300)
    check("Escape clears it", rows.count() == n, rows.count())

    print("resize")
    handle = page.locator(".cw-rail-resizer")
    hb = handle.bounding_box()
    check("resize handle is visible in balloon mode", hb is not None and hb["width"] > 0)
    if hb:
        x, y = hb["x"] + hb["width"] / 2, hb["y"] + hb["height"] / 2
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(x + 200, y, steps=8)
        page.mouse.up()
        page.wait_for_timeout(600)
        w2 = rail.bounding_box()["width"]
        check("dragging widens the rail", w2 > w + 100, f"{round(w)} -> {round(w2)}")
        check("tolerance columns appear when wide", page.locator(".cw-rail-balloon .ab-table th.ab-c-up").is_visible())
        saved = page.evaluate("() => localStorage.getItem('dsrfq.workspace.balloonRailWidth')")
        check("width is remembered", saved is not None and int(saved) > w, saved)
        page.screenshot(path=os.path.join(OUT, f"balloon-list-wide-{PART}.png"))
        handle.dblclick()
        page.wait_for_timeout(500)
        check("double-click resets", abs(rail.bounding_box()["width"] - w) < 3, round(rail.bounding_box()["width"]))

    print("selection")
    rows.nth(min(5, n - 1)).click()
    page.wait_for_timeout(600)
    check("clicked row is marked selected", "selected" in (rows.nth(min(5, n - 1)).get_attribute("class") or ""))

    check("no page errors", not errors, errors[:2])
    browser.close()

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
