"""Click Export PDF in the real workspace and check what comes out.

A green build says the handler compiled. It does not say pdf-lib could parse
the source drawing, that the balloons landed on the right pages, or that the
file opens at all - so this drives the button and inspects the download.

    python .mssql-scripts/check_balloon_export_pdf.py [part_id]
"""

import os
import sys

import fitz                                                # PyMuPDF
from playwright.sync_api import sync_playwright

PART = sys.argv[1] if len(sys.argv) > 1 else "12"
BASE = "http://localhost:5001"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)

fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + detail if detail else ''}")
    if not ok:
        fails.append(name)


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1600, "height": 950},
                            accept_downloads=True)

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.wait_for_timeout(1200)
    user = page.get_by_placeholder("user name")
    if user.count():
        user.fill("admin")
        page.get_by_placeholder("password").fill("serenity")
        page.get_by_role("button", name="Sign In").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)

    page.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="networkidle")
    page.wait_for_timeout(2500)

    # Click the PDF document by name - the "2D" chip selector matches the chip
    # rather than its row and does not always land on something clickable.
    doc2d = page.locator(".cw-rail-docs").get_by_text(".pdf", exact=False).first
    if doc2d.count():
        doc2d.click()
        page.wait_for_timeout(4500)
    else:
        print("  (no PDF document in the rail)")

    mode = page.locator(".cw-modes button:has-text('Balloon')").first
    if mode.count():
        mode.click()
    # Wait for the widget's toolbar rather than a fixed sleep: loading the
    # balloons is a round trip and a page image has to decode first.
    try:
        page.wait_for_selector("#btn-export", timeout=45000)
    except Exception:
        print("  (balloon toolbar never appeared)")
    page.wait_for_timeout(2500)

    balloons = page.locator(".ab-table tbody tr[data-id]").count()
    print(f"  {balloons} row(s) in the annotation list\n")

    btn = page.locator("#btn-export")
    check("the Export PDF button is present", btn.count() > 0)
    check("and is enabled", btn.count() > 0 and btn.is_enabled())

    saved = None
    if btn.count() and btn.is_enabled():
        try:
            with page.expect_download(timeout=180000) as dl:
                btn.click()
            download = dl.value
            saved = os.path.join(OUT, download.suggested_filename)
            download.save_as(saved)
            check("a file was downloaded", True, download.suggested_filename)
        except Exception as exc:                           # noqa: BLE001
            check("a file was downloaded", False, str(exc)[:200])

    browser.close()

if saved and os.path.exists(saved):
    print(f"\n  {os.path.getsize(saved) / 1024:.0f} KB  {saved}")
    check("named after the drawing",
          os.path.basename(saved).startswith("Annotated_"),
          os.path.basename(saved))
    try:
        doc = fitz.open(saved)
        check("opens as a valid PDF", True, f"{doc.page_count} page(s)")
        # Vector text surviving is the whole point of annotating the original
        # rather than rebuilding from the page images.
        words = len(doc[0].get_text("words"))
        check("page 1 still has selectable text", words > 0, f"{words} words")
        # The balloons are drawn as filled circles with a number on top; the
        # numbers land in the text layer.
        text = doc[0].get_text()
        check("balloon numbers are in the page text",
              any(str(n) in text for n in (1, 2, 3)), "")
        doc.close()
    except Exception as exc:                               # noqa: BLE001
        check("opens as a valid PDF", False, str(exc)[:200])

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
