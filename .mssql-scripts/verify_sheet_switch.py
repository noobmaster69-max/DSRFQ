"""Verifies the Original / Converted sheet switch in the costing workspace.

Part 5 has both variants after the conversion run, so switching must actually
change the images shown -- not merely toggle a highlight.
"""
import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
PART = 5
failures = []


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + ((" -- " + detail) if detail else ""))
    if not ok:
        failures.append(label)


def shown_sources(page):
    """src of every page image the 2D viewer currently has."""
    return page.eval_on_selector_all(
        ".cw-stage-2d img", "els => els.map(e => e.getAttribute('src'))")


with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1700, "height": 1050})
    errors = []
    page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    # The console only says "404"; the response event names the URL, which is
    # what distinguishes a real regression from a known unrelated miss.
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

    # The workspace opens on the 3D model, which has no converted variant, so
    # the switch is correctly absent until a 2D document is selected.
    check("switch hidden while a 3D document is selected",
          page.locator(".cw-sheet-group").count() == 0)

    pdf_row = page.locator(".cw-doc", has=page.locator(".cw-doc-type", has_text="2D")).first
    pdf_row.click()
    page.wait_for_timeout(3500)

    check("sheet switch rendered", page.locator(".cw-sheet-group").count() == 1)
    check("Original button", page.locator('[data-sheet="original"]').count() == 1)
    check("Converted button", page.locator('[data-sheet="converted"]').count() == 1)
    check("download link present", page.locator(".cw-sheet-dl").count() == 1)

    check("Original active by default",
          "is-active" in (page.locator('[data-sheet="original"]').get_attribute("class") or ""))

    original = shown_sources(page)
    check("original pages loaded", len(original) > 0, "%d page(s)" % len(original))

    # Switch to converted and confirm the images genuinely change.
    page.click('[data-sheet="converted"]')
    page.wait_for_timeout(3000)

    check("Converted becomes active",
          "is-active" in (page.locator('[data-sheet="converted"]').get_attribute("class") or ""))

    converted = shown_sources(page)
    check("converted pages loaded", len(converted) > 0, "%d page(s)" % len(converted))
    check("images actually changed", converted != original,
          "orig[0]=%s conv[0]=%s" % (original[:1], converted[:1]))
    check("converted srcs point at ConvertedDrawing",
          all("ConvertedDrawing" in (s or "") for s in converted),
          str(converted[:1]))
    check("images render (non-zero natural width)",
          page.eval_on_selector_all(
              ".cw-stage-2d img",
              "els => els.every(e => !e.complete || e.naturalWidth > 0)"))

    href = page.locator(".cw-sheet-dl").get_attribute("href")
    check("download link points at the converted PDF",
          bool(href) and href.endswith(".pdf") and "ConvertedDrawing" in href, str(href))

    # Switching back must restore the original set.
    page.click('[data-sheet="original"]')
    page.wait_for_timeout(3000)
    check("switching back restores the original", shown_sources(page) == original)

    page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\workspace-sheet.png")
    print("  screenshot: .mssql-scripts/workspace-sheet.png")

    # DashboardPage.css 404s on every page of this app and predates this work.
    real = [e for e in errors
            if "favicon" not in e.lower() and "DashboardPage.css" not in e]
    check("no page errors", not real, "; ".join(real[:3]))
    if errors:
        print("     (all 4xx/5xx seen: %s)" % "; ".join(sorted(set(errors))[:4]))
    b.close()

print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
