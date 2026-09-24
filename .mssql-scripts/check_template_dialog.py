"""The "Replace With" field is visible and editable in the template dialog.

The coordinate fields on this form are [Hidden] and driven by the canvas, so a
new plain text field is worth confirming actually renders rather than being
swallowed by the dialog's own layout code.

    python .mssql-scripts/check_template_dialog.py
"""

import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={"width": 1600, "height": 1000})

    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    # Navigating before the auth cookie lands bounces straight back to the login
    # page with a ReturnUrl, and the grid then looks empty for the wrong reason.
    page.wait_for_timeout(2000)
    check("logged in", "/Account/Login" not in page.url, page.url)

    errors.clear()
    page.goto(f"{BASE}/Master/ToolTemplateConversion", wait_until="networkidle")
    page.wait_for_timeout(4000)
    check("landed on the template page",
          "ToolTemplateConversion" in page.url and "Login" not in page.url,
          page.url)

    real = [e for e in errors if "favicon" not in e.lower()]
    check("the page loads without javascript errors", not real, f"{len(real)}")
    for e in real[:3]:
        print(f"        {e[:200]}")

    # The grid column.
    headers = page.eval_on_selector_all(
        ".slick-header-column",
        "els => els.map(e => e.textContent.trim())")
    print(f"  grid columns: {headers}")
    check("the grid shows a Replace With column", "Replace With" in headers,
          str(headers))

    # Open the first row and look for the editor.
    row = page.locator(".slick-row a").first
    if row.count():
        row.click()
        page.wait_for_timeout(2500)

        labels = page.eval_on_selector_all(
            ".s-Form .caption, .field .caption, label",
            "els => els.map(e => e.textContent.trim()).filter(Boolean)")
        check("the dialog has a Replace With field",
              any("Replace With" in l for l in labels),
              str([l for l in labels][:12]))

        val = page.eval_on_selector_all(
            "input.s-StringEditor, .field input[type=text]",
            "els => els.map(e => e.value).filter(Boolean)")
        print(f"  editor values on the form: {val[:8]}")
        check("it is populated with the seeded value", "TSH" in val, str(val[:8]))

        page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\template-dialog.png")
        print("  wrote .mssql-scripts/template-dialog.png")
    else:
        check("there is a template row to open", False)

    b.close()

print()
print("all good" if not failures else f"{len(failures)} failure(s): " + ", ".join(failures))
sys.exit(1 if failures else 0)
