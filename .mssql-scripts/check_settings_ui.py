r"""Do the ballooning settings really live in the database now?

The failure this is written against is silent and specific: a store that reads
the row but writes only localStorage looks identical to a working one on the
machine that made the change, and wrong on every other machine. So the proof is
not "the dialog remembered it" - it is the value appearing in SQL, and then a
SECOND browser with an empty localStorage picking it up.

Also checks the admin page enforces the singleton, since a second row would let
the widget and the RFQ consumer read different ones.

    python .mssql-scripts/check_settings_ui.py [part_id]
"""

import json
import os
import subprocess
import sys

from playwright.sync_api import sync_playwright

PART = sys.argv[1] if len(sys.argv) > 1 else "12"
BASE = "http://localhost:5001"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)
fails = []

# A tolerance blob nothing else would produce, so finding it in SQL can only
# mean this browser's localStorage was promoted to the shop setting.
MARKER_ISO_CLASS = "v"


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + str(detail) if detail else ''}")
    if not ok:
        fails.append(name)


def sql(query, read=True):
    out = subprocess.run(
        ["sqlcmd", "-S", "deskdev,65001", "-U", "sa", "-P", "Tsh9989", "-C",
         "-W", "-h", "-1", "-s", "|", "-Q", f"USE RFQ; SET NOCOUNT ON; {query}"],
        capture_output=True, text=True, encoding="utf-8")
    if not read:
        return []
    return [l.strip() for l in (out.stdout or "").splitlines()
            if l.strip() and not l.startswith("Changed database")]


def login(page):
    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.wait_for_timeout(1200)
    user = page.get_by_placeholder("user name")
    if user.count():
        user.fill("admin")
        page.get_by_placeholder("password").fill("serenity")
        page.get_by_role("button", name="Sign In").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1800)


def open_ballooning(page):
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


# Start from a known state: the seeded row, nothing customised.
sql("UPDATE dbo.MasterSettings SET SubNumberSeparator='-', "
    "DefaultToleranceJson=NULL, AlwaysFilterKeywords=NULL, "
    "DimensionFiltersJson=NULL;", read=False)

