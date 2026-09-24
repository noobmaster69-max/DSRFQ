"""End-to-end check of the per-process machine picker.

Opens the workspace, opens the picker on a machining line, verifies the
alternatives carry pictures/specs/price deltas, switches to a different
machine, and confirms the line re-priced and the part total moved.

    python .mssql-scripts/check_machine_picker.py [part_id]
"""

import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
PART = sys.argv[1] if len(sys.argv) > 1 else "10"
USER, PASSWORD = "admin", "serenity"
SHOT = r"C:\Users\LAPTOP-001\AppData\Local\Temp\machine-picker.png"

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1700, "height": 1150})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", USER)
    page.fill("input[name=Password]", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)

    page.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="networkidle")
    # Options are built on first open, so allow for the Build round trip.
    page.wait_for_timeout(7000)

    def part_total():
        t = page.locator(".cw-total-val").first
        return float(t.inner_text().strip()) if t.count() else None

    before_total = part_total()
    print(f"info  part total before = {before_total}")

    cells = page.locator("button.cw-machine-pick")
    check("machine cells are clickable", cells.count() > 0, f"{cells.count()} cell(s)")
    if not cells.count():
        page.screenshot(path=SHOT)
        browser.close()
        sys.exit(1)

    cells.first.click()
    page.wait_for_timeout(1200)

    picks = page.locator(".cw-pick")
    check("picker lists alternatives", picks.count() > 1, f"{picks.count()} option(s)")
    check("options show a picture", page.locator(".cw-pick img").count() > 0)
    check("options show specs", page.locator(".cw-pick-spec").count() > 0)
    check("options show a price delta", page.locator(".cw-pick-delta").count() > 0)
    check("current machine is marked",
          page.locator(".cw-pick.is-current").count() == 1,
          f"{page.locator('.cw-pick.is-current').count()} marked current")

    # First enabled option = a different machine to the one in use.
    target = page.locator(".cw-pick:not([disabled])").first
    name = target.locator(".cw-pick-name").inner_text().strip().split("\n")[0]
    delta = target.locator(".cw-pick-delta").inner_text().strip()
    print(f"info  switching to {name!r} (delta {delta})")
    target.click()
    page.wait_for_timeout(4000)

    after_total = part_total()
    print(f"info  part total after  = {after_total}")
    check("part total changed", before_total is not None and after_total is not None
          and abs(after_total - before_total) > 0.001,
          f"{before_total} -> {after_total}")

    # Not td.cw-machine.first -- row 1 is Material Cost, which has no machine
    # by design. Read the cells that actually carry one.
    cells_text = [c.strip() for c in
                  page.locator("button.cw-machine-pick").all_inner_texts()]
    check("a line now shows the chosen machine",
          any(name.split()[0].lower() in t.lower() for t in cells_text),
          f"cells read {cells_text}")

    check("no page errors", not errors, "; ".join(errors[:2]))

    # Put it back: this script edits a real quote, and leaving part 10 priced
    # on a 10/h test machine would be worse than not testing.
    restore = page.locator("button.cw-machine-pick").first
    restore.click()
    page.wait_for_timeout(1200)
    original = page.locator(".cw-pick:not([disabled])").filter(
        has_text="MAKINO A61NX-5XR").first
    if original.count():
        original.click()
        page.wait_for_timeout(4000)
        print(f"info  restored; part total = {part_total()}")
    else:
        print("info  COULD NOT RESTORE - set part 10's machine back by hand")
    page.screenshot(path=SHOT)
    print(f"\nscreenshot: {SHOT}")
    browser.close()

print()
print("all good" if not failures else f"{len(failures)} failure(s): {', '.join(failures)}")
sys.exit(1 if failures else 0)
