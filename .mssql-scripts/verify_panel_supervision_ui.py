"""The panel page still renders after the supervision badges were added.

A template-literal edit inside card() breaks silently -- the fetch succeeds
and the grid just comes up empty -- so this checks for rendered cards and the
new badge, not merely for a 200.
"""
import sys

from playwright.sync_api import sync_playwright

failures = []


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + ((" -- " + detail) if detail else ""))
    if not ok:
        failures.append(label)


with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1500, "height": 1100})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    page.goto("http://localhost:7171/", wait_until="domcontentloaded")
    page.wait_for_selector(".card", timeout=20000)
    page.wait_for_timeout(2500)

    cards = page.locator(".card")
    check("service cards rendered", cards.count() >= 9, "%d card(s)" % cards.count())

    watched = page.locator(".watch", has_text="watched")
    check("watched badge shown on supervised services", watched.count() >= 4,
          "%d badge(s)" % watched.count())

    up = page.locator(".card.up")
    check("services showing as up", up.count() >= 6, "%d up" % up.count())

    real = [e for e in errors if "favicon" not in e.lower()]
    check("no page errors", not real, "; ".join(real[:2]))

    page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\panel-supervision.png",
                    full_page=True)
    print("  screenshot: .mssql-scripts/panel-supervision.png")
    b.close()

print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
