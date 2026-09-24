"""Balloon mode's Check sheet: SMARTQC's check item grid over the balloons.

Read-only - the page is made unable to save.

  0. it is NOT in the costing tray (that is Costing / BOM / Special process)
  1. Balloon mode has a Check sheet button; it opens over the page with one
     line per balloon and SMARTQC's columns in order
  2. symbols use the Y14.5M GD&T face, bold 17px, as SMARTQC's .y145m does
  3. Target / LSL / USL are consistent
  4. LSL/USL are in view, headers stay pinned, a line jumps to its balloon,
     Esc closes

    python check_checksheet_tab.py            (part 12)
    set DSRFQ_PART=41 & python check_checksheet_tab.py
"""
import os
import sys

from playwright.sync_api import sync_playwright

from _readonly_guard import make_read_only

BASE = os.environ.get("DSRFQ_BASE", "http://127.0.0.1:5001")
PART = int(os.environ.get("DSRFQ_PART", "12"))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
fails = 0

SMARTQC_ORDER = ["SEQ", "CHECK ITEM NAME", "SYMBOL", "MULT", "NOTE", "METHOD", "UNIT",
                 "TARGET", "+TOL", "-TOL", "LSL", "USL"]


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


def num(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1700, "height": 1050})
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
    pg.wait_for_timeout(2000)
    pg.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="domcontentloaded")
    pg.wait_for_selector(".cw-traytab", timeout=60000)
    pg.wait_for_timeout(3000)

    print(f"0. the costing tray (part {PART})")
    tabs = [t.split()[0] for t in pg.locator(".cw-traytab").all_inner_texts()]
    check("back to Costing / BOM / Special process only", len(tabs) == 3 and "Check" not in tabs, tabs)

    print("\n1. Balloon mode")
    pg.locator("text=/\\.pdf/").first.click()
    pg.wait_for_timeout(3000)
    pg.get_by_text("Balloon", exact=True).last.click()
    pg.wait_for_selector(".ab-annotation-box", timeout=60000)
    pg.wait_for_timeout(2500)
    btn = pg.locator("#btn-checksheet")
    check("a Check sheet button in the ballooning toolbar", btn.count() == 1 and btn.is_enabled())
    balloons = pg.evaluate("() => document.querySelectorAll('tr[data-id]').length")
    btn.click()
    pg.wait_for_selector(".ab-cs-table tbody tr", timeout=15000)
    pg.wait_for_timeout(800)
    rows = pg.locator(".ab-cs-table tbody tr").count()
    check("it opens over the page", pg.locator(".ab-cs-overlay").count() == 1)
    check("one line per balloon in the list", rows > 0 and rows <= balloons, f"{rows} lines, list has {balloons} rows")
    heads = [h.strip().upper() for h in pg.locator(".ab-cs-table thead th").all_inner_texts()]
    check("SMARTQC's columns, in SMARTQC's order",
          [h for h in heads if h != "PG"] == SMARTQC_ORDER, heads)

    print("\n2. the symbol")
    sym = pg.locator(".ab-cs-symbol").first
    fam = sym.evaluate("e => getComputedStyle(e).fontFamily")
    check("in the Y14.5M GD&T face", fam.startswith("Y14_5M"), fam)
    check("at SMARTQC's size and weight",
          sym.evaluate("e => getComputedStyle(e).fontSize") == "17px"
          and sym.evaluate("e => getComputedStyle(e).fontWeight") in ("700", "bold"))
    check("and the face actually loaded", pg.evaluate("document.fonts.check('17px Y14_5M')"))
    check("line breaks in a symbol are kept, as SMARTQC's textarea does",
          sym.evaluate("e => getComputedStyle(e).whiteSpace") == "pre")

    print("\n3. the numbers")
    data = pg.evaluate("""() => [...document.querySelectorAll('.ab-cs-table tbody tr')]
        .map(tr => [...tr.children].map(td => td.textContent.trim()))""")
    i = {h: n for n, h in enumerate(heads)}
    with_limits = [r for r in data if r[i["LSL"]] and r[i["USL"]]]
    check("some lines have both limits", len(with_limits) > 0, len(with_limits))
    check("LSL is never above USL",
          all(num(r[i["LSL"]]) <= num(r[i["USL"]]) for r in with_limits))
    check("Target sits between them",
          all(num(r[i["LSL"]]) <= num(r[i["TARGET"]]) <= num(r[i["USL"]])
              for r in with_limits if num(r[i["TARGET"]]) is not None))
    check("no floating-point noise such as 2.1750000000000003",
          all(len(r[i[k]].split(".")[-1]) <= 6 for r in data for k in ("TARGET", "LSL", "USL") if r[i[k]]))
    notes = [r for r in data if r[i["NOTE"]] == "Note"]
    check("notes carry no limits - they are not measured",
          all(not r[i["LSL"]] and not r[i["USL"]] for r in notes), len(notes))

    print("\n4. using it")
    panel = pg.locator(".ab-cs-panel").bounding_box()
    check("the sheet sits in the window, not off-screen",
          panel is not None and panel["y"] >= 0 and panel["x"] >= 0
          and panel["y"] + panel["height"] <= 1050 + 1, panel)
    usl = pg.locator(".ab-cs-table thead th").nth(len(heads) - 1).bounding_box()
    check("LSL / USL are in view without scrolling sideways",
          usl is not None and usl["x"] + usl["width"] <= 1700, usl)
    pg.evaluate("() => { document.querySelector('.ab-cs-body').scrollTop = 1500; }")
    pg.wait_for_timeout(300)
    head_top = pg.locator(".ab-cs-table thead th").first.bounding_box()["y"]
    body_top = pg.locator(".ab-cs-body").bounding_box()["y"]
    check("the column headers stay pinned while scrolling", abs(head_top - body_top) < 8,
          f"header at {round(head_top)}, list top at {round(body_top)}")
    pg.evaluate("() => { document.querySelector('.ab-cs-body').scrollTop = 0; }")
    pg.screenshot(path=os.path.join(OUT, "checksheet_balloon.png"))

    target = pg.locator(".ab-cs-table tbody tr").nth(5)
    tid = target.get_attribute("data-cs-id")
    target.click()
    pg.wait_for_timeout(800)
    check("clicking a line closes the sheet", pg.locator(".ab-cs-overlay").count() == 0)
    check("and selects that balloon", pg.locator(f'tr[data-id="{tid}"].selected').count() == 1)

    # A balloon is selected now. With the sheet open, the editor's Delete key
    # must not reach it - the sheet lives outside the editor.
    boxes = pg.locator(".ab-annotation-box").count()
    pg.locator("#btn-checksheet").click()
    pg.wait_for_selector(".ab-cs-overlay", timeout=10000)
    pg.keyboard.press("Delete")
    pg.wait_for_timeout(400)
    check("Delete does nothing to the drawing while the sheet is open",
          pg.locator(".ab-annotation-box").count() == boxes, f"{boxes} -> {pg.locator('.ab-annotation-box').count()}")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(400)
    check("Esc closes it", pg.locator(".ab-cs-overlay").count() == 0)
    check("and the editor's shortcuts work again (its pause marker is gone)",
          pg.locator(".ab-cs-marker").count() == 0)

    check("no script errors", not errors, errors[:2])
    check("and nothing tried to write", not blocked, blocked[:3])
    b.close()

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
