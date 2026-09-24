r"""Are the ballooning settings reachable from the toolbar?

Ported from One Supply's arrangement: a separated settings group led by the
gear (its 第四组：设置), and a Settings dropdown standing in for the 功能 menu
that this widget has no menu bar to hold.

The specific regressions this guards:
  - the separator must NOT be back in the per-balloon panel. It is shop-wide,
    and a control you reach by first selecting one balloon reads as a property
    of that balloon.
  - a checkable item must WRITE, not just paint itself. That is the whole
    difference between a menu and a decoration.
  - an operator without Administration:General must not be handed controls the
    server will refuse.

    python .mssql-scripts/check_settings_menu_ui.py [part_id]
"""

import os
import subprocess
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


def sql(query):
    out = subprocess.run(
        ["sqlcmd", "-S", "deskdev,65001", "-U", "sa", "-P", "Tsh9989", "-C",
         "-W", "-h", "-1", "-s", "|", "-Q", f"USE RFQ; SET NOCOUNT ON; {query}"],
        capture_output=True, text=True, encoding="utf-8")
    return [l.strip() for l in (out.stdout or "").splitlines()
            if l.strip() and not l.startswith("Changed database")]


sql("UPDATE dbo.MasterSettings SET SubNumberSeparator='-', DatumAddMissing=1, "
    "DimensionFiltersJson=NULL;")

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

    print("0. nothing internal is shipped to the DOM")
    # Comments written inside a template literal end up as real comment nodes
    # in the page, where anyone who opens DevTools reads them. Design notes,
    # the names of other products, and the reasoning behind a layout are for
    # the source, not for the customer's browser. Written as ${/* ... */''}
    # instead, which the bundler drops entirely.
    comments = page.evaluate(
        """() => {
            const roots = ['.ab-app-container', '.cw-rail-balloon', '.ab-modal-overlay'];
            const found = [];
            for (const sel of roots) {
                for (const root of document.querySelectorAll(sel)) {
                    const w = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
                    while (w.nextNode()) found.push(w.currentNode.nodeValue.trim().slice(0, 90));
                }
            }
            return found;
        }""")
    check("no comment nodes in the ballooning UI", not comments,
          comments[:3] if comments else "")

    print("\n1. the settings group is in the toolbar")
    check("Default Tol is there", page.locator("#btn-tolerance").count() > 0)
    check("Settings is there", page.locator("#btn-settings").count() > 0)
    check("both carry the gear icon",
          page.locator("#btn-tolerance svg").count() > 0
          and page.locator("#btn-settings svg").count() > 0)
    # They must sit in their own group, after the actions - not mixed in.
    same_group = page.evaluate(
        """() => {
            const t = document.querySelector('#btn-tolerance');
            const s = document.querySelector('#btn-settings');
            const save = document.querySelector('#btn-save');
            const g = e => e && e.closest('.ab-toolbar-group');
            return {together: g(t) === g(s), apartFromSave: g(t) !== g(save)};
        }""")
    check("Default Tol and Settings share a group", same_group["together"])
    check("and it is not the group Save is in", same_group["apartFromSave"])
    check("the old bare Filter button is gone",
          page.locator("#btn-keywords").count() == 0)

    print("\n2. the menu opens and holds the 功能 items")
    check("the menu is closed to start", page.locator("#ab-settings-menu").count() == 0)
    page.locator("#btn-settings").click()
    page.wait_for_timeout(700)
    menu = page.locator("#ab-settings-menu")
    check("it opens", menu.count() > 0)
    for sel, label in [("#ab-m-datum-gen", "Generate datum annotations"),
                       ("#ab-m-eng", "Filter English noise"),
                       ("#ab-m-ref", "Filter reference dimensions"),
                       ("#ab-m-datum-filter", "Filter datum features"),
                       ("#ab-m-keywords", "Always-filter keywords"),
                       ("#ab-m-sep", "Interval number separator"),
                       ("#ab-m-datum", "Datum detection")]:
        check(f"{label}", page.locator(sel).count() > 0)
    check("the groups are separated", page.locator(".ab-menu-sep").count() >= 1)
    page.screenshot(path=os.path.join(OUT, "settings-menu.png"))

    print("\n2b. it does not distort the toolbar")
    # .ab-toolbar is height:64px with overflow-x:auto, so it is a scroll
    # container in BOTH axes. A menu rendered inside it was clipped to that
    # strip and put the toolbar on a vertical scrollbar - the menu could only
    # be read by scrolling the toolbar itself.
    geo = page.evaluate(
        """() => {
            const tb = document.querySelector('.ab-toolbar');
            const m  = document.querySelector('#ab-settings-menu');
            const mr = m.getBoundingClientRect();
            const tr = tb.getBoundingClientRect();
            return {
                toolbarH: Math.round(tr.height),
                toolbarScrollH: tb.scrollHeight,
                toolbarClientH: tb.clientHeight,
                menuInsideToolbar: tb.contains(m),
                menuPosition: getComputedStyle(m).position,
                menuBottom: Math.round(mr.bottom),
                menuTop: Math.round(mr.top),
                viewportH: window.innerHeight,
                // Is any part of the menu actually painted where it can be seen?
                visible: mr.width > 0 && mr.height > 0
                         && mr.top >= 0 && mr.bottom <= window.innerHeight,
            };
        }""")
    print(f"        {geo}")
    check("the menu is NOT inside the toolbar", not geo["menuInsideToolbar"])
    check("it is positioned fixed", geo["menuPosition"] == "fixed")
    # Compared open-vs-closed rather than against a fixed number: the strip's
    # height is a design choice that may change, but opening a menu must never
    # alter it.
    closed_h = page.evaluate(
        """() => Math.round(document.querySelector('.ab-toolbar')
                    .getBoundingClientRect().height)""")
    check("opening the menu does not grow the toolbar",
          geo["toolbarH"] == closed_h, f'open={geo["toolbarH"]} closed={closed_h}')
    # overflow-x:auto forces overflow-y to auto as well, so any content taller
    # than the 64px strip puts a vertical scrollbar on the toolbar. Measured
    # against the closed state so this cannot pass by the toolbar being broken
    # in both.
    closed_geo = page.evaluate(
        """() => {const tb=document.querySelector('.ab-toolbar');
                  return {s: tb.scrollHeight, c: tb.clientHeight,
                          oy: getComputedStyle(tb).overflowY};}""")
    check("the toolbar cannot scroll vertically",
          closed_geo["oy"] == "hidden" or closed_geo["s"] <= closed_geo["c"],
          closed_geo)
    check("and opening the menu does not change that",
          geo["toolbarScrollH"] == closed_geo["s"],
          f'open={geo["toolbarScrollH"]} closed={closed_geo["s"]}')
    check("the whole menu is on screen", geo["visible"], geo)

    print("\n2c. a short window flips it above the button instead of off-screen")
    page.set_viewport_size({"width": 1600, "height": 560})
    page.wait_for_timeout(600)
    if page.locator("#ab-settings-menu").count() == 0:
        page.locator("#btn-settings").click()   # resize dismisses; reopen
        page.wait_for_timeout(600)
    short = page.evaluate(
        """() => {const m=document.querySelector('#ab-settings-menu');
                  if(!m) return null; const r=m.getBoundingClientRect();
                  return {top: Math.round(r.top), bottom: Math.round(r.bottom),
                          vh: window.innerHeight};}""")
    print(f"        {short}")
    check("still fully on screen in a short window",
          short and short["top"] >= 0 and short["bottom"] <= short["vh"], short)
    page.screenshot(path=os.path.join(OUT, "settings-menu-short.png"))
    page.set_viewport_size({"width": 1600, "height": 950})
    page.wait_for_timeout(600)
    if page.locator("#ab-settings-menu").count() == 0:
        page.locator("#btn-settings").click()
        page.wait_for_timeout(600)

    print("\n3. clicking away dismisses it")
    # The balloon table is NOT inside the widget's own container - it renders
    # into the workspace rail, .cw-rail-balloon. A dismiss handler scoped to the
    # container never sees this click, and the menu hangs open over the list.
    page.locator(".ab-table tbody tr[data-id]").first.click()
    page.wait_for_timeout(900)
    check("a click on a balloon row closes the menu",
          page.locator("#ab-settings-menu").count() == 0)

    # And ticking a switch must NOT consume the dismiss handler.
    page.locator("#btn-settings").click()
    page.wait_for_timeout(600)
    page.locator("#ab-m-eng").check()
    page.wait_for_timeout(900)
    check("the menu stays open while ticking switches",
          page.locator("#ab-settings-menu").count() > 0)
    page.locator(".ab-table tbody tr[data-id]").nth(1).click()
    page.wait_for_timeout(900)
    check("and it still dismisses afterwards",
          page.locator("#ab-settings-menu").count() == 0)

    print("\n4. the separator is no longer in the per-balloon panel")
    page.wait_for_timeout(300)
    more = page.locator(".ab-props-more summary").first
    if more.count():
        more.click()
        page.wait_for_timeout(500)
    check("no separator control in the balloon panel",
          page.locator("#ab-sub-sep").count() == 0)
    check("but Sub-number is still there", page.locator("#ab-sub").count() > 0)

    print("\n5. a checkable item actually writes")
    page.locator("#btn-settings").click()
    page.wait_for_timeout(700)
    page.locator("#ab-m-ref").check()
    page.wait_for_timeout(2000)
    stored = sql("SELECT ISNULL(DimensionFiltersJson,'<null>') FROM dbo.MasterSettings;")
    print(f"        DimensionFiltersJson: {stored}")
    check("the filter reached the database",
          stored and '"reference":true' in stored[0].replace(" ", ""), stored)

    print("\n6. the separator dialog writes too")
    if page.locator("#ab-settings-menu").count() == 0:
        page.locator("#btn-settings").click()
        page.wait_for_timeout(700)
    page.locator("#ab-m-sep").click()
    page.wait_for_timeout(1000)
    check("the dialog opened", page.locator("#ab-sep-pick").count() > 0)
    # Free text, as in One Supply - not a fixed list. A mark outside the three
    # suggestions is the whole point, so that is what gets typed here.
    check("it is a text field, not a dropdown",
          page.evaluate("() => document.querySelector('#ab-sep-pick').tagName") == "INPUT")

    page.locator("#ab-sep-pick").fill("1")
    page.wait_for_timeout(400)
    check("a digit is refused before it can be saved",
          page.locator("#ab-modal-ok").is_disabled())
    page.locator("#ab-sep-pick").fill("_")
    page.wait_for_timeout(400)
    check("an underscore is refused too",
          page.locator("#ab-modal-ok").is_disabled())

    page.locator("#ab-sep-pick").fill("~")
    page.wait_for_timeout(400)
    check("a mark outside the suggestions is accepted",
          not page.locator("#ab-modal-ok").is_disabled())
    preview = page.locator("#ab-sep-preview").inner_text()
    print(f"        preview: {preview}")
    check("and it previews the result", "5~1" in preview, preview)

    page.locator("#ab-modal-ok").click()
    page.wait_for_timeout(2000)
    sep = sql("SELECT SubNumberSeparator FROM dbo.MasterSettings;")
    print(f"        SubNumberSeparator: {sep}")
    check("the separator reached the database", sep and sep[0] == "~", sep)

    print("\n7. the datum dialog")
    page.locator("#btn-settings").click()
    page.wait_for_timeout(700)
    page.locator("#ab-m-datum").click()
    page.wait_for_timeout(1000)
    check("it opened", page.locator("#ab-d-add").count() > 0)
    check("both remaining controls are on it",
          page.locator("#ab-d-add").count() > 0
          and page.locator("#ab-d-conf").count() > 0)
    # There must be no "use geometry" switch. The OpenCV pass runs in the
    # middleware on every upload regardless, so an off position would cost the
    # same and fall back to the weaker symbol test - worse for no saving.
    check("there is no switch offering to turn geometry off",
          page.locator("#ab-d-enabled").count() == 0)
    page.screenshot(path=os.path.join(OUT, "settings-datum-dialog.png"))
    # A value out of range must be refused, not written.
    page.locator("#ab-d-conf").fill("5")
    page.locator("#ab-modal-ok").click()
    page.wait_for_timeout(1200)
    check("a confidence of 5 is refused", page.locator("#ab-d-conf").count() > 0)
    page.locator("#ab-d-conf").fill("0.8")
    page.locator("#ab-modal-ok").click()
    page.wait_for_timeout(2000)
    conf = sql("SELECT DatumAddMinConfidence FROM dbo.MasterSettings;")
    print(f"        DatumAddMinConfidence: {conf}")
    check("a valid one is saved", conf and conf[0].startswith("."), conf)

    check("no page errors", not errors, errors[:3])
    browser.close()

sql("UPDATE dbo.MasterSettings SET SubNumberSeparator='-', DatumAddMissing=1, "
    "DatumAddMinConfidence=0, DimensionFiltersJson=NULL;")

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
