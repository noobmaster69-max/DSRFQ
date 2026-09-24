"""Click the Drawing re-run button and confirm the whole path works.

Distinct from the costing test: this stage's cleanup runs an UPDATE..FROM join
over CostingPartDocumentImages, which no other stage exercises, and a broken
join there would only show up as pages that never get replaced.
"""
import io
import json
import re
import sys
import time

import pyodbc
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
PART = int(sys.argv[1]) if len(sys.argv) > 1 else 8
failures = []

APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"
raw = json.load(io.open(APPSETTINGS, encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")), timeout=90)


def snapshot():
    cur = conn.cursor()
    r = cur.execute("""
        SELECT p.DrawingConversionStatusID, p.OcrStatusID, p.PartNumber,
               (SELECT COUNT(*) FROM dbo.CostingPartDocumentImages i
                INNER JOIN dbo.CostingPartDocuments d ON d.ID = i.CostingPartDocumentID
                WHERE d.CostingPartID = p.ID AND i.IsActive = 1)
        FROM dbo.CostingParts p WHERE p.ID = ?""", PART).fetchone()
    conn.commit()
    return tuple(r)


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + ((" -- " + detail) if detail else ""))
    if not ok:
        failures.append(label)


before = snapshot()
print("before: conv=%s ocr=%s part=%s activeImages=%d" % before)

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1800, "height": 1000})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(BASE + "/Account/Login", wait_until="domcontentloaded")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/Account/Login" not in u, timeout=30000)
    page.goto(BASE + "/Costing/CostingParts", wait_until="domcontentloaded")
    page.wait_for_selector(".cp-rerun-group", timeout=30000)
    page.wait_for_timeout(2000)

    rows = page.locator(".slick-row")
    idx = next((i for i in range(rows.count())
                if re.search(r"\b%d\b" % PART, rows.nth(i).inner_text())), None)
    check("found the row for part %d" % PART, idx is not None)
    if idx is None:
        b.close()
        sys.exit(1)

    rows.nth(idx).locator('.cp-rerun[data-stage="1"]').click()
    page.wait_for_timeout(1000)
    yes = page.locator(".modal.show button, .s-MessageModal button",
                       has_text=re.compile("Yes|OK", re.I))
    check("confirmation asked before discarding output", yes.count() >= 1)
    if yes.count():
        yes.first.click()
    page.wait_for_timeout(2500)

    real = [e for e in errors if "favicon" not in e.lower()]
    check("no page errors", not real, "; ".join(real[:2]))
    page.close()
    b.close()

print("\nwaiting for the run...")
deadline, done = time.time() + 420, False
while time.time() < deadline:
    time.sleep(8)
    now = snapshot()
    if now[0] == 3 and now[1] == 3 and now != before:
        done = True
        break

after = snapshot()
print("after:  conv=%s ocr=%s part=%s activeImages=%d" % after)
check("drawing conversion completed", after[0] == 3, "status %s" % after[0])
check("ocr completed", after[1] == 3, "status %s" % after[1])
check("converted pages were regenerated", after[3] > 0, "%d active image(s)" % after[3])
check("part number still populated", bool(after[2]), repr(after[2]))

conn.close()
print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
