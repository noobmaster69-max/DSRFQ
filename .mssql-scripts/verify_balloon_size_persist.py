"""Does the balloon size survive Save + reload?

BalloonSize was being written to the database but never read back, so the
multiplier reset to 100% on every load and the setting looked unsaved. This
drives the real UI: change the size, save, reload, and check what comes back --
in the toolbar and in the database.
"""
import io
import json
import re
import sys

import pyodbc
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
PART = 5
APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"
failures = []


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + ((" -- " + detail) if detail else ""))
    if not ok:
        failures.append(label)


def stored_size():
    with io.open(APPSETTINGS, encoding="utf-8-sig") as f:
        raw = json.load(f)["Data"]["Default"]["ConnectionString"]
    g = lambda p: re.search(p, raw, re.I).group(1)
    conn = pyodbc.connect(
        "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
        "TrustServerCertificate=yes" % (
            g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
            g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")))
    row = conn.cursor().execute(
        "SELECT TOP 1 BalloonSize FROM dbo.CostingPartBalloons "
        "WHERE CostingPartID = ? AND IsActive = 1", PART).fetchone()
    conn.close()
    return float(row[0]) if row and row[0] is not None else None


def open_balloon_view(page):
    page.goto("%s/Costing/Workspace/%d" % (BASE, PART), wait_until="domcontentloaded")
    page.wait_for_selector(".cw-root", timeout=20000)
    page.wait_for_timeout(3000)
    page.locator(".cw-doc", has=page.locator(".cw-doc-type", has_text="2D")).first.click()
    page.wait_for_timeout(2000)
    page.locator('[data-mode="balloon"]').click()
    page.wait_for_timeout(6000)


def shown_size(page):
    """The percentage next to the Balloon Size control."""
    return page.evaluate("""() => {
        const btn = document.querySelector('#btn-balloon-size-up');
        if (!btn) return null;
        // The readout sits between the - and + buttons.
        for (const el of btn.parentElement.querySelectorAll('span')) {
            const t = (el.textContent || '').trim();
            if (/^\\d+%$/.test(t)) return t;
        }
        return null;
    }""")


with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1700, "height": 1100})
    errors = []
    page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))

    page.goto(BASE + "/Account/Login", wait_until="domcontentloaded")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/Account/Login" not in u, timeout=20000)

    print("  database before: %s" % stored_size())

    open_balloon_view(page)
    first = shown_size(page)
    check("size readout present", first is not None, str(first))
    print("  toolbar on first open: %s" % first)

    # Change it by a known number of steps (0.1 per click = 10%).
    for _ in range(4):
        page.locator("#btn-balloon-size-up").click()
        page.wait_for_timeout(250)
    changed = shown_size(page)
    check("clicking + changes the readout", changed != first, "%s -> %s" % (first, changed))

    page.locator("#btn-save").click()
    page.wait_for_timeout(5000)

    after_save = stored_size()
    print("  database after save: %s" % after_save)
    check("save wrote a new size to the database",
          after_save is not None and abs(after_save - float(changed.rstrip('%')) / 100) < 0.02,
          "db=%s ui=%s" % (after_save, changed))

    # The real test: reload and see whether it comes back.
    open_balloon_view(page)
    reloaded = shown_size(page)
    check("size survives reload", reloaded == changed, "saved %s, reloaded %s" % (changed, reloaded))

    page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\balloon-size.png")
    print("  screenshot: .mssql-scripts/balloon-size.png")

    real = [e for e in errors if "favicon" not in e.lower()]
    check("no page errors", not real, "; ".join(real[:2]))
    b.close()

print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
