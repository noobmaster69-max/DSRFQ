"""Balloon mode: part details hidden, balloon list on the right of the drawing.

Read-only: writes are blocked and nothing is saved.

    python check_balloon_layout.py            (part 12)
"""
import os
import sys

from playwright.sync_api import sync_playwright

from _readonly_guard import make_read_only

BASE = os.environ.get("DSRFQ_BASE", "http://127.0.0.1:5001")
PART = int(os.environ.get("DSRFQ_PART", "12"))
fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


BOX = """s => { const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect(); return {x: r.left, r: r.right, w: r.width, vis: r.width > 0 && getComputedStyle(e).display !== 'none'}; }"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1600, "height": 900})
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)[:160]))
    blocked = make_read_only(pg)
    pg.goto(f"{BASE}/Account/Login", wait_until="domcontentloaded")
    pg.get_by_placeholder("user name").fill("admin")
    pg.get_by_placeholder("password").fill("serenity")
    pg.get_by_role("button", name="Sign In").click()
    pg.wait_for_load_state("networkidle")
    pg.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="domcontentloaded")
    pg.wait_for_selector(".cw-traytab", timeout=60000)
    pg.wait_for_timeout(2500)
    pg.locator("text=/\\.pdf/").first.click()
    pg.wait_for_timeout(2500)

    insp = pg.evaluate(BOX, ".cw-inspector")
    check("2D mode: part details shown", insp and insp["vis"])

    pg.get_by_text("Balloon", exact=True).last.click()
    pg.wait_for_selector("tr[data-id]", timeout=60000)
    pg.wait_for_timeout(2000)
    main, rail = pg.evaluate(BOX, ".cw-main"), pg.evaluate(BOX, ".cw-rail")
    check("Balloon mode: part details hidden", not pg.evaluate(BOX, ".cw-inspector")["vis"])
    check("balloon list is right of the drawing", rail["x"] > main["r"], f"main {main} rail {rail}")
    check("drawing is wider than the list", main["w"] > rail["w"], round(main["w"]))
    ed = pg.evaluate(BOX, ".cw-balloon-editor")
    check("property editor is left of the drawing", ed and ed["vis"] and ed["r"] < main["x"], ed)
    pg.locator("tr[data-id] td.ab-c-sym").nth(1).click()
    pg.wait_for_timeout(600)
    title = pg.locator(".cw-balloon-editor .ab-panel-title").first.inner_text()
    check("clicking a balloon in the list opens it in the left editor", title.startswith("Balloon ") and title != "Balloon", title)
    check("the list no longer carries the editor", pg.locator(".cw-rail .ab-property-editor, .cw-rail .cw-balloon-props").count() == 0)
    pg.screenshot(path=os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots", "balloon_layout.png"))

    # Drag the left edge leftwards: the list widens.
    h = pg.locator(".cw-rail-resizer").bounding_box()
    pg.mouse.move(h["x"] + 4, h["y"] + 200)
    pg.mouse.down(); pg.mouse.move(h["x"] - 96, h["y"] + 200, steps=5); pg.mouse.up()
    pg.wait_for_timeout(400)
    check("dragging the left edge left widens the list",
          pg.evaluate(BOX, ".cw-rail")["w"] > rail["w"] + 50, round(pg.evaluate(BOX, ".cw-rail")["w"]))
    pg.locator(".cw-rail-resizer").dblclick()   # reset, so the next run starts clean

    pg.locator(".cw-modes").get_by_text("2D", exact=True).click()
    pg.wait_for_timeout(800)
    check("back in 2D: part details return", pg.evaluate(BOX, ".cw-inspector")["vis"])

    check("no script errors", not errors, errors[:2])
    check("and nothing was saved", not blocked, blocked[:3])
    b.close()

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
