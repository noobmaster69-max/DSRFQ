"""The page switcher sits in its own row above the balloon toolbar.

Visible without scrolling the toolbar; next / previous / typed page all work.
Read-only: writes blocked, nothing saved.

    python check_pagebar.py            (part 56, 16 pages)
"""
import os
import sys

from playwright.sync_api import sync_playwright

from _readonly_guard import make_read_only

BASE = os.environ.get("DSRFQ_BASE", "http://127.0.0.1:5001")
PART = int(os.environ.get("DSRFQ_PART", "56"))
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
    pg.goto(f"{BASE}/Account/Login", wait_until="domcontentloaded")
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
    pg.wait_for_timeout(2000)

    bar, tb = pg.locator("#ab-pagebar"), pg.locator("#ab-toolbar")
    check("page bar is shown", bar.is_visible())
    check("and sits above the toolbar", bar.bounding_box()["y"] < tb.bounding_box()["y"])
    check("the toolbar no longer has the page buttons", tb.locator("#btn-next-page").count() == 0)
    check("Select and Pan are in the page bar", bar.locator("#tool-select").count() == 1 and bar.locator("#tool-pan").count() == 1)
    check("and no longer in the toolbar", tb.locator("#tool-select").count() == 0 and tb.locator("#tool-pan").count() == 0)
    tools_x = bar.locator("#tool-select").bounding_box()["x"]
    pages_x = bar.locator("#btn-prev-page").bounding_box()["x"]
    check("tools on the left, pages to their right", tools_x < pages_x, (round(tools_x), round(pages_x)))
    bar.locator("#tool-pan").click()
    pg.wait_for_timeout(300)
    check("Pan button switches to pan", "active" in (bar.locator("#tool-pan").get_attribute("class") or ""))
    bar.locator("#tool-select").click()
    pg.wait_for_timeout(300)
    check("Select button switches back", "active" in (bar.locator("#tool-select").get_attribute("class") or ""))
    vw = pg.locator("#ab-pagebar").evaluate("e => e.closest('.ab-app-container').getBoundingClientRect().right")
    nb = bar.locator("#btn-next-page").bounding_box()
    check("next-page button is on screen without scrolling", nb["x"] + nb["width"] <= vw, (round(nb["x"]), round(vw)))
    val = lambda: bar.locator("#btn-goto-page").input_value()
    bar.locator("#btn-next-page").click()
    pg.wait_for_timeout(800)
    check("next page works", val() == "2", val())
    bar.locator("#btn-goto-page").fill("5")
    bar.locator("#btn-goto-page").press("Enter")
    pg.wait_for_timeout(800)
    check("typing a page number works", val() == "5", val())
    bar.locator("#btn-prev-page").click()
    pg.wait_for_timeout(800)
    check("previous page works", val() == "4", val())
    pg.screenshot(path=os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots", "pagebar.png"))

    # A single-page drawing: the bar still shows Select / Pan, without page buttons.
    single = os.environ.get("DSRFQ_SINGLE_PART", "41")
    pg.goto(f"{BASE}/Costing/Workspace/{single}", wait_until="domcontentloaded")
    pg.wait_for_selector(".cw-traytab", timeout=90000)
    pg.wait_for_timeout(2500)
    pg.locator("text=/\.pdf/").first.click()
    pg.wait_for_timeout(2500)
    pg.locator(".cw-modes").get_by_text("Balloon", exact=True).click()
    pg.wait_for_selector("tr[data-id]", timeout=60000)
    pg.wait_for_timeout(1500)
    pages = pg.evaluate("document.querySelectorAll('#ab-pagebar #btn-goto-page').length")
    total = pg.evaluate("(() => { const i = document.querySelector('#btn-goto-page'); return i ? +i.max : 1 })()")
    check(f"part {single}: page bar still shows Select / Pan", pg.locator("#ab-pagebar #tool-select").is_visible())
    if total == 1:
        check(f"part {single} (1 page): no page buttons", pages == 0, pages)
    check("no script errors", not errors, errors[:2])
    check("and nothing was saved", not blocked, blocked[:3])
    b.close()

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
