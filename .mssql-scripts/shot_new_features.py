"""One screenshot per new feature, so "I can't see it" can be compared directly.

Uses a fresh browser profile with the cache disabled - which is the difference
between what this proves and what a long-open tab shows.

    python .mssql-scripts/shot_new_features.py [part_id]
"""

import os
import sys

from playwright.sync_api import sync_playwright

PART = sys.argv[1] if len(sys.argv) > 1 else "12"
BASE = "http://localhost:5001"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1600, "height": 950})
    page = ctx.new_page()
    # No cache at all, so what lands on screen is what the server has now.
    page.route("**/*", lambda route: route.continue_(
        headers={**route.request.headers, "Cache-Control": "no-cache", "Pragma": "no-cache"}))

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

    # 1. The toolbar - Default Tol is the new button.
    bar = page.locator(".ab-toolbar, .ab-tools").first
    if bar.count():
        bar.screenshot(path=os.path.join(OUT, "new-1-toolbar.png"))
    print("toolbar buttons:", page.evaluate("""() => Array.from(
        document.querySelectorAll('[id^=btn-]')).map(b => b.id)"""))

    # 2. The property panel - Characteristic + Inspection tool.
    page.locator(".ab-table tbody tr[data-id]").first.click()
    page.wait_for_timeout(2000)
    rail = page.locator(".cw-rail").first
    if rail.count():
        rail.screenshot(path=os.path.join(OUT, "new-2-property-panel.png"))
    print("panel fields  :", page.evaluate("""() => Array.from(
        document.querySelectorAll('.ab-props .ab-label')).map(l => l.innerText.trim()).slice(0, 10)"""))

    # 3. Batch panel - ctrl-click a second row.
    page.locator(".ab-table tbody tr[data-id]").nth(2).click(modifiers=["Control"])
    page.wait_for_timeout(1500)
    if rail.count():
        rail.screenshot(path=os.path.join(OUT, "new-3-batch-panel.png"))
    print("batch panel   :", page.locator(".ab-panel-title").first.inner_text())

    print("wrote", OUT)
    browser.close()
