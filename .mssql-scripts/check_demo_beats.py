"""Verify the states the video passes through actually look right.

A beat that throws is reported; a beat whose click lands somewhere harmless is
not. This walks the same path and screenshots each state so the blur, the tab
switches and the anonymised text can be checked.

    python .mssql-scripts/check_demo_beats.py
"""

import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
PART = "12"
OUT = r"C:\Aizera\DSRFQ\.mssql-scripts"

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


BLUR_JS = """(on) => {
    document.getElementById('demo-blur')?.remove();
    if (!on) return false;
    const img = document.querySelector('#ab-image, .cw-stage img, #cw-2d img');
    if (!img) return false;
    const r = img.getBoundingClientRect();
    const d = document.createElement('div');
    d.id = 'demo-blur';
    d.style.cssText = [
        'position:fixed',
        'left:' + (r.left + r.width * 0.62) + 'px',
        'top:' + (r.top + r.height * 0.74) + 'px',
        'width:' + (r.width * 0.38) + 'px',
        'height:' + (r.height * 0.26) + 'px',
        'backdrop-filter:blur(9px)',
        '-webkit-backdrop-filter:blur(9px)',
        'background:rgba(255,255,255,0.35)',
        'z-index:9999','pointer-events:none','border-radius:3px'
    ].join(';');
    document.body.appendChild(d);
    return true;
}"""

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={"width": 1680, "height": 1050})
    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    page.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="networkidle")
    page.wait_for_timeout(7000)

    header = page.locator(".cw-header").first.inner_text()
    print(f"header: {header[:90]!r}")
    check("the customer name is gone from the header",
          "APPLIED" not in header.upper(), header[:70])

    def tab(label):
        page.locator(f".cw-tray-tabs :text-is('{label}'), "
                     f".cw-tray :text-is('{label}')").first.click()
        page.wait_for_timeout(2500)

    # --- BOM -------------------------------------------------------------
    tab("BOM")
    body = page.locator(".cw-tray").first.inner_text()
    page.screenshot(path=f"{OUT}/beat-bom.png")
    check("the BOM tab shows parts-list rows",
          "3550-01081" in body or "HELICOIL" in body.upper(), body[:70].replace("\n", " "))

    # --- Special process --------------------------------------------------
    tab("Special process")
    body = page.locator(".cw-tray").first.inner_text()
    page.screenshot(path=f"{OUT}/beat-special.png")
    print(f"special process text: {body[:150].replace(chr(10), ' | ')!r}")
    check("the special process tab shows its rows",
          "CLEAN PER" in body.upper() or "SILVER PLATE" in body.upper())
    check("the customer name is gone from the special processes",
          "APPLIED MATERIALS" not in body.upper())

    # --- Original sheet, blurred -----------------------------------------
    page.locator(".cw-doc-badge:has-text('2D'), .cw-doc:has-text('2D')").first.click()
    page.wait_for_timeout(4000)
    page.locator(":text-is('Original')").first.click()
    page.wait_for_timeout(3000)
    placed = page.evaluate(BLUR_JS, True)
    page.wait_for_timeout(1200)
    check("the blur overlay was placed on the original sheet", placed is True)
    box = page.evaluate("""() => {
        const d = document.getElementById('demo-blur');
        if (!d) return null;
        const r = d.getBoundingClientRect();
        return {x: Math.round(r.x), y: Math.round(r.y),
                w: Math.round(r.width), h: Math.round(r.height)};
    }""")
    print(f"blur box: {box}")
    check("the blur has real size", bool(box) and box["w"] > 80 and box["h"] > 50,
          str(box))
    page.screenshot(path=f"{OUT}/beat-original-blurred.png")

    # --- Converted sheet, unmasked ---------------------------------------
    page.evaluate(BLUR_JS, False)
    page.locator(":text-is('Converted')").first.click()
    page.wait_for_timeout(4000)
    gone = page.evaluate("() => !document.getElementById('demo-blur')")
    check("the blur is removed for the converted sheet", gone)
    page.screenshot(path=f"{OUT}/beat-converted.png")

    b.close()

print()
print("all good" if not failures else f"{len(failures)} failure(s): "
      + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
