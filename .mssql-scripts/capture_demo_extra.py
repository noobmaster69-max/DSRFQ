"""Capture the queue and file-library shots in a state worth filming.

The Processing Queue is idle most of the time, so a raw screenshot is three
empty lane cards. "Show finished" turns it into the run history, which is what
actually makes the point. The File Library is likewise more convincing with a
search applied than as a flat list.

    python .mssql-scripts/capture_demo_extra.py
"""

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
OUT = r"C:\Aizera\DSRFQ\.mssql-scripts"

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={"width": 1680, "height": 1050})
    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    # --- queue, showing the run history -----------------------------------
    page.goto(f"{BASE}/Costing/Queue", wait_until="networkidle")
    page.wait_for_timeout(3500)
    # Serenity toolbar buttons are divs carrying the cssClass from getButtons,
    # not <button> elements -- "button:has-text(...)" silently matches nothing.
    fin = page.locator(".cq-history-button").first
    print("history button found:", fin.count())
    if fin.count():
        fin.click()
        page.wait_for_timeout(4000)
    rows = page.locator(".slick-row").count()
    page.screenshot(path=f"{OUT}/demo-4-queue-history.png")
    print(f"demo-4-queue-history.png  ({rows} row(s) rendered)")

    # --- file library, searched -------------------------------------------
    page.goto(f"{BASE}/Costing/Files", wait_until="networkidle")
    page.wait_for_timeout(3500)
    # Scope to the grid's own toolbar: the page-level selector matches the
    # sidebar navigation search first, which types into the menu filter and
    # leaves the grid untouched (and looks, in a screenshot, exactly like a
    # search that returned everything).
    box = page.locator(".s-DataGrid .s-QuickSearchInput, "
                       ".grid-container .s-QuickSearchInput").first
    print("search box found:", box.count())
    if box.count():
        box.click()
        box.type("0043-07547", delay=60)
        page.wait_for_timeout(4000)
    txt = page.evaluate("() => document.body.innerText")
    import re
    m = re.search(r"of\s+([\d,]+)\s+total records", txt)
    print(f"demo-5-files-search.png  (matches: {m.group(1) if m else '?'})")
    page.screenshot(path=f"{OUT}/demo-5-files-search.png")

    b.close()
