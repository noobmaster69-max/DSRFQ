"""What does the annotation list actually render?

    python .mssql-scripts/shot_annotation_list.py [part_id]
"""

import os
import sys

from playwright.sync_api import sync_playwright

PART = sys.argv[1] if len(sys.argv) > 1 else "12"
BASE = "http://localhost:5001"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1600, "height": 950})

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
    print("2D doc found    :", doc2d.count() > 0)
    if doc2d.count():
        doc2d.click()
        page.wait_for_timeout(3500)
    mode = page.locator(".cw-modes button:has-text('Balloon')").first
    if not mode.count():
        mode = page.locator(".cw-modes >> text=Balloon").first
    print("mode button     :", mode.count() > 0)
    if mode.count():
        mode.click()
    page.wait_for_timeout(6000)
    print("in balloon mode :", page.locator(".cw-root.is-balloon").count() > 0)

    print("tables on page  :", page.locator(".ab-table").count())
    print("header text     :", page.locator(".ab-table-header").all_inner_texts())
    print("column headers  :", page.locator(".ab-table thead th").all_inner_texts())
    first = page.locator(".ab-table tbody tr[data-id]").first
    if first.count():
        print("first row cells :", first.locator("td").all_inner_texts())
    # Rendered widths: a column squeezed to nothing looks like a missing column.
    print("header widths   :", page.evaluate("""() => Array.from(
        document.querySelectorAll('.ab-table thead th')).map(
            th => Math.round(th.getBoundingClientRect().width))"""))
    print("table width     :", page.evaluate(
        "() => Math.round(document.querySelector('.ab-table')"
        "?.getBoundingClientRect().width ?? -1)"))
    print("wrapper width   :", page.evaluate(
        "() => Math.round(document.querySelector('.ab-table-wrapper')"
        "?.getBoundingClientRect().width ?? -1)"))

    print("computed th     :", page.evaluate("""() => {
        const th = document.querySelectorAll('.ab-table thead th');
        if (!th.length) return 'none';
        const cs = getComputedStyle(th[2]);
        const t = getComputedStyle(th[2].closest('table'));
        return {tableLayout: t.tableLayout, width: cs.width, padding: cs.padding,
                display: cs.display, fontSize: cs.fontSize};
    }"""))
    print("rule present    :", page.evaluate("""() => {
        let hits = [];
        for (const sheet of document.styleSheets) {
            let rules; try { rules = sheet.cssRules } catch { continue }
            for (const r of rules) {
                if (r.selectorText && r.selectorText.includes('.ab-table')
                    && r.selectorText.includes('nth-child')) hits.push(r.cssText.slice(0, 90));
            }
        }
        return hits.slice(0, 4);
    }"""))

    # A row that actually carries a tolerance - the empty ones prove nothing.
    print("rows with a tol :", page.evaluate("""() => Array.from(
        document.querySelectorAll('.ab-table tbody tr[data-id]'))
        .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim()))
        .filter(c => c[2] || c[3]).slice(0, 5)"""))

    el = page.locator(".ab-table-wrapper").first
    if el.count():
        el.screenshot(path=os.path.join(OUT, f"annlist-{PART}.png"))
    rail = page.locator(".cw-rail").first
    if rail.count():
        rail.screenshot(path=os.path.join(OUT, f"annlist-rail-{PART}.png"))
    print("wrote           :", OUT)
    browser.close()
