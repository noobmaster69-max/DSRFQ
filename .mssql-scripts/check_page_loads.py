"""Loads DSRFQ pages and fails on any JavaScript error.

Written for the "formatter class not found" class of bug: a columns script names
its formatter as a string, so a missing side-effect import breaks the page only
at runtime, in the browser. Nothing in the build catches it -- tsbuild is happy,
the C# compiles, and the grid throws while constructing.

    python .mssql-scripts/check_page_loads.py [/Some/Path ...]
"""

import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
USER, PASSWORD = "admin", "serenity"

PAGES = sys.argv[1:] or [
    "/Machines/Machines",          # [InlineImageFormatter] on Picture
    "/Costing/CostingParts",       # same formatter, already had the import
    "/Costing/Queue",              # the processing queue page
    "/Master/ToolTemplateConversion",
]

failures = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1600, "height": 1000})

    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", USER)
    page.fill("input[name=Password]", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)

    for path in PAGES:
        errors.clear()
        page.goto(f"{BASE}{path}", wait_until="networkidle")
        # Grids build their columns after the page module resolves.
        page.wait_for_timeout(3500)

        if "/Account/Login" in page.url:
            print(f"SKIP  {path} - redirected to login (no permission?)")
            continue

        # A grid that threw while constructing leaves no rows container behind,
        # so this distinguishes "loaded empty" from "failed to build".
        grid = page.locator(".slick-viewport, .s-DataGrid").count()
        real = [e for e in errors if "favicon" not in e.lower()]

        ok = not real and grid > 0
        print(f"{'ok   ' if ok else 'FAIL '} {path}  grid={grid}  errors={len(real)}")
        for e in real[:2]:
            print(f"        {e[:220]}")
        if not ok:
            failures.append(path)

    browser.close()

print()
print("all good" if not failures else f"{len(failures)} failing page(s): {', '.join(failures)}")
sys.exit(1 if failures else 0)
