"""Verifies two balloon-widget changes:

1. Clicking a row in the balloon table brings that balloon into view when it is
   currently outside the viewport.
2. The Y14.5M face is loaded and applied to the symbol text.
"""
import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
failures = []


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + ((" -- " + detail) if detail else ""))
    if not ok:
        failures.append(label)


with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1700, "height": 1100})
    errors = []
    page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    page.on("response", lambda r: errors.append("HTTP %d %s" % (r.status, r.url))
            if r.status >= 400 else None)

    page.goto(BASE + "/Account/Login", wait_until="domcontentloaded")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/Account/Login" not in u, timeout=20000)

    page.goto(BASE + "/Costing/Workspace/5", wait_until="domcontentloaded")
    page.wait_for_selector(".cw-root", timeout=20000)
    page.wait_for_timeout(3000)
    page.locator(".cw-doc", has=page.locator(".cw-doc-type", has_text="2D")).first.click()
    page.wait_for_timeout(2000)
    page.locator('[data-mode="balloon"]').click()
    page.wait_for_timeout(6000)
    for _ in range(2):                      # page 3 holds 10 balloons
        page.locator("#btn-next-page").click()
        page.wait_for_timeout(2500)

    rows = page.locator(".ab-table tbody tr[data-id]")
    check("table lists balloons", rows.count() == 10, "%d row(s)" % rows.count())

    # ---- 2. font ----------------------------------------------------------
    loaded = page.evaluate("""async () => {
        await document.fonts.ready;
        return document.fonts.check("16px Y14_5M");
    }""")
    check("Y14_5M face loaded by the browser", loaded)

    applied = page.evaluate("""() => {
        const td = document.querySelector('td.ab-symbol');
        return td ? getComputedStyle(td).fontFamily : '(no symbol cell)';
    }""")
    check("symbol column uses Y14_5M", "Y14_5M" in applied, applied)

    editor_font = page.evaluate("""() => {
        const t = document.querySelector('#ab-content');
        return t ? getComputedStyle(t).fontFamily : '(no editor)';
    }""")

    # ---- 1. scroll into view ----------------------------------------------
    def transform():
        return page.evaluate(
            "() => getComputedStyle("
            "  document.querySelector('#ab-canvas-container')).transform")

    # Zoom in hard so most balloons fall outside the viewport.
    for _ in range(12):
        page.locator("#btn-zoom-in").click()
    page.wait_for_timeout(1500)

    def visibility_by_id():
        """{annotation id: is its centre inside the viewport}.

        Keyed by id, not index: overlay boxes follow annotation order while
        table rows are sorted by balloon number, so the two do not line up.
        """
        return page.evaluate("""() => {
            const vp = document.querySelector('#ab-viewport');
            const v = vp.getBoundingClientRect();
            const out = {};
            for (const el of document.querySelectorAll('#ab-overlays .ab-annotation-box')) {
                const b = el.getBoundingClientRect();
                const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
                out[el.getAttribute('data-id')] =
                    cx >= v.left && cx <= v.right && cy >= v.top && cy <= v.bottom;
            }
            return out;
        }""")

    before = transform()
    vis = visibility_by_id()
    offscreen = [k for k, on in vis.items() if not on]
    check("zooming pushed some balloons off-screen",
          len(offscreen) > 0, "%d of %d off-screen" % (len(offscreen), len(vis)))

    if offscreen:
        target = offscreen[0]
        page.locator('.ab-table tbody tr[data-id="%s"]' % target).click()
        page.wait_for_timeout(1500)
        after = transform()
        check("clicking the row panned the canvas", before != after,
              "%s -> %s" % (before[:34], after[:34]))
        check("the clicked balloon is now on screen",
              visibility_by_id().get(target) is True)

        # A balloon already visible should not move the view.
        visible = [k for k, on in visibility_by_id().items() if on and k != target]
        if visible:
            stable = transform()
            page.locator('.ab-table tbody tr[data-id="%s"]' % visible[0]).click()
            page.wait_for_timeout(1200)
            check("an already-visible balloon does not re-pan", transform() == stable)

    page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\balloon-ux.png")
    print("  screenshot: .mssql-scripts/balloon-ux.png")
    print("  editor font: %s" % editor_font)

    real = [e for e in errors if "favicon" not in e.lower() and "DashboardPage.css" not in e]
    check("no page errors", not real, "; ".join(real[:2]))
    b.close()

print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
