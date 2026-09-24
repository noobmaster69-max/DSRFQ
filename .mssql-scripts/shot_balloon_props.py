"""Screenshot the ballooning view, to see the property panel as a user does.

The complaint was that the panel looked bad, so the check has to be a picture -
a passing build says nothing about whether a 300px rail reads well.

    python .mssql-scripts/shot_balloon_props.py [part_id]

Writes .mssql-scripts/shots/balloon-<part>.png and a cropped rail-<part>.png.
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
    page = browser.new_page(viewport={"width": 1600, "height": 950})

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.wait_for_timeout(1500)
    # Serenity renders the login through its own editors, so the inputs carry
    # no stable id - the placeholders are what actually identify them.
    user = page.get_by_placeholder("user name")
    if user.count():
        user.fill("admin")
        page.get_by_placeholder("password").fill("serenity")
        page.get_by_role("button", name="Sign In").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
    print("logged in        :", "/Account/Login" not in page.url, page.url)

    # Route is Costing/Workspace/{id:int} - a query string gives a blank page.
    page.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="networkidle")
    page.wait_for_timeout(3000)

    # The 3D document is selected by default, and balloon mode only exists for
    # the 2D one - so pick that first or the mode switch never offers it.
    doc2d = page.locator(".cw-rail-docs [class*=row]:has-text('2D')").first
    if not doc2d.count():
        doc2d = page.locator(".cw-rail-docs >> text=2D").first
    if doc2d.count():
        doc2d.click()
        page.wait_for_timeout(3500)

    mode = page.locator(".cw-modes button:has-text('Balloon')").first
    if not mode.count():
        mode = page.locator(".cw-modes >> text=Balloon").first
    print("mode button found:", mode.count() > 0)
    if mode.count():
        mode.click()
    page.wait_for_timeout(5000)

    # Select a balloon so the property editor has something to show.
    row = page.locator(".ab-table tbody tr[data-id]").first
    if row.count():
        row.click()
        page.wait_for_timeout(1200)

    page.screenshot(path=os.path.join(OUT, f"balloon-{PART}.png"))

    rail = page.locator(".cw-rail").first
    if rail.count():
        rail.screenshot(path=os.path.join(OUT, f"rail-{PART}.png"))

    print("root has is-balloon :", page.locator(".cw-root.is-balloon").count() > 0)
    print("rail balloon panel  :", page.locator(".cw-rail-balloon:not(:empty)").count() > 0)
    print("machines hidden     :", not page.locator(".cw-rail-machines").first.is_visible()
          if page.locator(".cw-rail-machines").count() else "n/a")
    print("tray hidden         :", not page.locator(".cw-tray").first.is_visible()
          if page.locator(".cw-tray").count() else "n/a")
    print("stacked props       :", page.locator(".ab-props").count() > 0)
    print("wrote               :", OUT)
    browser.close()
