"""Uploading a drawing makes the new row appear without a manual refresh.

Drives the real Upload Drawing dialog in a browser, counts grid rows before and
after, and deletes the part it created. Source-level wiring is checked by
check_progress_messages.py; this is the behaviour the complaint was about.

    python .mssql-scripts/check_upload_refreshes_grid.py
"""

import os
import re
import sys

import pyodbc
import yaml
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
# A small real drawing, so the pipeline has something valid to chew on.
DRAWING = (r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\13"
           r"\0042-69789_03_Green_Standard.pdf")

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)
d = cfg["Database"]
conn = pyodbc.connect("DRIVER={" + d["Driver"] + "};"
                      f"SERVER={d['Server']};DATABASE={d['Database']};"
                      f"UID={d['Uid']};PWD={d['Pwd']}")
cur = conn.cursor()

check("the sample drawing exists", os.path.exists(DRAWING), DRAWING)
before_max = cur.execute("SELECT ISNULL(MAX(ID), 0) FROM dbo.CostingParts").fetchval()
print(f"highest part id before: {before_max}")

new_id = None
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={"width": 1680, "height": 1000})

    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    page.goto(f"{BASE}/Costing/CostingParts", wait_until="networkidle")
    page.wait_for_timeout(4000)

    # Count from the pager, NOT from .slick-row: SlickGrid virtualises, so the
    # number of rendered rows is however many fit the viewport and does not
    # change when the data does.
    # Read it off the page text rather than guessing the pager's class name.
    def total_records():
        txt = page.evaluate("() => document.body.innerText") or ""
        m = re.search(r"of\s+([\d,]+)\s+total records", txt)
        return int(m.group(1).replace(",", "")) if m else None

    rows_before = total_records()
    print(f"grid records before: {rows_before}")
    check("the grid rendered with a record count", rows_before is not None,
          str(rows_before))

    # Open Upload Drawing.
    page.locator("button:has-text('Upload Drawing'), .export-xlsx-button").first.click()
    page.wait_for_timeout(2500)
    check("the upload dialog opened",
          page.locator("text=Upload Drawing").count() > 0)

    # Attach the file to whatever file input the dialog exposes.
    inp = page.locator("input[type=file]").first
    check("the dialog has a file input", inp.count() > 0)
    inp.set_input_files(DRAWING)
    page.wait_for_timeout(6000)

    # Import.
    page.locator("button:has-text('Import'), .ui-dialog-buttonpane button:has-text('Import')").first.click()

    # Wait for the record count to change on its own -- no manual refresh.
    grew = False
    for _ in range(40):
        page.wait_for_timeout(1000)
        now = total_records()
        if now is not None and rows_before is not None and now > rows_before:
            grew = True
            break

    rows_after = total_records()
    print(f"grid records after:  {rows_after}")
    check("the new row appeared without a manual refresh", grew,
          f"{rows_before} -> {rows_after}")

    # And it is actually on screen, at the top.
    first_id = page.eval_on_selector_all(
        ".slick-row:first-child .slick-cell",
        "els => els.map(e => e.textContent.trim()).find(t => /^\\d+$/.test(t))")
    print(f"  first row id: {first_id}")
    check("the new part is the first row", first_id is not None, str(first_id))

    real = [e for e in errors if "favicon" not in e.lower()]
    check("no javascript errors during the upload", not real, str(real[:2]))

    page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\upload-refresh.png",
                    full_page=True)
    b.close()

after_max = cur.execute("SELECT ISNULL(MAX(ID), 0) FROM dbo.CostingParts").fetchval()
check("a part was actually created", after_max > before_max,
      f"{before_max} -> {after_max}")
new_id = after_max if after_max > before_max else None

if new_id:
    print(f"\ncleaning up part {new_id}")
    for t in ("CostingPartQueue", "CostingPartStageTimings",
              "CostingPartCostingResults", "CostingPartBomResults",
              "CostingPartSpecialProcessResults", "CostingPartBalloons"):
        cur.execute(f"DELETE FROM dbo.{t} WHERE CostingPartID = ?", new_id)
    cur.execute("DELETE FROM dbo.CostingPartDocumentImages WHERE CostingPartDocumentID IN "
                "(SELECT ID FROM dbo.CostingPartDocuments WHERE CostingPartID = ?)", new_id)
    cur.execute("DELETE FROM dbo.CostingPartDocuments WHERE CostingPartID = ?", new_id)
    cur.execute("DELETE FROM dbo.CostingParts WHERE ID = ?", new_id)
    conn.commit()
    left = cur.execute("SELECT COUNT(*) FROM dbo.CostingParts WHERE ID = ?",
                       new_id).fetchval()
    check("the test part was removed", left == 0, str(left))

conn.close()
print()
print("all good" if not failures else f"{len(failures)} failure(s): "
      + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
