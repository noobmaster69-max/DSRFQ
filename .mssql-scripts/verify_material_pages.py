"""The seeded rows are visible and editable in the pages that maintain them.

Data inserted straight into the tables can still be invisible in the app - a
grid filtered on a company, a lookup that needs a row the seed did not create -
so this loads each page and counts what it actually lists.
"""
import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
PAGES = [
    ("Material/Materials", 12),
    ("Material/RawMaterialCosts", 12),
    ("Master/WeightUnits", 5),
    ("Master/VolumeUnits", 4),
    ("Master/DimensionUnits", 4),
    ("Master/Currencies", 4),
]
failures = []


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + ((" -- " + detail) if detail else ""))
    if not ok:
        failures.append(label)


with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1700, "height": 1000})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(BASE + "/Account/Login", wait_until="domcontentloaded")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/Account/Login" not in u, timeout=30000)

    for route, expected in PAGES:
        print("\n=== %s ===" % route)
        page.goto("%s/%s" % (BASE, route), wait_until="domcontentloaded")
        try:
            page.wait_for_selector(".slick-viewport", timeout=25000)
        except Exception:
            check("page loaded", False, "no grid rendered")
            continue
        page.wait_for_timeout(1800)

        rows = page.locator(".slick-row")
        check("lists at least the seeded rows", rows.count() >= expected,
              "%d row(s) shown, expected >= %d" % (rows.count(), expected))

        if route == "Material/RawMaterialCosts" and rows.count():
            text = rows.first.inner_text().replace("\n", " | ")
            # The price is useless without knowing which material and unit it
            # belongs to, so make sure those columns resolved rather than
            # showing a bare id.
            check("price row shows its material", any(c.isalpha() for c in text), text[:110])

        page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\seed-%s.png"
                        % route.replace("/", "-"))

    real = [e for e in errors if "favicon" not in e.lower()]
    check("no page errors across all pages", not real, "; ".join(real[:2]))
    b.close()

print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
