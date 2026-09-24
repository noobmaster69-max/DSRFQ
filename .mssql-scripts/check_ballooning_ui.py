"""Ballooning paging and wheel-zoom work, including filenames with spaces.

renderCanvas guarded its image swap with `!imgEl.src.endsWith(src)`. The browser
percent-encodes what it is handed, so for a path containing a space that test
never matched: the image was reassigned on every render, its onload re-entered
renderCanvas, and the toolbar was rebuilt about twice a second. Clicks on
Next-page landed on a detached button and the wheel's zoom was immediately
undone by fitToViewport.

Part 25 is the reproduction ("..._Green_Standard (2).pdf"); part 15 is the
control, with no space in its name.

    python .mssql-scripts/check_ballooning_ui.py [partId ...]
"""

import re
import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
PARTS = sys.argv[1:] or ["25", "15"]

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={"width": 1680, "height": 1050})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)

    for part in PARTS:
        print(f"\n=== part {part} ===")
        errors.clear()
        page.goto(f"{BASE}/Costing/Workspace/{part}", wait_until="networkidle")
        page.wait_for_timeout(4000)

        # Ballooning works on the 2D sheet, and the Balloon button only appears
        # once a 2D document is selected -- a part that opens on its 3D model
        # has no balloon view until you pick the drawing.
        twod = page.locator(".cw-doc-badge:has-text('2D'), .cw-doc:has-text('2D')").first
        if twod.count():
            twod.click()
            page.wait_for_timeout(2500)

        bal = page.locator("button:has-text('Balloon')").first
        if not bal.count():
            check(f"part {part}: balloon view available", False,
                  "no Balloon button even after selecting the 2D document")
            continue
        bal.click()
        page.wait_for_timeout(5000)

        def page_label():
            el = page.locator("#ab-toolbar span:has-text('Page')").first
            return el.text_content().strip() if el.count() else ""

        def zoom_label():
            el = page.locator("#ab-toolbar span").filter(has_text="%").first
            return el.text_content().strip() if el.count() else ""

        label = page_label()
        print(f"  {label}   zoom {zoom_label()}")
        total = int(re.search(r"/\s*(\d+)", label).group(1)) if "/" in label else 1
        check(f"part {part}: the page count was read", total >= 1, label)

        # The toolbar must be STABLE -- this is the actual regression. If it is
        # being rebuilt, the same button node will not survive a second.
        stable = page.evaluate("""async () => {
            const first = document.querySelector('#btn-next-page');
            if (!first) return 'no button';
            await new Promise(r => setTimeout(r, 2500));
            const later = document.querySelector('#btn-next-page');
            return first === later ? 'stable' : 'replaced';
        }""")
        check(f"part {part}: the toolbar is not rebuilding itself",
              stable in ("stable", "no button"), stable)

        if total > 1:
            before = page_label()
            page.locator("#btn-next-page").first.click(timeout=8000)
            page.wait_for_timeout(1200)
            after = page_label()
            print(f"  next page: {before!r} -> {after!r}")
            check(f"part {part}: Next page advances", before != after,
                  f"{before} -> {after}")

            page.locator("#btn-prev-page").first.click(timeout=8000)
            page.wait_for_timeout(1200)
            check(f"part {part}: Previous page goes back", page_label() == before,
                  page_label())
        else:
            print("  single page; paging not applicable")

        vp = page.locator("#ab-viewport").first
        box = vp.bounding_box()
        z_before = zoom_label()
        page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        page.mouse.wheel(0, -300)
        page.wait_for_timeout(1000)
        z_after = zoom_label()
        print(f"  wheel zoom: {z_before!r} -> {z_after!r}")
        check(f"part {part}: scrolling zooms in", z_before != z_after,
              f"{z_before} -> {z_after}")

        # And it must STAY zoomed rather than snapping back.
        page.wait_for_timeout(2000)
        check(f"part {part}: the zoom sticks", zoom_label() == z_after,
              f"{z_after} -> {zoom_label()}")

        real = [e for e in errors if "favicon" not in e.lower()]
        check(f"part {part}: no javascript errors", not real, str(real[:2]))

    b.close()

print()
print("all good" if not failures else f"{len(failures)} failure(s): "
      + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
