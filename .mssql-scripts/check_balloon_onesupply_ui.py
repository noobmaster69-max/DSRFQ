"""One Supply parity, second batch: audit (F2), area/single recognition, the
balloon right-click menu and styles, sub-number by picking the parent,
rubber-band select, rotation, go-to page, the new property and batch fields,
settings menu entries and dialogs.

Nothing is saved to the part. Rotation is stored as it is used, so the test
turns the page back upright before it finishes.

    DSRFQ_BASE=http://localhost:5002 python .mssql-scripts/check_balloon_onesupply_ui.py [part_id]
"""

import os
import re
import sys

from playwright.sync_api import sync_playwright

PART = sys.argv[1] if len(sys.argv) > 1 else "12"
BASE = os.environ.get("DSRFQ_BASE", "http://localhost:5001")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)
fails = []
ROWS = ".cw-rail-balloon .ab-table tbody tr[data-id]"


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + str(detail) if detail != '' else ''}")
    if not ok:
        fails.append(name)


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1700, "height": 1000})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("dialog", lambda d: d.accept())

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.wait_for_timeout(1500)
    if page.get_by_placeholder("user name").count():
        page.get_by_placeholder("user name").fill("admin")
        page.get_by_placeholder("password").fill("serenity")
        page.get_by_role("button", name="Sign In").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
    page.evaluate("() => { localStorage.setItem('dsrfq.ballooning.listAllPages','0'); }")
    page.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="networkidle")
    page.wait_for_timeout(3000)
    doc2d = page.locator(".cw-rail-docs >> text=2D").first
    if doc2d.count():
        doc2d.click()
        page.wait_for_timeout(3500)
    page.locator(".cw-modes button:has-text('Balloon')").first.click()
    page.wait_for_timeout(7000)
    n0 = page.locator(ROWS).count()
    check("balloons loaded (migration ran, list reads the new columns)", n0 > 0, n0)

    print("toolbar and settings")
    for sel, what in [("#tool-area-ocr", "Area Read"), ("#tool-single-ocr", "Single Read"), ("#btn-boxes", "box toggle"),
                      ("#btn-rotate", "rotate"), ("#btn-grid-edit", "Edit grid"), ("#btn-size-scope", "size scope"),
                      ("#btn-bubble-style", "Style"), ("#btn-goto-page", "go-to page")]:
        check(f"toolbar has {what}", page.locator(sel).count() == 1)
    page.locator("#btn-settings").click()
    page.wait_for_timeout(400)
    for sel in ("#ab-m-gdt", "#ab-m-skipdone", "#ab-m-shot", "#ab-m-pdfask", "#ab-m-bubble", "#ab-m-cat", "#ab-m-symbols", "#ab-m-tool"):
        check(f"settings menu has {sel}", page.locator(sel).count() == 1)
    page.keyboard.press("Escape")
    page.locator(".ab-viewport").click(position={"x": 5, "y": 5})
    page.wait_for_timeout(300)

    print("audit F2")
    rows = page.locator(ROWS)
    first_id = rows.first.get_attribute("data-id")
    rows.first.click()
    page.wait_for_timeout(500)
    page.locator(".ab-viewport").hover()
    page.keyboard.press("F2")
    page.wait_for_timeout(700)
    tick = page.locator(f"{ROWS}[data-id='{first_id}'] .ab-audit-tick")
    check("F2 ticks the balloon", "on" in (tick.get_attribute("class") or ""))
    sel_now = page.locator(f"{ROWS}.selected").first.get_attribute("data-id")
    check("and moves to the next unaudited", sel_now and sel_now != first_id, sel_now)
    check("header counts audited", "audited" in page.locator(".cw-rail-balloon .ab-table-title").inner_text())

    print("property fields")
    for sel in ("#ab-qty", "#ab-feature", "#ab-category", "#ab-export", "#ab-arrow", "#ab-insert", ".ab-crop-preview", "#ab-audit"):
        check(f"panel has {sel}", page.locator(sel).count() == 1)
    page.locator("#ab-qty").fill("4x")
    page.locator("#ab-qty").press("Tab")
    page.wait_for_timeout(400)
    check("quantity 4x reads back as (1-4)", page.locator("#ab-qty").input_value() == "(1-4)", page.locator("#ab-qty").input_value())
    page.keyboard.press("Control+z")

    print("rubber band + batch fields")
    box = page.locator(".ab-viewport").bounding_box()
    page.keyboard.press("Escape")
    page.mouse.move(box["x"] + 4, box["y"] + 4)
    page.mouse.down()
    page.mouse.move(box["x"] + box["width"] * 0.7, box["y"] + box["height"] * 0.7, steps=12)
    page.mouse.up()
    page.wait_for_timeout(800)
    title = page.locator(".cw-rail-balloon .ab-panel-title").first.inner_text()
    check("dragging on the drawing selects several", "selected" in title, title)
    for sel in ("#ab-b-feature", "#ab-b-category", "#ab-b-tolstd", "#ab-b-export", "#ab-b-arrow", "#ab-batch-audit", ".ab-batch-feature-editor"):
        check(f"batch panel has {sel}", page.locator(sel).count() == 1)

    print("right-click menu")
    badge = page.locator(".ab-balloon-badge").first
    bid = badge.get_attribute("data-id")
    badge.click(button="right")
    page.wait_for_timeout(500)
    check("right-click opens the balloon menu", page.locator(".ab-balloon-menu").count() == 1)
    page.locator(".ab-balloon-menu [data-a='shape'][data-v='star']").click()
    page.wait_for_timeout(500)
    check("shape star draws a polygon", page.locator(f".ab-balloon-badge[data-id='{bid}'] polygon").count() >= 1)
    page.screenshot(path=os.path.join(OUT, f"onesupply-menu-{PART}.png"))

    print("sub-number by picking the parent")
    badges = page.locator(".ab-balloon-badge")
    child_id = badges.nth(3).get_attribute("data-id")
    parent_id = badges.nth(4).get_attribute("data-id")
    # One balloon only: the menu offers sub-numbering for a single balloon.
    badges.nth(3).click()
    page.wait_for_timeout(400)
    badges.nth(3).click(button="right")
    page.wait_for_timeout(400)
    page.locator(".ab-balloon-menu [data-a='subNumber']").click()
    page.wait_for_timeout(300)
    page.locator(f".ab-balloon-badge[data-id='{parent_id}']").click()
    page.wait_for_timeout(700)
    label = page.locator(f".ab-balloon-badge[data-id='{child_id}'] text").first.text_content()
    check("the picked balloon becomes a child", bool(re.search(r"\d+\D+\d+", label)), label)

    print("rotation and pages")
    page.locator("#btn-rotate").click()
    page.wait_for_timeout(800)
    check("rotate shows 90°", page.locator("#btn-rotate-reset").count() == 1)
    t = page.locator(".ab-canvas-container, #ab-canvas-container").first.evaluate("e => e.style.transform") if page.locator(".ab-canvas-container, #ab-canvas-container").count() else ""
    check("canvas is rotated", "rotate(90deg)" in t, t[:80])
    page.screenshot(path=os.path.join(OUT, f"onesupply-rotated-{PART}.png"))
    page.locator("#btn-rotate-reset").click()
    page.wait_for_timeout(600)
    check("back upright", page.locator("#btn-rotate-reset").count() == 0)
    if page.locator("#btn-goto-page").count():
        page.locator("#btn-goto-page").fill("2")
        page.locator("#btn-goto-page").press("Enter")
        page.wait_for_timeout(2000)
        check("go-to page jumps to page 2", page.locator("#btn-goto-page").input_value() == "2")
        page.keyboard.press("ArrowLeft")
        page.wait_for_timeout(1500)
        check("left arrow turns back a page", page.locator("#btn-goto-page").input_value() == "1")

    print("dialogs")
    for btn, name in [("#btn-bubble-style", "Bubble settings"), ("#btn-grid-edit", "Edit grid"), ("#btn-size-scope", "Balloon size")]:
        page.locator(btn).click()
        page.wait_for_timeout(500)
        check(f"{name} dialog opens", page.locator(".ab-modal-overlay .ab-modal").count() >= 1)
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)

    print("area recognition")
    page.wait_for_timeout(1500)
    before = page.locator(ROWS).count()
    target = page.locator(".ab-annotation-box").nth(2).bounding_box()
    page.keyboard.press("w")
    page.wait_for_timeout(300)
    check("W switches to Area Read", "active" in (page.locator("#tool-area-ocr").get_attribute("class") or ""))
    if target:
        page.mouse.move(target["x"] - 25, target["y"] - 15)
        page.mouse.down()
        page.mouse.move(target["x"] + target["width"] + 60, target["y"] + target["height"] + 25, steps=8)
        page.mouse.up()
        page.wait_for_timeout(25000)
        after = page.locator(ROWS).count()
        check("area recognition added balloons", after > before, f"{before} -> {after}")
        page.screenshot(path=os.path.join(OUT, f"onesupply-area-{PART}.png"))

    check("no page errors", not errors, errors[:3])
    page.evaluate("() => window.onbeforeunload = null")
    browser.close()

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
