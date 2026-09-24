"""The balloon list keeps its scroll position when it re-renders.

It jumped back to the top on every re-render where the selection did not change:
the audit tick, the same row clicked again, a field edited in the property panel,
ctrl-click. Each case below scrolls well down first, does the thing, and checks
the list is still there. Read-only: writes are blocked and nothing is saved.

    python check_list_scroll.py            (part 12)
"""
import os
import sys

from playwright.sync_api import sync_playwright

from _readonly_guard import make_read_only

BASE = os.environ.get("DSRFQ_BASE", "http://127.0.0.1:5001")
PART = int(os.environ.get("DSRFQ_PART", "12"))
fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1600, "height": 900})
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)[:160]))
    blocked = make_read_only(pg)
    for _ in range(3):
        try:
            pg.goto(f"{BASE}/Account/Login", wait_until="domcontentloaded")
            break
        except Exception:
            pg.wait_for_timeout(2000)
    pg.get_by_placeholder("user name").fill("admin")
    pg.get_by_placeholder("password").fill("serenity")
    pg.get_by_role("button", name="Sign In").click()
    pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(1500)
    pg.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="domcontentloaded")
    pg.wait_for_selector(".cw-traytab", timeout=60000)
    pg.wait_for_timeout(3000)
    pg.locator("text=/\\.pdf/").first.click()
    pg.wait_for_timeout(3000)
    pg.get_by_text("Balloon", exact=True).last.click()
    pg.wait_for_selector("tr[data-id]", timeout=60000)
    pg.wait_for_timeout(2500)

    top = lambda: pg.evaluate("document.querySelector('.ab-table-wrapper').scrollTop")

    def scroll_down(to=2500):
        pg.evaluate(f"document.querySelector('.ab-table-wrapper').scrollTop = {to}")
        pg.wait_for_timeout(300)
        return top()

    def row_in_view():
        """A row comfortably inside the list's visible area."""
        return pg.evaluate("""() => { const w = document.querySelector('.ab-table-wrapper').getBoundingClientRect();
            return [...document.querySelectorAll('tr[data-id]')].find(tr => { const r = tr.getBoundingClientRect();
                return r.top > w.top + 80 && r.bottom < w.bottom - 40; })?.dataset.id; }""")

    def stays(label, action, tol=150):
        before = scroll_down()
        action()
        pg.wait_for_timeout(900)
        after = top()
        check(f"{label}: the list stays where it was", after > 0 and abs(after - before) <= tol,
              f"{before} -> {after}")

    print(f"part {PART}")
    # The row is picked AFTER scrolling down (inside each action): a row picked
    # first would be off-screen by the time it is clicked, and Playwright would
    # scroll it back into view itself - measuring the test, not the app.
    last = {}

    def click_row():
        last["id"] = row_in_view()
        pg.locator(f'tr[data-id="{last["id"]}"] td.ab-c-sym').click()
    stays("clicking a row", click_row)

    def click_same_row():
        # Scrolled back to where it was, the same row is in view again.
        pg.locator(f'tr[data-id="{last["id"]}"] td.ab-c-sym').click()
    stays("clicking the same row again", click_same_row)

    def toggle_audit():
        r = row_in_view()
        pg.locator(f'[data-audit="{r}"]').click()
    stays("ticking audit", toggle_audit)

    def ctrl_click():
        r = row_in_view()
        pg.locator(f'tr[data-id="{r}"] td.ab-c-sym').click(modifiers=["Control"])
    stays("ctrl-clicking a second row", ctrl_click)

    # Select one row, then edit it in the property panel.
    def edit_panel():
        r = row_in_view()
        pg.locator(f'tr[data-id="{r}"] td.ab-c-sym').click()
        pg.wait_for_timeout(600)
        before = top()
        field = pg.locator("#ab-sym, textarea.ab-input, .ab-props textarea").first
        field.click()
        field.press("End")
        field.type(" ")
        field.press("Tab")
        pg.wait_for_timeout(900)
        after = top()
        check("editing the selected balloon in the property panel: the list stays",
              after > 0 and abs(after - before) <= 150, f"{before} -> {after}")
    scroll_down()
    edit_panel()

    check("no script errors", not errors, errors[:2])
    check("and nothing was saved", not blocked, blocked[:3])
    b.close()

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
