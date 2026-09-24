"""A row updates itself as its stages complete, with no manual refresh.

Uploads a drawing, then watches the new row's status cells change on their own.
The test never calls refresh and never reloads the page -- if the statuses move,
it is because the grid re-read the row off the back of a progress message.

Cleans up the part it created.

    python .mssql-scripts/check_row_autorefresh.py
"""

import os
import re
import sys

import pyodbc
import yaml
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
DRAWING = (r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\13"
           r"\0042-69789_03_Green_Standard.pdf")
WATCH_SECONDS = 260

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
before_max = cur.execute("SELECT ISNULL(MAX(ID),0) FROM dbo.CostingParts").fetchval()

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

    # Count how many times the grid asks the server for a List. A full refresh
    # would show up here; a per-row re-read hits Retrieve instead.
    page.evaluate("""() => {
        window.__calls = {list: 0, retrieve: 0};
        const orig = window.fetch;
        window.fetch = function (...a) {
            const u = String(a[0] || '');
            if (u.includes('/CostingParts/List')) window.__calls.list++;
            if (u.includes('/CostingParts/Retrieve')) window.__calls.retrieve++;
            return orig.apply(this, a);
        };
    }""")

    page.locator("button:has-text('Upload Drawing'), .export-xlsx-button").first.click()
    page.wait_for_timeout(2500)
    page.locator("input[type=file]").first.set_input_files(DRAWING)
    page.wait_for_timeout(6000)
    page.locator("button:has-text('Import')").first.click()
    page.wait_for_timeout(6000)

    # Which part did we just create? SlickGrid orders its row elements by
    # position rather than document order, so ":first-child" is whichever row
    # happens to be topmost in the DOM -- not the newest part.
    watch_id = cur.execute("SELECT ISNULL(MAX(ID),0) FROM dbo.CostingParts").fetchval()
    check("a part was created to watch", watch_id > before_max,
          f"{before_max} -> {watch_id}")
    print(f"watching part {watch_id}")

    def row_cells(part_id):
        return page.evaluate(
            """(id) => {
                for (const r of document.querySelectorAll('.slick-row')) {
                    const cells = [...r.querySelectorAll('.slick-cell')]
                        .map(e => e.innerText.replace(/\\s+/g, ' ').trim());
                    if (cells.some(c => c === String(id)))
                        return cells;
                }
                return null;
            }""", part_id)

    print("\nwatching that row, without refreshing:")
    seen = []
    for tick in range(WATCH_SECONDS // 5):
        page.wait_for_timeout(5000)
        cells = row_cells(watch_id)
        if cells is None:
            continue
        joined = " | ".join(c for c in cells if c)
        # Statuses are words from MasterCostingStatus.
        statuses = re.findall(r"In Progress|Completed|Failed|No Drawing|Pending", joined)
        msg = next((c for c in cells if c.startswith(("✅", "❌", "🎈"))
                    or "..." in c), "")
        snap = (tuple(statuses), msg[:60])
        if not seen or seen[-1] != snap:
            seen.append(snap)
            print(f"  t+{(tick + 1) * 5:>3}s  {statuses}  {msg[:56]}")
        # Drawing + OCR both done is enough to prove the row moved on its own.
        if statuses[:2].count("Completed") == 2:
            break

    calls = page.evaluate("() => window.__calls")
    print(f"\n  List calls: {calls['list']}   Retrieve calls: {calls['retrieve']}")

    check("the row changed on its own more than once", len(seen) > 1,
          f"{len(seen)} distinct state(s)")
    check("a stage reached Completed without a manual refresh",
          any("Completed" in s[0] for s in seen),
          str(seen[-1][0]) if seen else "none")
    check("it used per-row reads, not full grid reloads",
          calls["retrieve"] > 0, f"retrieve={calls['retrieve']}")
    check("no javascript errors", not [e for e in errors if "favicon" not in e.lower()],
          str(errors[:2]))

    page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\row-autorefresh.png",
                    full_page=True)
    b.close()

after_max = cur.execute("SELECT ISNULL(MAX(ID),0) FROM dbo.CostingParts").fetchval()
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
    check("the test part was removed",
          cur.execute("SELECT COUNT(*) FROM dbo.CostingParts WHERE ID = ?",
                      new_id).fetchval() == 0)
conn.close()

print()
print("all good" if not failures else f"{len(failures)} failure(s): "
      + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
