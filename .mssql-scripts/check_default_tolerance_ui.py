"""Does the Default Tol dialog carry One Supply's feature set, and write through?

One Supply's dialog has three tabs (custom schemes / ISO 2768-1 / ISO 2768-2),
named schemes of three types, editable tables, five exclusions, and two ways to
commit: Apply (fill blanks) and Update applied (recalculate what a scheme
filled). This walks each of them on a real part, then checks the property
panel's per-balloon "Tolerance from".

Nothing is saved to the part - the balloons are only changed on screen. The
shop's tolerance settings ARE written (Apply saves them, as in One Supply); the
test scheme it creates is deleted again before that.

    python .mssql-scripts/check_default_tolerance_ui.py [part_id]
"""

import os
import re
import sys

from playwright.sync_api import sync_playwright

PART = sys.argv[1] if len(sys.argv) > 1 else "12"
BASE = "http://localhost:5001"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)
fails = []
TEST_SCHEME = "UI test range"


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + str(detail) if detail != '' else ''}")
    if not ok:
        fails.append(name)


def rows_with_tolerance(page):
    # By column class, not position: page and drawing columns come and go.
    rows = page.evaluate("""() => Array.from(
        document.querySelectorAll('.cw-rail-balloon .ab-table tbody tr[data-id]'))
        .map(tr => [tr.querySelector('.ab-c-up')?.textContent.trim(), tr.querySelector('.ab-c-lo')?.textContent.trim()])""")
    return sum(1 for up, lo in rows if up or lo)


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1600, "height": 950})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("dialog", lambda d: d.accept())

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

    btn = page.locator("#btn-tolerance")
    check("the Default Tol button is in the toolbar", btn.count() > 0)
    if not btn.count():
        browser.close()
        sys.exit(1)

    print("1. layout")
    btn.click()
    page.wait_for_timeout(1000)
    modal = page.locator(".ab-tol-modal")
    check("the dialog opened", modal.count() == 1)
    tabs = page.locator(".ab-tol-tab").all_inner_texts()
    check("three tabs, as One Supply", len(tabs) == 3, tabs)
    # The dialog reopens on the tab last used, which is a shop setting - so
    # start from Custom rather than assuming it.
    check("the dialog reopens on a tab", page.locator(".ab-tol-tab.active").count() == 1)
    page.locator(".ab-tol-tab[data-tab='custom']").click()
    page.wait_for_timeout(400)
    check("custom schemes is the active tab",
          "Custom" in page.locator(".ab-tol-tab.active").inner_text())
    schemes = page.locator("#ab-tol-scheme option").all_inner_texts()
    check("several named schemes ship", len(schemes) >= 4, schemes)
    check("the type is shown beside the name",
          "Decimal places" in page.locator("#ab-tol-type").inner_text(),
          page.locator("#ab-tol-type").inner_text())
    check("linear and angle decimal tables", page.locator("input[data-t='decLin']").count() > 0
          and page.locator("input[data-t='decAng']").count() > 0)
    excl = page.locator("input[data-ex]")
    check("five exclusions", excl.count() == 5, excl.count())
    check("all ticked by default", all(excl.nth(i).is_checked() for i in range(excl.count())))
    for label in ("New", "Rename", "Save", "Delete"):
        check(f"scheme button {label}", page.locator(f".ab-tol-bar button:has-text('{label}')").count() == 1)
    check("Update applied button", page.locator("#ab-tol-update").count() == 1)
    preview = page.locator("#ab-tol-preview").inner_text()
    print(f"        preview: {' | '.join(l.strip() for l in preview.splitlines() if l.strip())[:220]}")
    m = re.search(r"(\d+)\s+balloons? would be filled", preview)
    proposed = int(m.group(1)) if m else -1
    check("it counts before writing", proposed >= 0, proposed)
    page.screenshot(path=os.path.join(OUT, f"tolerance-{PART}.png"))

    print("2. editing a table")
    before_rows = page.locator("input[data-t='decLin'][data-c='0']").count()
    page.locator("[data-add='decLin']").click()
    page.wait_for_timeout(300)
    places = page.locator("input[data-t='decLin'][data-c='0']")
    check("+ Add row adds one", places.count() == before_rows + 1)
    check("the new row gets the next decimal place", places.last.input_value() == "0." + "0" * before_rows,
          places.last.input_value())
    upper = page.locator(f"input[data-t='decLin'][data-r='{before_rows}'][data-c='1']")
    upper.fill("abc")
    page.wait_for_timeout(300)
    check("a bad tolerance is marked", "ab-invalid" in (upper.get_attribute("class") or ""))
    check("and blocks Apply", page.locator("#ab-tol-apply").is_disabled())
    check("with a reason", "highlighted" in page.locator("#ab-tol-error").inner_text())
    page.locator(f"[data-del='decLin'][data-r='{before_rows}']").click()
    page.wait_for_timeout(300)
    check("x removes the row", page.locator("input[data-t='decLin'][data-c='0']").count() == before_rows)
    check("and Apply is available again", not page.locator("#ab-tol-apply").is_disabled() or proposed == 0)

    print("3. a scheme of another type")
    if TEST_SCHEME in schemes:      # left behind by an aborted run
        page.locator("#ab-tol-scheme").select_option(TEST_SCHEME)
        page.locator("#ab-tol-delete").click()
        page.wait_for_timeout(500)
    page.locator("#ab-tol-new").click()
    page.locator("#ab-tol-new-type").select_option("range")
    page.locator("#ab-tol-new-name").fill(TEST_SCHEME)
    page.locator("#ab-tol-new-ok").click()
    page.wait_for_timeout(500)
    check("the new scheme is selected", page.locator("#ab-tol-scheme").input_value() == TEST_SCHEME)
    check("as a size-range scheme", "Size range" in page.locator("#ab-tol-type").inner_text())
    check("with range tables", page.locator("[data-add='rngLin']").count() == 1
          and page.locator("[data-add='rngAng']").count() == 1)
    page.locator("[data-add='rngLin']").click()
    page.wait_for_timeout(200)
    page.locator("input[data-t='rngLin'][data-r='0'][data-c='1']").fill("100")
    page.locator("input[data-t='rngLin'][data-r='0'][data-c='2']").fill("+.02")
    page.locator("input[data-t='rngLin'][data-r='0'][data-c='3']").fill("-.02")
    page.wait_for_timeout(400)
    rp = page.locator("#ab-tol-preview").inner_text()
    check("the preview follows the range", TEST_SCHEME in rp and "would be filled" in rp, rp.splitlines()[0][:120])
    page.locator("input[data-t='rngLin'][data-r='0'][data-c='1']").fill("-5")
    page.wait_for_timeout(300)
    check("a range ending before it starts is refused",
          "ab-invalid" in (page.locator("input[data-t='rngLin'][data-r='0'][data-c='1']").get_attribute("class") or ""))
    page.screenshot(path=os.path.join(OUT, f"tolerance-range-{PART}.png"))
    page.locator("#ab-tol-delete").click()
    page.wait_for_timeout(500)
    check("delete removes it", TEST_SCHEME not in page.locator("#ab-tol-scheme option").all_inner_texts())

    print("4. ISO tabs")
    page.locator(".ab-tol-tab[data-tab='iso1']").click()
    page.wait_for_timeout(400)
    check("ISO 2768-1 shows class and unit", page.locator("#ab-tol-c1").is_visible()
          and page.locator("#ab-tol-unit").is_visible())
    page.locator("#ab-tol-unit").select_option("inch")
    page.wait_for_timeout(200)
    warn = page.locator("section[data-pane='iso1'] .ab-tol-unit-warn").inner_text()
    check("and warns that ISO 2768 is metric", "metric" in warn.lower(), warn.strip()[:80])
    page.locator("#ab-tol-c1").select_option("m")
    page.wait_for_timeout(200)
    n_m = page.locator("input[data-t='isoLin'][data-c='0']").count()
    page.locator("#ab-tol-c1").select_option("f")
    page.wait_for_timeout(200)
    n_f = page.locator("input[data-t='isoLin'][data-c='0']").count()
    check("the table is the standard's, per class (m 8 rows, f 7)", (n_m, n_f) == (8, 7), (n_m, n_f))
    page.locator("#ab-tol-c1").select_option("m")
    page.locator(".ab-tol-tab[data-tab='iso2']").click()
    page.wait_for_timeout(400)
    check("ISO 2768-2 shows its three tables", all(
        page.locator(f"input[data-t='{t}']").count() > 0 for t in ("isoSf", "isoPerp", "isoSym")))
    check("and runout", page.locator("#ab-tol-i-runout").input_value() == "0.2",
          page.locator("#ab-tol-i-runout").input_value())
    page.screenshot(path=os.path.join(OUT, f"tolerance-iso2-{PART}.png"))

    print("5. apply")
    page.locator(".ab-tol-tab[data-tab='custom']").click()
    page.locator("#ab-tol-scheme").select_option(schemes[0])
    page.wait_for_timeout(500)
    filled_before = rows_with_tolerance(page)
    applied = not page.locator("#ab-tol-apply").is_disabled()
    if applied:
        page.locator("#ab-tol-apply").click()
        page.wait_for_timeout(2500)
    check("the dialog closed after applying", not applied or page.locator(".ab-tol-modal").count() == 0)
    filled_after = rows_with_tolerance(page)
    print(f"        page 1 rows with a tolerance: {filled_before} -> {filled_after}")
    check("more balloons now carry a tolerance", not applied or filled_after > filled_before)

    print("6. per-balloon Tolerance from")
    labelled = page.locator(".ab-table tbody tr[data-id]:has(td[title*='from [Decimal]'])").first
    check("an applied row says where its tolerance came from", labelled.count() == 1)
    if labelled.count():
        labelled.click()
        page.wait_for_timeout(800)
        std = page.locator("#ab-tolstd")
        check("the panel shows the scheme", std.input_value().startswith("[Decimal]"), std.input_value())
        before_upper = page.locator("#ab-upper").input_value()
        std.select_option("ISO 2768-1 c")
        page.wait_for_timeout(800)
        after_upper = page.locator("#ab-upper").input_value()
        std_after = page.locator("#ab-tolstd").input_value()
        check("choosing ISO 2768-1 c recalculates it",
              std_after == "ISO 2768-1 c" and after_upper != "", f"{before_upper} -> {after_upper} ({std_after})")
        page.locator("#ab-upper").fill("+.001")
        page.locator("#ab-lower").fill("+.002")
        page.wait_for_timeout(300)
        check("upper below lower is flagged",
              "below" in page.locator("#ab-tol-status").inner_text())
        page.locator("#ab-lower").press("Tab")
        page.wait_for_timeout(400)
        check("typing by hand clears the label", page.locator("#ab-tolstd").input_value() == "",
              page.locator("#ab-tolstd").input_value())

    print("7. update applied")
    btn.click()
    page.wait_for_timeout(1000)
    up_text = page.locator("#ab-tol-preview").inner_text()
    check("the preview counts what Update would touch", "carry this label" in up_text,
          [l for l in up_text.splitlines() if "Update" in l][:1])
    if not page.locator("#ab-tol-update").is_disabled():
        page.locator("#ab-tol-update").click()
        page.wait_for_timeout(1500)
        check("Update applied commits and closes", page.locator(".ab-tol-modal").count() == 0)
    else:
        page.locator("#ab-modal-cancel").click()

    check("no page errors", not errors, errors[:2])
    page.screenshot(path=os.path.join(OUT, f"tolerance-applied-{PART}.png"))
    browser.close()

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
