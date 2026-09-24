"""Do the saved balloons actually render in the workspace's Balloon mode?"""
import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
PART = 5
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

    page.goto("%s/Costing/Workspace/%d" % (BASE, PART), wait_until="domcontentloaded")
    page.wait_for_selector(".cw-root", timeout=20000)
    page.wait_for_timeout(3000)

    # Balloon mode only exists for the 2D document.
    pdf_row = page.locator(".cw-doc", has=page.locator(".cw-doc-type", has_text="2D")).first
    pdf_row.click()
    page.wait_for_timeout(2500)

    balloon_btn = page.locator('[data-mode="balloon"]')
    check("Balloon mode available", balloon_btn.count() == 1)
    balloon_btn.click()
    page.wait_for_timeout(6000)

    check("balloon stage visible",
          page.locator(".cw-stage-balloon").is_visible())

    # The status chip should now read Completed.
    header = page.locator(".cw-header").inner_text()
    check("Balloon status shows Completed",
          "Balloon" in header and "Completed" in header, header.replace("\n", " ")[:110])

    # Balloons live in the widget's overlay layer.
    check("balloon overlay layer present", page.locator("#ab-overlays").count() == 1)

    # The tray should list them in balloon mode.
    tray = page.locator(".cw-tray").inner_text()
    check("tray shows balloon panel", len(tray.strip()) > 0, tray.replace("\n", " ")[:90])

    # Page 1 has none; the balloons are on pages 3, 4 and 6. Navigating to
    # page 3 is what actually proves rendering works.
    check("page 1 correctly reports none", "page 1 (0)" in tray.lower())

    # The widget paginates with its own control; page 3 is where the 10 are.
    for _ in range(2):
        page.locator("#btn-next-page").click()
        page.wait_for_timeout(2500)

    src = page.evaluate(
        "() => (document.querySelector('#ab-image')||{}).getAttribute?.('src') || ''")
    check("viewer moved to page 3", "Page_3" in src, src)

    # Count the balloon elements, not every overlay child: each balloon also
    # contributes an svg leader line, plus one base svg layer.
    markers = page.locator("#ab-overlays .ab-annotation-box").count()
    check("page 3 renders its 10 balloons", markers == 10, "%s balloon element(s)" % markers)

    tray3 = page.locator(".cw-tray").inner_text()
    print("     tray now: %s" % tray3.replace("\n", " ")[:110])
    check("tray lists page 3's balloons", "(10)" in tray3, tray3.replace("\n", " ")[:80])

    page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\workspace-balloons.png")
    print("  screenshot: .mssql-scripts/workspace-balloons.png")

    real = [e for e in errors if "favicon" not in e.lower() and "DashboardPage.css" not in e]
    check("no page errors", not real, "; ".join(real[:2]))
    b.close()

print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
