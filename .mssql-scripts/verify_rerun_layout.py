"""All three re-run buttons are fully inside their grid row, in both themes.

Measures geometry rather than eyeballing a screenshot: the first version
rendered and passed every content check while the third button was clipped
below the row boundary.
"""
import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
failures = []


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + ((" -- " + detail) if detail else ""))
    if not ok:
        failures.append(label)


with sync_playwright() as p:
    b = p.chromium.launch()
    for theme in ("light", "dark"):
        print("\n=== theme: %s ===" % theme)
        page = b.new_page(viewport={"width": 1800, "height": 1000})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        page.goto(BASE + "/Account/Login", wait_until="domcontentloaded")
        page.fill("input[name=Username]", "admin")
        page.fill("input[name=Password]", "serenity")
        page.click("button[type=submit]")
        page.wait_for_url(lambda u: "/Account/Login" not in u, timeout=30000)
        page.goto(BASE + "/Costing/CostingParts", wait_until="domcontentloaded")
        page.wait_for_selector(".cp-rerun-group", timeout=30000)
        page.wait_for_timeout(2000)
        if theme == "dark":
            page.evaluate("document.documentElement.classList.remove('theme-azure-light');"
                          "document.documentElement.classList.add('theme-cosmos-dark');")
            page.wait_for_timeout(500)

        geo = page.evaluate("""() => {
            const cell = document.querySelector('.cp-rerun-group');
            const row = cell.closest('.slick-row');
            const rb = row.getBoundingClientRect();
            return {
                rowTop: rb.top, rowBottom: rb.bottom, rowHeight: rb.height,
                buttons: [...cell.querySelectorAll('.cp-rerun')].map(x => {
                    const r = x.getBoundingClientRect();
                    return {top: r.top, bottom: r.bottom, height: r.height,
                            text: x.innerText.trim()};
                })
            };
        }""")

        print("  row height %.0fpx" % geo["rowHeight"])
        for btn in geo["buttons"]:
            inside = btn["top"] >= geo["rowTop"] - 0.5 and btn["bottom"] <= geo["rowBottom"] + 0.5
            check("'%s' fits inside the row" % btn["text"], inside,
                  "button %.0f-%.0f vs row %.0f-%.0f"
                  % (btn["top"], btn["bottom"], geo["rowTop"], geo["rowBottom"]))

        check("all three buttons measured", len(geo["buttons"]) == 3,
              "%d measured" % len(geo["buttons"]))

        real = [e for e in errors if "favicon" not in e.lower()]
        check("no page errors", not real, "; ".join(real[:2]))

        page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\rerun-layout-%s.png" % theme)
        page.close()
    b.close()

print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