with sync_playwright() as p:
    browser = p.chromium.launch()

    # ── 1. the admin page ────────────────────────────────────────────────
    ctx = browser.new_context(viewport={"width": 1600, "height": 950})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    login(page)

    print("1. the admin page, and the singleton it has to protect")
    page.goto(f"{BASE}/Master/Settings", wait_until="networkidle")
    page.wait_for_timeout(2500)
    rows = page.locator(".slick-row")
    check("exactly one row", rows.count() == 1, rows.count())
    check("there is no Add button", page.locator(".add-button").count() == 0)
    page.locator(".slick-row .s-EditLink").first.click()
    page.wait_for_timeout(2000)
    check("the dialog opened", page.locator(".s-SettingsDialog").count() > 0)
    check("no Delete button",
          page.locator(".s-SettingsDialog .delete-button").count() == 0)
    # The datum switches must be editable here - they have no other home.
    for field in ["DatumAddMissing", "DatumAddMinConfidence", "SubNumberSeparator"]:
        check(f"{field} is on the form",
              page.locator(f".s-SettingsDialog [name$='{field}']").count() > 0)
    page.screenshot(path=os.path.join(OUT, "settings-dialog.png"))

    # The widget disables its Apply button, but the widget is not the only
    # writer - this page edits the same row, and so could anything holding the
    # service URL. A separator with a digit in it would round-trip through
    # BalloonNo as a different number, so the server has to refuse it too.
    rid = sql("SELECT TOP 1 ID FROM dbo.MasterSettings ORDER BY ID;")[0]
    for bad, why in [("1", "a digit"), ("_", "an underscore"),
                     (" ", "a space"), ("----", "too long")]:
        res = page.evaluate(
            """async ([id, sep]) => {
                const r = await fetch('/Services/Master/Settings/Update', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json',
                              'X-CSRF-TOKEN': (document.cookie.match(
                                  /CSRF-TOKEN=([^;]+)/) || [])[1] || ''},
                    body: JSON.stringify({EntityId: Number(id),
                        Entity: {Id: Number(id), SubNumberSeparator: sep}}),
                });
                return {status: r.status, body: (await r.text()).slice(0, 200)};
            }""", [rid, bad])
        check(f"the server refuses {why}", res["status"] != 200,
              f"{res['status']} {res['body'][:90]}")
    ctx.close()

    # ── 2. an operator's existing localStorage is promoted, not discarded ──
    print("\n2. existing localStorage is promoted to the shop setting")
    ctx = browser.new_context(viewport={"width": 1600, "height": 950})
    ctx.add_init_script(
        "localStorage.setItem('dsrfq.ballooning.defaultTolerance', "
        + json.dumps(json.dumps({"mode": "iso", "unit": "mm",
                                 "iso1Class": MARKER_ISO_CLASS}))
        + ");")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    login(page)
    open_ballooning(page)
    check("the widget loaded balloons",
          page.locator(".ab-table tbody tr[data-id]").count() > 0)

    stored = sql("SELECT ISNULL(DefaultToleranceJson,'<null>') FROM dbo.MasterSettings;")
    print(f"        DefaultToleranceJson: {stored}")
    check("the browser's tolerance settings became the shop's",
          stored and MARKER_ISO_CLASS in stored[0], stored)

    # ── 3. a change made in the widget lands in SQL ───────────────────────
    print("\n3. a setting changed in the widget lands in SQL")
    # The separator is a shop setting, so it lives under Settings in the
    # toolbar - not in the per-balloon panel, where it used to be.
    page.locator("#btn-settings").click()
    page.wait_for_timeout(700)
    page.locator("#ab-m-sep").click()
    page.wait_for_timeout(1000)
    sep = page.locator("#ab-sep-pick")
    check("the separator dialog opened from the Settings menu", sep.count() > 0)
    if sep.count():
        sep.fill(".")
        page.wait_for_timeout(400)
        page.locator("#ab-modal-ok").click()
        page.wait_for_timeout(2500)
        after = sql("SELECT SubNumberSeparator FROM dbo.MasterSettings;")
        print(f"        SubNumberSeparator: {after}")
        check("the widget wrote it to the database", after and after[0] == ".", after)
    page.screenshot(path=os.path.join(OUT, "settings-widget.png"))
    ctx.close()

    # ── 4. the point of all of it: another machine sees it ────────────────
    print("\n4. a second browser, with an empty localStorage, picks it up")
    ctx = browser.new_context(viewport={"width": 1600, "height": 950})
    page2 = ctx.new_page()
    page2.on("pageerror", lambda e: errors.append(str(e)))
    login(page2)
    open_ballooning(page2)
    page2.locator("#btn-settings").click()
    page2.wait_for_timeout(700)
    page2.locator("#ab-m-sep").click()
    page2.wait_for_timeout(1000)
    sep2 = page2.locator("#ab-sep-pick")
    value = sep2.input_value() if sep2.count() else "<no control>"
    print(f"        separator this browser sees: {value!r}")
    check("it reads the shop's separator, not the default", value == ".", value)

    local = page2.evaluate(
        "() => localStorage.getItem('dsrfq.ballooning.defaultTolerance')")
    check("and the shop tolerance was cached into this browser too",
          local is not None and MARKER_ISO_CLASS in local, str(local)[:80])

    check("no page errors", not errors, errors[:3])
    page2.screenshot(path=os.path.join(OUT, "settings-second-browser.png"))
    browser.close()

# Leave the row as the migration seeded it.
sql("UPDATE dbo.MasterSettings SET SubNumberSeparator='-', "
    "DefaultToleranceJson=NULL, AlwaysFilterKeywords=NULL, "
    "DimensionFiltersJson=NULL;", read=False)

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
