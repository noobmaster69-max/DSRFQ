"""The first six gaps against One Supply, end to end in the browser.

  1. undo / redo            2. unsaved-work protection
  3. delete all selected, closing the number gap
  4. renumber continues across pages
  5. the list covers every page, with a page column; a row jumps to its page
  6. each row shows its dimension cut from the drawing

Nothing is saved: every edit stays in the page and is thrown away at the end.

    python .mssql-scripts/check_balloon_editing_ui.py [part_id]
"""

import os
import re
import sys

from playwright.sync_api import sync_playwright

PART = sys.argv[1] if len(sys.argv) > 1 else "12"
BASE = os.environ.get("DSRFQ_BASE", "http://localhost:5001")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)
fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + str(detail) if detail != '' else ''}")
    if not ok:
        fails.append(name)


ROWS = ".cw-rail-balloon .ab-table tbody tr[data-id]"


def labels(page):
    return page.eval_on_selector_all(ROWS, "rs => rs.map(r => r.querySelector('.ab-no-label').innerText.trim())")


def top_numbers(page):
    """(page, number) for every top-level balloon line - no instance or child suffix."""
    return page.eval_on_selector_all(ROWS, """rs => rs.map(r => [r.dataset.page,
        r.querySelector('.ab-no-label').innerText.trim()]).filter(([p, l]) => /^\\d+(_1)?$/.test(l))
        .map(([p, l]) => [Number(p), parseInt(l, 10)])""")


