"""Does multi-select and batch editing work in the real workspace?

The dangerous failure is silent: a batch panel that writes every field it shows
looks the same as one that writes only what was touched, right up until forty
balloons share the primary's symbol. So this checks the untouched field
explicitly, on real data.

    python .mssql-scripts/check_batch_edit_ui.py [part_id]
"""

import os
import sys

from playwright.sync_api import sync_playwright

PART = sys.argv[1] if len(sys.argv) > 1 else "12"
BASE = "http://localhost:5001"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)
fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + str(detail) if detail else ''}")
    if not ok:
        fails.append(name)


def row_cells(page):
    return page.evaluate("""() => Array.from(
        document.querySelectorAll('.ab-table tbody tr[data-id]'))
        .map(tr => ({id: tr.getAttribute('data-id'),
                     cells: Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim()),
                     selected: tr.classList.contains('selected')}))""")


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1600, "height": 950})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.wait_for_timeout(1500)
    user = page.get_by_placeholder("user name")
    if user.count():
        user.fill("admin")
        page.get_by_placeholder("password").fill("serenity")
        page.get_by_role("button", name="Sign In").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)

    page.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="networkidle")
    page.wait_for_timeout(3000)
    doc2d = page.locator(".cw-rail-docs [class*=row]:has-text('2D')").first
    if not doc2d.count():
        doc2d = page.locator(".cw-rail-docs >> text=2D").first
    if doc2d.count():
        doc2d.click()
        page.wait_for_timeout(3500)
    mode = page.locator(".cw-modes button:has-text('Balloon')").first
    if mode.count():
        mode.click()
    page.wait_for_timeout(6000)

    rows = page.locator(".ab-table tbody tr[data-id]")
    check("the page has balloons", rows.count() >= 5, rows.count())
    if rows.count() < 5:
        browser.close()
        sys.exit(1)

    print("\n1. single selection still behaves")
    rows.nth(0).click()
    page.wait_for_timeout(700)
    check("one row selects", len([r for r in row_cells(page) if r["selected"]]) == 1)
    check("the single-balloon panel is shown",
          page.locator("#ab-content").count() > 0)

    print("\n2. ctrl-click adds")
    rows.nth(2).click(modifiers=["Control"])
    page.wait_for_timeout(700)
    sel = [r for r in row_cells(page) if r["selected"]]
    check("two rows are selected", len(sel) == 2, len(sel))
    check("the batch panel replaced the single one",
          page.locator("#ab-batch-apply").count() > 0 and page.locator("#ab-content").count() == 0)
    title = page.locator(".ab-panel-title").first.inner_text()
    check("it names the count", "2 balloons selected" in title, title)
    check("it lists which balloons", page.locator(".ab-batch-list").count() > 0,
          page.locator(".ab-batch-list").inner_text()[:60] if page.locator(".ab-batch-list").count() else "")

    print("\n3. shift-click ranges")
    rows.nth(0).click()
    page.wait_for_timeout(500)
    rows.nth(4).click(modifiers=["Shift"])
    page.wait_for_timeout(700)
    sel = [r for r in row_cells(page) if r["selected"]]
    check("the whole range is selected", len(sel) == 5, len(sel))

    print("\n4. apply writes only what was touched")
    before = {r["id"]: r["cells"] for r in row_cells(page) if r["selected"]}
    ids = list(before)
    # Columns are: 0 No | 1 Symbol | 2 Upper | 3 Lower | 4 Qty.
    # Symbols differ across the range; none of them may change.
    symbols_before = {i: before[i][1] for i in ids}

    check("Apply is disabled until a field is edited",
          page.locator("#ab-batch-apply").is_disabled())

    page.locator("#ab-b-upper").fill("+.020")
    page.wait_for_timeout(500)
    label = page.locator("#ab-batch-apply").inner_text()
    check("the button counts the edited fields", "1 field" in label, label)
    page.screenshot(path=os.path.join(OUT, f"batch-{PART}.png"))

    page.locator("#ab-batch-apply").click()
    page.wait_for_timeout(2000)

    after = {r["id"]: r["cells"] for r in row_cells(page)}
    upper_set = sum(1 for i in ids if after.get(i, ["", "", "", ""])[2] == "+.020")
    check("every selected balloon got the upper tol", upper_set == len(ids),
          f"{upper_set}/{len(ids)}")
    # The one that matters.
    unchanged = all(after[i][1] == symbols_before[i] for i in ids if i in after)
    check("no selected balloon's symbol was overwritten", unchanged)
    untouched_lower = all(after[i][3] == before[i][3] for i in ids if i in after)
    check("lower tol was not invented", untouched_lower)

    check("no page errors", not errors, errors[:2])
    page.screenshot(path=os.path.join(OUT, f"batch-applied-{PART}.png"))
    browser.close()

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
