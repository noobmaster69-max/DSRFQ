"""Change a balloon's number from the list or the property panel.

Runs against the live app and NEVER saves: every change is undone before the
page is left, so the part's real balloons are untouched.

  1. double-click a number in the list, type a new one, Enter
  2. Escape puts it back
  3. Ctrl+Z undoes a move in one step
  4. the property panel's Number field does the same move
  5. a sub-number cannot be moved on its own

    python check_move_number_ui.py            (part 41)
    set DSRFQ_PART=12 & python check_move_number_ui.py
"""
import os
import sys

from playwright.sync_api import sync_playwright

from _readonly_guard import make_read_only

BASE = os.environ.get("DSRFQ_BASE", "http://127.0.0.1:5001")
PART = int(os.environ.get("DSRFQ_PART", "41"))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)
fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


def goto(pg, url):
    for _ in range(3):
        try:
            pg.goto(url, wait_until="domcontentloaded")
            return
        except Exception:
            pg.wait_for_timeout(2000)


ROWS_JS = """() => [...document.querySelectorAll('tr[data-id]')].map(tr => ({
    id: tr.dataset.id,
    page: tr.dataset.page,
    no: (tr.querySelector('.ab-no-label')?.textContent || '').trim()
}))"""


def top_level(rows):
    """One entry per balloon that owns a number.

    A 4X balloon is listed as 18_1 .. 18_4; its first line IS the balloon, so
    18_1 counts as 18 and the rest are skipped. A child (5-1) has no number of
    its own and is skipped too.
    """
    out = []
    for r in rows:
        no = r["no"]
        if "_" in no:
            base, inst = no.split("_", 1)
            if inst != "1":
                continue
            no = base
        if not no.isdigit():
            continue
        out.append({**r, "no": no})
    return out


def order(pg):
    """Balloons as 'number:id', in list order."""
    return [f"{r['no']}:{r['id']}" for r in top_level(pg.evaluate(ROWS_JS))]


def numbers_by_page(pg):
    """The multiset of numbers on each page. A move reshuffles these; it must
    never add, drop or repeat one - which also holds for a drawing numbered
    per page, where page 2 starts again at 1."""
    pages = {}
    for r in top_level(pg.evaluate(ROWS_JS)):
        pages.setdefault(r["page"], []).append(int(r["no"]))
    return {k: sorted(v) for k, v in pages.items()}


