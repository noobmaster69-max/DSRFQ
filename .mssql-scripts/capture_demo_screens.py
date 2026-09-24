"""Capture the screens a one-minute walkthrough would show.

    python .mssql-scripts/capture_demo_screens.py
"""

import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
OUT = r"C:\Aizera\DSRFQ\.mssql-scripts"

DEMO_PART = "12"

SHOTS = [
    ("demo-1-dashboard", "/", 3500),
    ("demo-2-library", "/Costing/CostingParts", 5000),
    ("demo-3-workspace", f"/Costing/Workspace/{DEMO_PART}", 7000),
    ("demo-4-queue", "/Costing/Queue", 4000),
    ("demo-5-files", "/Costing/Files", 4500),
]

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={"width": 1680, "height": 1050})
    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    for name, path, wait in SHOTS:
        try:
            page.goto(f"{BASE}{path}", wait_until="networkidle")
        except Exception as exc:
            print(f"skip {path}: {str(exc)[:70]}")
            continue
        page.wait_for_timeout(wait)
        if "/Account/Login" in page.url:
            print(f"skip {path}: redirected to login")
            continue
        page.screenshot(path=f"{OUT}/{name}.png", full_page=False)
        print(f"{name}.png  <- {path}")

    # --- the two views that need a click to reach --------------------------
    # Ballooning is the most visual thing in the system, and it lives behind
    # selecting the 2D document first: a part opens on its 3D model, and the
    # Balloon button only appears once a drawing is selected.
    page.goto(f"{BASE}/Costing/Workspace/{DEMO_PART}", wait_until="networkidle")
    page.wait_for_timeout(6000)

    twod = page.locator(".cw-doc-badge:has-text('2D'), .cw-doc:has-text('2D')").first
    if twod.count():
        twod.click()
        page.wait_for_timeout(3000)
        page.screenshot(path=f"{OUT}/demo-6-drawing.png")
        print("demo-6-drawing.png  <- 2D sheet")

    bal = page.locator("button:has-text('Balloon')").first
    if bal.count():
        bal.click()
        page.wait_for_timeout(6000)
        page.screenshot(path=f"{OUT}/demo-7-balloons.png")
        print("demo-7-balloons.png  <- balloon view")

        # Page 3 carries the bulk of them on most drawings.
        for _ in range(2):
            nxt = page.locator("#btn-next-page")
            if nxt.count() and not nxt.first.is_disabled():
                nxt.first.click()
                page.wait_for_timeout(2500)
        page.screenshot(path=f"{OUT}/demo-8-balloons-p3.png")
        print("demo-8-balloons-p3.png  <- balloon view, page 3")

    b.close()

