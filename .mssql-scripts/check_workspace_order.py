"""The costing tray shows its lines in process order, in the real browser.

check_page_loads.py cannot judge this one: the workspace is not a Serenity
DataGrid, so its grid check finds nothing and reports a failure regardless.
This opens the costing tab and reads the rendered rows instead.

    python .mssql-scripts/check_workspace_order.py [partId]
"""

import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
USER, PASSWORD = "admin", "serenity"
PART = sys.argv[1] if len(sys.argv) > 1 else "15"

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


def rank(name):
    n = (name or "").lower()
    for i, key in enumerate(("material", "setup", "rough", "semi", "finish", "turning")):
        if key == "setup" and ("setup" in n or "clamp" in n):
            return 1
        if key in n:
            return i
    return 6


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1680, "height": 1100})

    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", USER)
    page.fill("input[name=Password]", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)

    errors.clear()
    page.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="networkidle")
    page.wait_for_timeout(3500)

    real = [e for e in errors if "favicon" not in e.lower() and "404" not in e]
    check("no javascript errors", not real, f"{len(real)}")
    for e in real[:3]:
        print(f"        {e[:200]}")

    # Costing is the default tray tab, so there is nothing to click. Do NOT
    # try to click "text=Costing" -- that also matches the sidebar's COSTING
    # heading and navigates away from the part.
    check("the costing table rendered", page.locator("table.cw-table").count() >= 1)

    # Columns are: #, Category, Name, Description, Machine, Qty, ...
    # The line name is the 3rd cell; the first is just the row number.
    names = page.eval_on_selector_all(
        "table.cw-table tbody tr td:nth-child(3)",
        "els => els.map(e => e.textContent.replace(/\\s+/g, ' ').trim())"
        ".filter(Boolean)")

    costing = [n for n in names if rank(n) < 6]
    print(f"\n  rendered cost lines: {costing}")

    check("cost lines were rendered", bool(costing), f"{len(costing)} found")

    ranks = [rank(n) for n in costing]
    check("they are in process order", ranks == sorted(ranks), str(costing))

    if "Milling Semi-Finishing" in costing and "Milling Finishing" in costing:
        check("semi-finishing comes before finishing",
              costing.index("Milling Semi-Finishing") < costing.index("Milling Finishing"))

    page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\workspace-costing.png",
                    full_page=True)
    print("  wrote .mssql-scripts/workspace-costing.png")
    browser.close()

print()
print("all good" if not failures else f"{len(failures)} failure(s): " + ", ".join(failures))
sys.exit(1 if failures else 0)
