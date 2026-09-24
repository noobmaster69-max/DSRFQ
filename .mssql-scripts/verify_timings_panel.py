"""Verifies the processing-steps panel in the costing workspace."""
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
    page.wait_for_selector(".cw-timings", timeout=20000)
    page.wait_for_timeout(3500)

    rows = page.locator(".cw-timing-row")
    check("steps rendered", rows.count() >= 4, "%d step(s)" % rows.count())

    text = page.locator(".cw-timings").inner_text()

    # A part accumulates runs of different kinds; both must stay visible rather
    # than the newer one hiding the older.
    heads = page.locator(".cw-timing-head").all_inner_texts()
    check("both run kinds shown", len(heads) >= 2, str([h.split("\n")[0] for h in heads]))
    # The headings are text-transform: uppercase, so inner_text() returns them
    # uppercased regardless of the source casing.
    lowered = text.lower()
    check("ballooning run present", "ballooning" in lowered)
    check("conversion run present", "conversion & ocr" in lowered)

    for step in ("Balloon page", "Title block recognition",
                 "Drawing conversion", "Render + upload"):
        check("shows '%s'" % step, step in text)

    check("each run shows a total", all("total" in h.lower() for h in heads), str(heads))
    check("skipped step marked", "skipped" in text.lower())

    # Durations must be real values, not placeholders.
    durations = page.locator(".cw-timing-ms").all_inner_texts()
    check("durations rendered",
          any(d.endswith("s") or d.endswith("ms") for d in durations), str(durations))

    # The bar for the slowest step should be full width.
    widths = page.eval_on_selector_all(
        ".cw-timing-bar > i", "els => els.map(e => e.style.width)")
    check("bars scaled", "100%" in widths, str(widths))

    # The panel must survive an inspector re-render (it is a sibling of it).
    check("inspector still rendered alongside",
          page.locator(".cw-inspector-body").inner_text().strip() != "")

    page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\workspace-timings.png")
    print("  screenshot: .mssql-scripts/workspace-timings.png")

    real = [e for e in errors if "favicon" not in e.lower() and "DashboardPage.css" not in e]
    check("no page errors", not real, "; ".join(real[:2]))
    b.close()

print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
