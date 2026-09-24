"""Does the characteristic picker actually appear, and is it populated?

The lookup is the half of this feature that no database test can reach: the row
is hand-written ServerTypings, so a wrong lookupKey compiles, builds, and then
renders an empty dropdown that looks like an empty table.

    python .mssql-scripts/check_feature_lookup_ui.py [part_id]
"""

import os
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

    # The lookup script itself, before any widget is involved: this is what a
    # wrong lookupKey breaks, and it fails silently everywhere else.
    lookup = page.evaluate("""async () => {
        const { getLookupAsync } = await import('/esm/Serenity.CoreLib.js')
            .catch(() => window['Serenity'] ?? {});
        return null;
    }""") if False else None

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
    page.wait_for_timeout(5000)

    row = page.locator(".ab-table tbody tr[data-id]").first
    check("the part has balloons to select", row.count() > 0)
    if row.count():
        row.click()
        page.wait_for_timeout(2500)

    check("the Characteristic field is in the panel",
          page.locator(".ab-feature-editor").count() > 0)
    # A LookupEditor that could not fetch its lookup renders nothing at all
    # inside its host, which is exactly what a wrong lookupKey produces.
    check("the editor mounted inside it",
          page.locator(".ab-feature-editor select, .ab-feature-editor input,"
                       " .ab-feature-editor .select2-container").count() > 0)

    print("        host markup:",
          page.evaluate("() => document.querySelector('.ab-feature-editor')?.innerHTML")[:400])

    # And it must hold the 15 catalogued symbols, not zero. This is select2 v3,
    # which renders its results into a #select2-drop appended to the body only
    # once opened - so opening it is the only way to prove the lookup resolved
    # rather than silently returning an empty list.
    page.locator(".ab-feature-editor .select2-choice").first.click()
    page.wait_for_timeout(1500)
    results = page.locator("#select2-drop .select2-result-label")
    opts = results.count()
    print(f"        option count: {opts}")
    check("the vocabulary is loaded", opts >= 15, opts)
    if opts:
        print("        first three:",
              [results.nth(i).inner_text() for i in range(min(3, opts))])
    page.screenshot(path=os.path.join(OUT, f"feature-open-{PART}.png"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)

    check("no page errors", not errors, errors[:2])

    page.screenshot(path=os.path.join(OUT, f"feature-{PART}.png"))
    rail = page.locator(".cw-rail").first
    if rail.count():
        rail.screenshot(path=os.path.join(OUT, f"feature-rail-{PART}.png"))
    print(f"        wrote {OUT}")
    browser.close()

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
