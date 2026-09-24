"""The Original sheet renders pages instead of the "no page images" message.

The user saw this on parts 14 and 15. The database side is covered by
check_original_pages.py; this confirms what the workspace actually shows.

    python .mssql-scripts/check_original_sheet_ui.py [partId ...]
"""

import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
PARTS = sys.argv[1:] or ["14", "15"]

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={"width": 1680, "height": 1100})
    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1200)

    for part in PARTS:
        print(f"\n=== part {part} ===")
        page.goto(f"{BASE}/Costing/Workspace/{part}", wait_until="networkidle")
        page.wait_for_timeout(3500)

        # Open the 2D document, then the Original sheet.
        twod = page.locator(".cw-doc-badge:has-text('2D'), .cw-doc:has-text('2D')").first
        if twod.count():
            try:
                twod.click()
                page.wait_for_timeout(2000)
            except Exception as exc:
                print(f"  could not click the 2D document: {exc}")

        orig = page.locator("button:has-text('Original'), .cw-sheet-switch button").first
        if orig.count():
            try:
                orig.click()
                page.wait_for_timeout(2500)
            except Exception as exc:
                print(f"  could not click the Original switch: {exc}")

        msg = (page.locator(".cw-stage-message").first.text_content() or "").strip()
        imgs = page.locator(".cw-stage img, .v2d-page img, canvas").count()
        print(f"  stage message: {msg!r}")
        print(f"  rendered image/canvas elements: {imgs}")

        check(f"part {part}: no 'no page images' message",
              "no page images" not in msg.lower(), msg[:70])

        page.screenshot(path=rf"C:\Aizera\DSRFQ\.mssql-scripts\original-sheet-{part}.png",
                        full_page=True)

    b.close()

print()
print("all good" if not failures else f"{len(failures)} failure(s): " + ", ".join(failures))
sys.exit(1 if failures else 0)
