"""Screenshot the Y14.5 palette, to check its width on the real stage.

    python .mssql-scripts/shot_gdt_palette.py [part_id]
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

    row = page.locator(".ab-table tbody tr[data-id]").first
    if row.count():
        row.click()
        page.wait_for_timeout(1500)

    # Focusing the symbol field is what opens the palette.
    page.locator("#ab-content").first.click()
    page.wait_for_timeout(2500)

    pal = page.locator(".ab-gdt-palette").first
    print("palette open   :", pal.count() > 0)
    if pal.count():
        box = pal.bounding_box()
        print("width          :", round(box["width"]))
        print("height         :", round(box["height"]))
        # It must not run off the stage it is positioned inside.
        stage = page.evaluate("""() => {
            const el = document.querySelector('.ab-gdt-palette')?.offsetParent;
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {w: Math.round(r.width), h: Math.round(r.height)};
        }""")
        print("containing box :", stage)
        print("glyph count    :", page.locator(".ab-gdt-grid .ab-gdt-cell").count()
              or page.locator(".ab-gdt-grid > *").count())
        pal.screenshot(path=os.path.join(OUT, f"gdt-{PART}.png"))
    page.screenshot(path=os.path.join(OUT, f"gdt-page-{PART}.png"))
    print("wrote          :", OUT)
    browser.close()
