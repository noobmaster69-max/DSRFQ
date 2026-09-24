"""Confirms picking a material in the workspace actually persists.

Rendering is only half of it: the picker writes into pendingEdits and Save
posts them, and a mis-typed field name would fail silently -- the UI would look
right and MaterialID would stay NULL, which is the exact bug this whole change
exists to remove.

Picks a material, saves, re-reads the page, then clears it and saves again, so
the part is left exactly as it was found. Verify the database side with:

    SELECT MaterialID FROM dbo.CostingParts WHERE ID = <part>

    python .mssql-scripts/check_material_picker_save.py [part_id]
"""

import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
PART = sys.argv[1] if len(sys.argv) > 1 else "12"
USER, PASSWORD = "admin", "serenity"

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


def open_workspace(page):
    page.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="networkidle")
    page.wait_for_timeout(4000)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1600, "height": 1000})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", USER)
    page.fill("input[name=Password]", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)

    open_workspace(page)
    check("logged in", "/Account/Login" not in page.url, page.url)

    # select2 hides the real input, so drive it the way a user would.
    page.locator(".cw-material-editor .select2-choice").click()
    page.wait_for_timeout(800)
    options = page.locator(".select2-results li")
    count = options.count()
    check("lookup returned materials", count > 0, f"{count} options")
    if count:
        chosen_text = options.nth(0).inner_text().strip()
        options.nth(0).click()
        page.wait_for_timeout(600)
        print(f"info  picked {chosen_text!r}")

        warn_after_pick = page.locator(".cw-material-warn p").count()
        check("warning clears once a material is picked", warn_after_pick == 0)

        page.locator("#cw-save").click()
        page.wait_for_timeout(2500)

        open_workspace(page)
        shown = page.locator(".cw-material-editor .select2-chosen").inner_text().strip()
        check("selection survived a reload", shown == chosen_text,
              f"showing {shown!r}, picked {chosen_text!r}")

        # Put it back: part 12's drawing says SEE BOM, so "no material" is the
        # correct state and this script must not leave a wrong one behind.
        #
        # Via allowClear's X, with Escape first: select2 lays a full-page
        # #select2-drop-mask over everything while its dropdown is open, and it
        # swallows every click until dismissed.
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)
        clear = page.locator(".cw-material-editor .select2-search-choice-close, "
                             ".cw-material-editor abbr.select2-search-choice-close")
        check("clear button available (allowClear)", clear.count() > 0)
        if clear.count():
            clear.first.click()
            page.wait_for_timeout(600)
            check("warning returns once cleared",
                  page.locator(".cw-material-warn p").count() == 1)
            page.locator("#cw-save").click()
            page.wait_for_timeout(2500)

            open_workspace(page)
            check("cleared value survived a reload",
                  page.locator(".cw-material-warn p").count() == 1)

    check("no page errors", not errors, "; ".join(errors[:2]))
    page.screenshot(path=r"C:\Users\LAPTOP-001\AppData\Local\Temp\material-picker-save.png")
    browser.close()

print()
print("all good" if not failures else f"{len(failures)} failure(s): {', '.join(failures)}")
sys.exit(1 if failures else 0)
