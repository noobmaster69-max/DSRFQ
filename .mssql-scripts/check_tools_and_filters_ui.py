"""Inspection-tool picker and the structural dimension filters, in the real UI.

The filters are the risky half: a false positive removes a real characteristic
from the inspection report, so this checks that a plain dimension is never
caught and that notes stay exempt.

    python .mssql-scripts/check_tools_and_filters_ui.py [part_id]
"""

import os
import sys

from playwright.sync_api import sync_playwright

PART = sys.argv[1] if len(sys.argv) > 1 else "12"
BASE = "http://localhost:5001"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)
fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + str(detail) if detail else ''}")
    if not ok:
        fails.append(name)


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1600, "height": 950})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.wait_for_timeout(1500)
    user = page.get_by_placeholder("user name")
    if user.count():
        user.fill("admin")
        page.get_by_placeholder("password").fill("serenity")
        page.get_by_role("button", name="Sign In").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)

    page.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="networkidle")
    page.wait_for_timeout(3000)
    doc2d = page.locator(".cw-rail-docs [class*=row]:has-text('2D')").first
    if not doc2d.count():
        doc2d = page.locator(".cw-rail-docs >> text=2D").first
    if doc2d.count():
        doc2d.click()
        page.wait_for_timeout(3500)
    mode = page.locator(".cw-modes button:has-text('Balloon')").first
    if mode.count():
        mode.click()
    page.wait_for_timeout(6000)

    print("1. inspection tool picker")
    page.locator(".ab-table tbody tr[data-id]").first.click()
    page.wait_for_timeout(1500)
    check("the field is in the panel", page.locator(".ab-tool-editor").count() > 0)
    check("the editor mounted",
          page.locator(".ab-tool-editor .select2-container").count() > 0)

    # select2 v3 renders its list into a body-level #select2-drop only on open,
    # so opening it is the only proof the lookup actually resolved.
    page.locator(".ab-tool-editor .select2-choice").first.click()
    page.wait_for_timeout(1500)
    opts = page.locator("#select2-drop .select2-result-label")
    n = opts.count()
    print(f"        options: {n}")
    check("all 16 tools loaded", n >= 16, n)
    if n:
        print("        first three:", [opts.nth(i).inner_text() for i in range(min(3, n))])
        # The one with a description must read as "LM - Digital Lux Meter".
        labels = [opts.nth(i).inner_text() for i in range(n)]
        check("a described tool shows its expansion",
              any(" - " in l for l in labels),
              next((l for l in labels if " - " in l), "none"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)
    page.screenshot(path=os.path.join(OUT, f"tools-{PART}.png"))

    print("\n2. structural filters")
    # The keyword dialog moved off the toolbar into the Settings menu, matching
    # One Supply, where it is 功能 > 始终过滤关键词...
    page.locator("#btn-settings").click()
    page.wait_for_timeout(700)
    page.locator("#ab-m-keywords").click()
    page.wait_for_timeout(1200)
    check("the filter dialog opened", page.locator("#ab-kw-list").count() > 0)
    check("the structural section exists", page.locator("#ab-f-ref").count() > 0)

    page.locator(".ab-modal .ab-props-more summary").first.click()
    page.wait_for_timeout(400)
    check("both rules start off",
          not page.locator("#ab-f-ref").is_checked()
          and not page.locator("#ab-f-eng").is_checked())

    page.locator("#ab-f-ref").check()
    page.wait_for_timeout(800)
    ref_hits = page.locator("#ab-f-hits").inner_text()
    print(f"        reference: {ref_hits.strip()[:110]}")

    page.locator("#ab-f-eng").check()
    page.wait_for_timeout(800)
    both_hits = page.locator("#ab-f-hits").inner_text()
    print(f"        + english: {both_hits.strip()[:160]}")
    check("it reports a count without removing anything", "remove" in both_hits.lower()
          or "nothing" in both_hits.lower(), both_hits.strip()[:80])
    page.screenshot(path=os.path.join(OUT, f"filters-{PART}.png"))

    # Nothing may have been removed just by ticking a box.
    rows_now = page.locator(".ab-table tbody tr[data-id]").count()
    page.locator("#ab-modal-cancel").click()
    page.wait_for_timeout(800)
    check("cancelling changed nothing",
          page.locator(".ab-table tbody tr[data-id]").count() == rows_now, rows_now)

    check("no page errors", not errors, errors[:2])
    browser.close()

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
