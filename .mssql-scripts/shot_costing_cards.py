"""Screenshot the costing parts list, to see the card view as a user does.

    python .mssql-scripts/shot_costing_cards.py

Writes .mssql-scripts/shots/costing-cards.png and reports what rendered.
"""

import os
import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1680, "height": 1000})
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.wait_for_timeout(1200)
    user = page.get_by_placeholder("user name")
    if user.count():
        user.fill("admin")
        page.get_by_placeholder("password").fill("serenity")
        page.get_by_role("button", name="Sign In").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)

    page.goto(f"{BASE}/Costing/CostingParts", wait_until="networkidle")
    try:
        page.wait_for_selector(".cp-card", timeout=45000)
    except Exception:
        print("  no .cp-card rendered")
    page.wait_for_timeout(2500)

    print(f"  cards          : {page.locator('.cp-card').count()}")
    print(f"  status chips   : {page.locator('.cp-chip').count()}")
    print(f"  document pills : {page.locator('.cp-doc').count()}")
    print(f"  thumbnails     : {page.locator('.cp-card-thumb img').count()}")
    print(f"  rerun buttons  : {page.locator('.cp-card .cp-rerun').count()}")
    print(f"  Open buttons   : {page.locator('.open-workspace-button').count()}")
    # Every other column should be hidden, so the card is the only cell.
    print(f"  visible headers: {page.locator('.slick-header-column:visible').count()}")

    first = page.locator(".cp-card").first
    if first.count():
        box = first.bounding_box()
        print(f"  card size      : {box['width']:.0f} x {box['height']:.0f}px")
        print(f"  part number    : {page.locator('.cp-part').first.inner_text()}")

    page.screenshot(path=os.path.join(OUT, "costing-cards.png"))
    print(f"  console errors : {[e[:90] for e in errors][:3] or 'none'}")
    browser.close()
