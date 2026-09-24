"""Confirms the Materials picker actually renders in the costing workspace.

A LookupEditor is constructed at runtime rather than being markup, so "it
compiles" says very little: a wrong element hook or an unresolvable lookup key
leaves an empty slot and no error anywhere the build can see. This logs in,
opens the workspace and checks the widget is really there and populated.

    python .mssql-scripts/check_material_picker.py [part_id]
"""

import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
PART = sys.argv[1] if len(sys.argv) > 1 else "12"
USER, PASSWORD = "admin", "serenity"
SHOT = r"C:\Users\LAPTOP-001\AppData\Local\Temp\material-picker.png"

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1600, "height": 1000})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    # Serenity prefixes login-panel field ids, so match on name instead.
    page.fill("input[name=Username]", USER)
    page.fill("input[name=Password]", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    # The post-submit redirect is still in flight at networkidle; navigating on
    # top of it aborts the new request (ERR_ABORTED), and reading the URL here
    # reports the login page for a session that is in fact signed in.
    page.wait_for_timeout(2500)

    page.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="networkidle")
    check("logged in", "/Account/Login" not in page.url, page.url)
    # The widget is built after the part Retrieve resolves, not at DOMContentLoaded.
    page.wait_for_timeout(4000)

    slot = page.locator(".cw-material-editor")
    check("picker slot rendered", slot.count() == 1, f"count={slot.count()}")

    # A LookupEditor renders an <input> that the combobox then decorates; the
    # decoration is what proves the widget constructed rather than just the
    # container existing.
    inputs = page.locator(".cw-material-editor input")
    check("editor input present", inputs.count() >= 1, f"count={inputs.count()}")

    html = slot.inner_html() if slot.count() else ""
    decorated = any(k in html for k in ("select2", "combobox", "s-Combobox", "role="))
    check("combobox decoration applied", decorated, html[:160].replace("\n", " "))

    label = page.locator("text=Priced as")
    check("'Priced as' label shown", label.count() >= 1)

    # Part 12's drawing says "SEE BOM", so it has no material and the warning
    # should be visible. Not a hard failure if the part was since given one.
    warn = page.locator(".cw-material-warn p")
    print(f"info  warning visible = {warn.count() > 0}")

    check("no page errors", not errors, "; ".join(errors[:2]))

    page.screenshot(path=SHOT, full_page=False)
    print(f"\nscreenshot: {SHOT}")
    browser.close()

print()
print("all good" if not failures else f"{len(failures)} failure(s): {', '.join(failures)}")
sys.exit(1 if failures else 0)
