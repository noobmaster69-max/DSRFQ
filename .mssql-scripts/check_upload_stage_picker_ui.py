"""The Upload Drawing dialog offers Drawing / Costing / Ballooning, all ticked.

    python check_upload_stage_picker_ui.py
"""
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("DSRFQ_BASE", "http://127.0.0.1:5001")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)
fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1500, "height": 1000})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    if page.get_by_placeholder("user name").count():
        page.get_by_placeholder("user name").fill("admin")
        page.get_by_placeholder("password").fill("serenity")
        page.get_by_role("button", name="Sign In").click()
        page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)
    for _ in range(3):
        try:
            page.goto(f"{BASE}/Costing/CostingParts", wait_until="domcontentloaded")
            break
        except Exception:
            page.wait_for_timeout(2000)
    page.wait_for_selector(".cp-card", timeout=30000)

    # Icon-only toolbar button; the grid gives it this class (CostingPartsGrid.getButtons).
    page.locator(".tool-button.export-xlsx-button").first.click()
    page.wait_for_selector(".di-stage", timeout=15000)
    boxes = page.locator(".di-stage input[type=checkbox]")
    labels = [t.strip().split("\n")[0] for t in page.locator(".di-stage .di-stage-text b").all_inner_texts()]
    check("three stages offered, in pipeline order", labels == ["Drawing", "Costing", "Ballooning"], labels)
    check("all three ticked by default", boxes.count() == 3 and all(boxes.nth(i).is_checked() for i in range(3)))

    boxes.nth(1).uncheck()                                  # Costing off
    page.wait_for_timeout(200)
    check("unticking one leaves the other two", [boxes.nth(i).is_checked() for i in range(3)] == [True, False, True])
    ok_text = page.locator(".modal.show .modal-footer button", has_text="Import").first.inner_text()
    check("the Import button says what will run", "Drawing" in ok_text and "Ballooning" in ok_text and "Costing" not in ok_text, ok_text)

    boxes.nth(0).uncheck()
    page.wait_for_timeout(200)
    boxes.nth(2).click()                                     # try to remove the last one
    page.wait_for_timeout(300)
    left = [boxes.nth(i).is_checked() for i in range(3)]
    check("the last tick cannot be removed", sum(left) == 1, left)

    page.screenshot(path=os.path.join(OUT, "upload_stage_picker.png"))
    check("no page errors", not errors, errors[:2])
    browser.close()

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}  (screenshot in {OUT})")
sys.exit(1 if fails else 0)
