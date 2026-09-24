"""Confirms the seeded machine pictures actually render in the grid.

Rows pointing at files is not the same as a grid showing images: the thumbnail
is a separate file from the one the column stores, and a missing one shows as a
broken image rather than an error anywhere a query would find it. This checks
every <img> in the grid resolved to real pixels.

    python .mssql-scripts/check_machine_pictures.py
"""

import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
USER, PASSWORD = "admin", "serenity"
SHOT = r"C:\Users\LAPTOP-001\AppData\Local\Temp\machines-pictures.png"

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1700, "height": 1100})

    bad = []
    page.on("response", lambda r: bad.append(f"{r.status} {r.url}")
            if r.status >= 400 and "/upload/" in r.url else None)

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", USER)
    page.fill("input[name=Password]", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)

    page.goto(f"{BASE}/Machines/Machines", wait_until="networkidle")
    page.wait_for_timeout(4000)

    imgs = page.locator(".slick-viewport img")
    count = imgs.count()
    check("grid renders images", count > 0, f"{count} <img> in view")

    # naturalWidth is 0 for an <img> whose source failed, which is how a broken
    # thumbnail looks -- the element is present either way.
    broken = page.evaluate(
        "() => Array.from(document.querySelectorAll('.slick-viewport img'))"
        ".filter(i => !i.complete || i.naturalWidth === 0).length")
    check("no broken thumbnails", broken == 0, f"{broken} broken")
    check("no failed /upload/ requests", not bad, "; ".join(bad[:3]))

    page.screenshot(path=SHOT)
    print(f"\nscreenshot: {SHOT}")
    browser.close()

print()
print("all good" if not failures else f"{len(failures)} failure(s): {', '.join(failures)}")
sys.exit(1 if failures else 0)
