"""Does the per-viewer mask toggle actually work on the Converted sheet?"""

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
CSS = """
#ab-canvas-container { position: relative; }
.v2-surface { position: relative; }
html.mask-2d .v2-surface::after,
html.mask-balloon #ab-canvas-container::after {
  content:''; position:absolute; right:0; bottom:0; width:42%; height:30%;
  background:#f2f2f2; border:1px solid #d8d8d8; z-index:99999; pointer-events:none; }
"""

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1680, "height": 1050})
    pg.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    pg.fill("input[name=Username]", "admin")
    pg.fill("input[name=Password]", "serenity")
    pg.click("button[type=submit]")
    pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(2000)
    pg.goto(f"{BASE}/Costing/Workspace/12", wait_until="networkidle")
    pg.wait_for_timeout(7000)

    pg.add_style_tag(content=CSS)
    pg.evaluate("() => document.documentElement.classList.add('mask-2d','mask-balloon')")

    pg.locator(".cw-doc-badge:has-text('2D'), .cw-doc:has-text('2D')").first.click()
    pg.wait_for_timeout(4000)
    pg.locator(":text-is('Original')").first.click()
    pg.wait_for_timeout(3500)
    print("classes after Original:",
          pg.evaluate("() => document.documentElement.className"))
    pg.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\probe-a-original.png")

    pg.locator(":text-is('Converted')").first.click()
    try:
        pg.wait_for_function(
            """() => { const i = document.querySelector('.v2-image');
                       return !!i && /ConvertedDrawing/i.test(i.src) && i.complete; }""",
            timeout=15000)
        print("converted image loaded")
    except Exception as e:
        print("wait_for_converted_image TIMED OUT:", str(e)[:90])

    print("v2-image src:",
          pg.evaluate("() => document.querySelector('.v2-image')?.src || 'none'"))

    pg.evaluate("() => document.documentElement.classList.toggle('mask-2d', false)")
    pg.wait_for_timeout(1500)
    print("classes after unmask:",
          pg.evaluate("() => document.documentElement.className"))
    print("mask-2d present:",
          pg.evaluate("() => document.documentElement.classList.contains('mask-2d')"))
    pg.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\probe-b-converted.png")
    print("\nwrote probe-a-original.png / probe-b-converted.png")
    b.close()