def number_of(pg, bid):
    for r in top_level(pg.evaluate(ROWS_JS)):
        if r["id"] == bid:
            return r["no"]
    return None


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1700, "height": 1050})
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    # Read-only: balloon writes are blocked in the browser, "save first?" is
    # answered no, and leaving with unsaved edits discards them.
    blocked_writes = make_read_only(pg)

    goto(pg, f"{BASE}/Account/Login")
    if pg.get_by_placeholder("user name").count():
        pg.get_by_placeholder("user name").fill("admin")
        pg.get_by_placeholder("password").fill("serenity")
        pg.get_by_role("button", name="Sign In").click()
        pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(2000)
    goto(pg, f"{BASE}/Costing/Workspace/{PART}")
    pg.wait_for_timeout(6000)
    pg.locator("text=/\\.pdf/").first.click()
    pg.wait_for_timeout(4000)
    pg.get_by_text("Balloon", exact=True).last.click()
    pg.wait_for_selector("tr[data-id]", timeout=60000)
    pg.wait_for_timeout(3000)

    before = order(pg)
    before_nums = numbers_by_page(pg)
    check("the list has balloons to work with", len(before) >= 8, len(before))

    print("\n1. select a balloon, click its number, type a new one")
    moving = pg.locator("td.ab-no-editable").nth(5).get_attribute("data-num-edit")
    old_no = number_of(pg, moving)
    cell = lambda: pg.locator(f'td[data-num-edit="{moving}"]')
    cell().click()                     # selects - the row may move in the rail
    pg.wait_for_timeout(800)
    check("the first click only selects", pg.locator(".ab-no-input").count() == 0)
    cell().click()                     # the selected balloon's number: edit
    pg.wait_for_timeout(300)
    box = pg.locator(".ab-no-input")
    check("a box appears in the cell", box.count() == 1)
    check("holding the current number, ready to overwrite",
          box.count() == 1 and box.input_value() == old_no, box.input_value() if box.count() else "-")
    box.fill("3")
    box.press("Enter")
    pg.wait_for_timeout(1500)
    after = order(pg)
    check(f"balloon {old_no} is now 3", number_of(pg, moving) == "3", number_of(pg, moving))
    check("it moved up the list to third place", after[2].endswith(":" + moving), after[:6])
    check("the old 3, 4 and 5 moved along to 4, 5 and 6",
          [x.split(":")[1] for x in after[3:6]] == [x.split(":")[1] for x in before[2:5]],
          after[:7])
    check("everything after its old place is unchanged", after[6:] == before[6:])
    check("no number was added, dropped or repeated, on any page",
          numbers_by_page(pg) == before_nums)
    toast = pg.locator(".toast-message").all_inner_texts()
    check("a message says what happened",
          bool(toast) and "is now 3" in toast[-1] and "moved along" in toast[-1], toast[-1:] or "none")
    pg.screenshot(path=os.path.join(OUT, "move_number.png"))

    print("\n2. Escape puts it back (and double-click on a selected row also edits)")
    mid = order(pg)
    second = pg.locator("td.ab-no-editable").nth(1).get_attribute("data-num-edit")
    pg.locator(f'td[data-num-edit="{second}"]').click()
    pg.wait_for_timeout(800)
    pg.locator(f'td[data-num-edit="{second}"]').dblclick()
    pg.wait_for_timeout(300)
    check("double-clicking the selected row's number opens the box",
          pg.locator(".ab-no-input").count() == 1)
    pg.locator(".ab-no-input").fill("7")
    pg.locator(".ab-no-input").press("Escape")
    pg.wait_for_timeout(700)
    check("nothing changed", order(pg) == mid)
    check("and the box is gone", pg.locator(".ab-no-input").count() == 0)

    print("\n3. Ctrl+Z undoes the move in one step")
    pg.locator("body").click(position={"x": 5, "y": 5})
    pg.keyboard.press("Control+z")
    pg.wait_for_timeout(1500)
    check("the list is back as it was", order(pg) == before, order(pg)[:6])

    print("\n4. the property panel's Number field")
    first = pg.locator("tr[data-id]").nth(6)
    pid = first.get_attribute("data-id")
    first.click()
    pg.wait_for_timeout(800)
    summary = pg.locator("summary", has_text="Numbering")
    if summary.count() and not pg.locator("#ab-num").is_visible():
        summary.first.click()
        pg.wait_for_timeout(300)
    field = pg.locator("#ab-num")
    check("the field is there", field.count() == 1)
    field.fill("2")
    field.press("Tab")
    pg.wait_for_timeout(1500)
    check("the balloon moved to 2", number_of(pg, pid) == "2", number_of(pg, pid))
    check("still no number added, dropped or repeated", numbers_by_page(pg) == before_nums)
    pg.locator("body").click(position={"x": 5, "y": 5})
    pg.keyboard.press("Control+z")
    pg.wait_for_timeout(1500)
    check("undone", order(pg) == before)

    print("\n5. only a line that owns a number is offered")
    rows = pg.evaluate("""() => [...document.querySelectorAll('tr[data-id]')].map(tr => [
        (tr.querySelector('.ab-no-label')?.textContent || '').trim(),
        !!tr.querySelector('.ab-no-editable')])""")
    later_instances = [r for r in rows if "_" in r[0] and not r[0].endswith("_1")]
    first_instances = [r for r in rows if r[0].endswith("_1")]
    children = [r for r in rows if "-" in r[0]]
    if later_instances:
        check("the 2nd, 3rd... line of a 4X balloon is not editable",
              not any(e for _, e in later_instances), later_instances[:3])
    if first_instances:
        check("its first line - the balloon itself - is", all(e for _, e in first_instances),
              first_instances[:3])
    if children:
        check("a sub-number is not editable on its own", not any(e for _, e in children), children[:3])
    else:
        print("  info  this drawing has no sub-numbers; that rule is in the unit test")

    check("no script errors on the page", not errors, errors[:2])
    check("and nothing tried to save a balloon", not blocked_writes, blocked_writes[:3])
    b.close()

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}  (nothing was saved)")
sys.exit(1 if fails else 0)
