"""Prints the visible column headers of a DSRFQ grid.

Columns come from a C# columns script baked into the running assembly, so
removing one only takes effect after a rebuild and restart -- and the browser
is the only place that shows what actually shipped.

    python .mssql-scripts/check_grid_columns.py /Costing/CostingParts
"""

import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
PATH = sys.argv[1] if len(sys.argv) > 1 else "/Costing/CostingParts"
ABSENT = sys.argv[2] if len(sys.argv) > 2 else "Machine"
USER, PASSWORD = "admin", "serenity"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1800, "height": 1000})

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", USER)
    page.fill("input[name=Password]", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)

    page.goto(f"{BASE}{PATH}", wait_until="networkidle")
    page.wait_for_timeout(3500)

    headers = [h.strip() for h in
               page.locator(".slick-header-column .slick-column-name").all_inner_texts()]
    print(f"{PATH} columns ({len(headers)}):")
    for h in headers:
        print(f"  {h}")

    hit = [h for h in headers if h.lower() == ABSENT.lower()]
    print(f"\n{'FAIL' if hit else 'ok  '} '{ABSENT}' column "
          f"{'still present' if hit else 'is gone'}")
    browser.close()
    sys.exit(1 if hit else 0)
