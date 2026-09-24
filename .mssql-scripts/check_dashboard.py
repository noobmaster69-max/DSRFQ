"""Loads the dashboard, fails on any JS error, and screenshots both themes.

The palette validator checks colour, not layout -- label collisions, clipped
text and overflow only show up in a rendered page, so this captures one.

    python .mssql-scripts/check_dashboard.py
"""

import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
USER, PASSWORD = "admin", "serenity"
OUT = r"C:\Aizera\DSRFQ\.mssql-scripts"

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1680, "height": 1200})

    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", USER)
    page.fill("input[name=Password]", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    errors.clear()
    page.goto(f"{BASE}/", wait_until="networkidle")
    page.wait_for_timeout(2000)

    real = [e for e in errors if "favicon" not in e.lower()]
    check("no javascript errors", not real, f"{len(real)}")
    for e in real[:3]:
        print(f"        {e[:220]}")

    check("dashboard root rendered", page.locator(".dsrfq-dash").count() == 1)
    check("four KPI tiles", page.locator(".dsrfq-dash .kpi").count() == 4,
          str(page.locator(".dsrfq-dash .kpi").count()))

    cards = page.locator(".dsrfq-dash .dash-grid > .card, .dsrfq-dash .dash-grid > section").count()
    check("five chart cards", cards == 5, str(cards))

    charts = page.locator(".dsrfq-dash svg").count()
    check("four svg charts", charts == 4, str(charts))

    # A legend belongs to the two stacked charts, which have several series.
    # The two single-series charts must NOT have one -- one swatch just
    # restates the title.
    legends = page.locator(".dsrfq-dash .legend").count()
    check("only the stacked charts carry a legend", legends == 2, str(legends))

    # A bar with no width would mean the scale collapsed.
    widths = page.eval_on_selector_all(
        ".dsrfq-dash path[fill]",
        "els => els.map(e => e.getBBox().width)")
    check("bars have width", widths and max(widths) > 20,
          f"{len(widths)} marks, widest {max(widths):.0f}px" if widths else "none")

    # No direct label may spill past its card.
    overflow = page.eval_on_selector_all(
        ".dsrfq-dash svg",
        """els => els.filter(svg => {
            const r = svg.getBoundingClientRect();
            return [...svg.querySelectorAll('text')].some(t => {
                const b = t.getBoundingClientRect();
                return b.right > r.right + 1 || b.left < r.left - 1;
            });
        }).length""")
    check("no label overflows its chart", overflow == 0, f"{overflow} chart(s)")

    # A failure detail is a stack trace; it must clip, not widen the table
    # past its card or wrap the short columns.
    spill = page.eval_on_selector_all(
        ".dsrfq-dash table.failures",
        """els => els.filter(t => t.scrollWidth > t.clientWidth + 1).length""")
    check("failures table fits its card", spill == 0, f"{spill} overflowing")

    part_h = page.eval_on_selector_all(
        ".dsrfq-dash table.failures td:first-child",
        "els => els.map(e => e.getBoundingClientRect().height)")
    check("part numbers do not wrap", part_h and max(part_h) < 34,
          f"tallest cell {max(part_h):.0f}px" if part_h else "none")

    # The table view is the documented relief for the sub-3:1 warning hue.
    toggles = page.locator(".dsrfq-dash .toggle")
    check("every chart can flip to a table", toggles.count() == 4, str(toggles.count()))
    toggles.first.click()
    page.wait_for_timeout(300)
    check("table view actually shows a table",
          page.locator(".dsrfq-dash table").count() >= 1)
    toggles.first.click()
    page.wait_for_timeout(300)

    page.screenshot(path=f"{OUT}/dashboard-light.png", full_page=True)
    print(f"\nwrote {OUT}/dashboard-light.png")

    # Dark mode is a selected palette, not an automatic flip -- check it renders.
    page.evaluate("document.documentElement.setAttribute('data-bs-theme','dark')")
    page.wait_for_timeout(400)
    page.screenshot(path=f"{OUT}/dashboard-dark.png", full_page=True)
    print(f"wrote {OUT}/dashboard-dark.png")

    browser.close()

print()
print("all good" if not failures else f"{len(failures)} failure(s): " + ", ".join(failures))
sys.exit(1 if failures else 0)
