"""Open a part's 3D view so the browser writes back a converted GLB.

The STEP -> GLB conversion only happens in the viewer, which means a headless
costing run can never draw a part picture for a part nobody has opened. This
drives that one interaction, so the rest of the chain can be tested.
"""
import io
import json
import re
import sys
import time

import pyodbc
from playwright.sync_api import sync_playwright

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 6
BASE = "http://localhost:5001"
APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"

raw = json.load(io.open(APPSETTINGS, encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")), timeout=90)


def converted():
    cur = conn.cursor()
    r = cur.execute("""SELECT TOP 1 ConvertedFileDirectory FROM dbo.CostingPartDocuments
                       WHERE CostingPartID = ? AND Type = 2 AND IsActive = 1
                       ORDER BY ID DESC""", PART).fetchone()
    conn.commit()
    return r[0] if r else None


print("before: ConvertedFileDirectory = %r" % converted())

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1600, "height": 1000})
    msgs = []
    page.on("console", lambda m: msgs.append("%s: %s" % (m.type, m.text)))
    page.on("pageerror", lambda e: msgs.append("pageerror: %s" % e))

    page.goto(BASE + "/Account/Login", wait_until="domcontentloaded")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/Account/Login" not in u, timeout=30000)

    page.goto("%s/Costing/Workspace/%d" % (BASE, PART), wait_until="domcontentloaded")
    page.wait_for_timeout(4000)

    # Find whatever opens the 3D view.
    opened = False
    for sel in ('text="3D"', '.st3-tab', '[data-tab="3d"]', 'text="3D Model"'):
        loc = page.locator(sel)
        if loc.count():
            loc.first.click()
            opened = True
            print("clicked %s" % sel)
            break
    if not opened:
        print("no 3D tab found; page text follows")
        print(page.inner_text("body")[:800])

    # The converter is fetched from a CDN and the export happens after import,
    # so this needs real time, not a fixed short wait.
    deadline = time.time() + 180
    got = None
    while time.time() < deadline:
        page.wait_for_timeout(5000)
        got = converted()
        if got and got.lower().endswith(".glb"):
            break

    print("\nafter: ConvertedFileDirectory = %r" % got)
    for m in msgs[-25:]:
        print("  %s" % m[:150])
    page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\part6-3dview.png")
    b.close()

conn.close()
sys.exit(0 if got and got.lower().endswith(".glb") else 1)