def page_label(page):
    box = page.locator("#btn-goto-page")
    if not box.count():
        return None
    return (int(box.input_value()), int(box.get_attribute("max")))


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1600, "height": 950})
    page = ctx.new_page()
    errors, dialogs = [], []
    page.on("pageerror", lambda e: errors.append(str(e)))

    def on_dialog(d):
        dialogs.append(d.message)
        # Accept the ordinary confirms; the unsaved-changes one is dismissed so
        # the test can see that staying put works.
        if "unsaved balloon changes" in d.message:
            d.dismiss()
        else:
            d.accept()
    page.on("dialog", on_dialog)

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.wait_for_timeout(1500)
    if page.get_by_placeholder("user name").count():
        page.get_by_placeholder("user name").fill("admin")
        page.get_by_placeholder("password").fill("serenity")
        page.get_by_role("button", name="Sign In").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)

    page.evaluate("""() => { localStorage.removeItem('dsrfq.ballooning.listAllPages');
                             localStorage.removeItem('dsrfq.ballooning.listImages');
                             localStorage.removeItem('dsrfq.workspace.balloonRailWidth'); }""")
    page.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="networkidle")
    page.wait_for_timeout(3000)
    doc2d = page.locator(".cw-rail-docs >> text=2D").first
    if doc2d.count():
        doc2d.click()
        page.wait_for_timeout(3500)
    page.locator(".cw-modes button:has-text('Balloon')").first.click()
    page.wait_for_timeout(7000)

    # ── 5. every page in the list ──────────────────────────────────────
    print("5. the list covers every page")
    scope = page.locator(".cw-rail-balloon .ab-table-scope")
    opts = scope.locator("option").all_inner_texts()
    check("a page picker with counts, All pages first", opts and opts[0].startswith("All pages"), opts[:3])
    pages_listed = set(page.eval_on_selector_all(ROWS, "rs => rs.map(r => r.dataset.page)"))
    check("rows from several pages are listed", len(pages_listed) > 1, sorted(pages_listed))
    check("with a page column", page.locator(".cw-rail-balloon th.ab-c-page").count() == 1)
    n_all = page.locator(ROWS).count()

    other = page.locator(f"{ROWS}[data-page='1']").first
    if other.count():
        other.click()
        page.wait_for_timeout(1500)
        check("clicking a page-2 row goes to page 2", page_label(page) and page_label(page)[0] == 2, page_label(page))
        check("and selects it", "selected" in (other.get_attribute("class") or ""))
    scope.select_option("0")
    page.wait_for_timeout(1500)
    check("choosing Page 1 lists only page 1",
          set(page.eval_on_selector_all(ROWS, "rs => rs.map(r => r.dataset.page)")) == {"0"})
    check("and shows page 1", page_label(page) and page_label(page)[0] == 1, page_label(page))
    page.locator(".cw-rail-balloon .ab-table-scope").select_option("all")
    page.wait_for_timeout(800)
    check("back to all pages", page.locator(ROWS).count() == n_all, page.locator(ROWS).count())

    # ── 6. crops ───────────────────────────────────────────────────────
    print("6. each row shows its dimension")
    crops = page.locator(".cw-rail-balloon .ab-crop")
    check("rows carry a crop of the drawing", crops.count() > 0, crops.count())
    bg = crops.first.evaluate("e => getComputedStyle(e).backgroundImage")
    check("cut from the page image", "upload" in bg, bg[:80])
    page.wait_for_timeout(1500)   # page sizes arrive, crops re-cut
    page.screenshot(path=os.path.join(OUT, f"balloon-list-crops-{PART}.png"))
    page.locator(".cw-rail-balloon .ab-table-images").uncheck()
    page.wait_for_timeout(500)
    check("Images off removes them", page.locator(".cw-rail-balloon .ab-crop").count() == 0)
    check("and the tolerance columns come back", page.locator(".cw-rail-balloon th.ab-c-up").is_visible())
    page.locator(".cw-rail-balloon .ab-table-images").check()
    page.wait_for_timeout(500)

    # ── 4. renumber across pages ───────────────────────────────────────
    print("4. renumber continues across pages")
    before_labels = labels(page)
    before = top_numbers(page)
    dupes_before = len(before) - len({n for _, n in before})
    page.locator("#btn-renumber").click()
    page.wait_for_timeout(1500)
    after = top_numbers(page)
    nums = sorted(n for _, n in after)
    check("no number is used twice", len(nums) == len(set(nums)), f"{dupes_before} duplicates before")
    check("numbers run 1..N without gaps", nums == list(range(1, len(nums) + 1)), f"1..{nums[-1] if nums else 0}")
    by_page = {}
    for pg, n in after:
        by_page.setdefault(pg, []).append(n)
    ordered_pages = sorted(by_page)
    check("each page carries on from the one before",
          all(max(by_page[a]) < min(by_page[b]) for a, b in zip(ordered_pages, ordered_pages[1:])),
          {pg: (min(v), max(v)) for pg, v in by_page.items()})

    # ── 1. undo / redo ─────────────────────────────────────────────────
    print("1. undo / redo")
    check("Undo is enabled after an edit", page.locator("#btn-undo").is_enabled())
    page.locator("#btn-undo").click()
    page.wait_for_timeout(1200)
    check("Undo puts the old numbers back", labels(page) == before_labels)
    check("Redo is enabled", page.locator("#btn-redo").is_enabled())
    page.locator("body").press("Control+y")
    page.wait_for_timeout(1200)
    check("Ctrl+Y redoes it", top_numbers(page) == after)

    # ── 3. delete ──────────────────────────────────────────────────────
    print("3. delete closes the gap")
    tops = [r for r in page.eval_on_selector_all(ROWS, """rs => rs.map(r => [r.dataset.id,
        r.querySelector('.ab-no-label').innerText.trim()])""") if re.fullmatch(r"\d+(_1)?", r[1])]
    victim = tops[2][0]
    count_before = len(top_numbers(page))
    page.locator(f"{ROWS}[data-id='{victim}']").first.click()
    page.wait_for_timeout(800)
    page.locator(".ab-viewport").hover()
    page.keyboard.press("Delete")
    page.wait_for_timeout(1200)
    nums = sorted(n for _, n in top_numbers(page))
    check("Delete removes the balloon", len(nums) == count_before - 1, f"{count_before} -> {len(nums)}")
    check("and the numbers close up", nums == list(range(1, len(nums) + 1)), f"1..{nums[-1]}")

    a, c = tops[5][0], tops[7][0]
    page.locator(f"{ROWS}[data-id='{a}']").first.click()
    page.locator(f"{ROWS}[data-id='{c}']").first.click(modifiers=["Control"])
    page.wait_for_timeout(600)
    page.keyboard.press("Delete")
    page.wait_for_timeout(1200)
    nums = sorted(n for _, n in top_numbers(page))
    check("Delete removes EVERY selected balloon", len(nums) == count_before - 3, f"-> {len(nums)}")
    check("still with no gaps", nums == list(range(1, len(nums) + 1)))
    page.keyboard.press("Control+z")
    page.wait_for_timeout(800)
    page.keyboard.press("Control+z")
    page.wait_for_timeout(1200)
    check("two undos bring both deletes back", len(top_numbers(page)) == count_before, len(top_numbers(page)))

    # ── clear: this page or every page ─────────────────────────────────
    print("clear scope")
    total = page.locator(ROWS).count()
    on_page = lambda n: page.locator(f"{ROWS}[data-page='{n}']").count()
    first_page = on_page(0)
    page.locator(".cw-rail-balloon .ab-table-scope").select_option("0")
    page.wait_for_timeout(1200)
    page.locator(".cw-rail-balloon .ab-table-scope").select_option("all")
    page.wait_for_timeout(800)
    n_dialogs = len(dialogs)
    page.locator("#btn-clear").click()
    page.wait_for_timeout(800)
    modal = page.locator(".ab-modal:has-text('Clear balloons')")
    check("a multi-page drawing asks which pages", modal.count() == 1 and len(dialogs) == n_dialogs)
    check("with this page chosen by default", modal.locator("input[value='page']").is_checked())
    modal.locator("#ab-clr-cancel").click()
    page.wait_for_timeout(600)
    check("Cancel clears nothing", page.locator(ROWS).count() == total)

    page.locator("#btn-clear").click()
    page.wait_for_timeout(600)
    page.locator("#ab-clr-ok").click()
    page.wait_for_timeout(1200)
    check("This page removes only page 1's balloons",
          on_page(0) == 0 and page.locator(ROWS).count() == total - first_page, f"{total} -> {page.locator(ROWS).count()}")
    page.keyboard.press("Control+z")
    page.wait_for_timeout(1200)
    check("undo brings them back", page.locator(ROWS).count() == total)

    page.locator("#btn-clear").click()
    page.wait_for_timeout(600)
    page.locator(".ab-modal input[value='all']").check()
    page.locator("#ab-clr-ok").click()
    page.wait_for_timeout(1200)
    check("Every page removes them all", page.locator(ROWS).count() == 0)
    page.keyboard.press("Control+z")
    page.wait_for_timeout(1500)
    check("and undo brings every page back", page.locator(ROWS).count() == total, page.locator(ROWS).count())

    # ── 2. unsaved work ────────────────────────────────────────────────
    print("2. unsaved work is protected")
    prevented = page.evaluate("""() => { const e = new Event('beforeunload', {cancelable: true});
        window.dispatchEvent(e); return e.defaultPrevented; }""")
    check("leaving the page with edits is stopped", prevented is True)
    doc3d = page.locator(".cw-rail-docs >> text=3D").first
    if doc3d.count():
        n_dialogs = len(dialogs)
        doc3d.click()
        page.wait_for_timeout(1500)
        asked = [m for m in dialogs[n_dialogs:] if "unsaved balloon changes" in m]
        check("switching document asks first", bool(asked), dialogs[n_dialogs:])
        check("and Cancel stays in ballooning", page.locator(".cw-root.is-balloon").count() == 1)

    page.screenshot(path=os.path.join(OUT, f"balloon-editing-{PART}.png"))
    check("no page errors", not errors, errors[:2])
    # Drop the edits so closing does not trip the guard we just tested.
    page.evaluate("() => window.onbeforeunload = null")
    ctx.close()
    browser.close()

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
