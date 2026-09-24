"""Does the machine picture reach the workspace UI?

The picture is a joined field ([Origin] onto dbo.Machines). The database has
it; the question is whether Serenity includes joined fields in the List
response the workspace asks for. Rather than call the service directly (which
needs the antiforgery header), this opens the workspace and reports what the
costing tab actually rendered.

    python .mssql-scripts/probe_costing_list.py [part_id]
"""

import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
PART = sys.argv[1] if len(sys.argv) > 1 else "10"
USER, PASSWORD = "admin", "serenity"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1700, "height": 1100})

    captured = {}

    def grab(response):
        if "CostingPartCostingResults/List" in response.url:
            try:
                captured["body"] = response.json()
            except Exception:
                pass

    page.on("response", grab)

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", USER)
    page.fill("input[name=Password]", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)

    page.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="networkidle")
    page.wait_for_timeout(5000)

    body = captured.get("body") or {}
    entities = body.get("Entities") or []
    print(f"List returned {len(entities)} line(s)")
    if entities:
        keys = sorted(entities[0].keys())
        machine_keys = [k for k in keys if k.lower().startswith("machine")]
        print(f"all fields ({len(keys)}): {', '.join(keys)}")
        print(f"\nMACHINE FIELDS RETURNED: {machine_keys or 'NONE'}")
        for e in entities:
            print(f"  {e.get('Name')!r:<26} MachineId={e.get('MachineId')!r} "
                  f"Picture={e.get('MachinePicture')!r} Axis={e.get('MachineAxisNumber')!r}")

    print(f"\ncards rendered : {page.locator('.cw-machine-card').count()}")
    print(f"card pictures  : {page.locator('.cw-machine-pic img').count()}")
    print(f"line thumbs    : {page.locator('.cw-machine-thumb').count()}")
    cell = page.locator('td.cw-machine').first
    if cell.count():
        print(f"first machine cell: {cell.inner_html().strip()[:200]}")

    page.screenshot(path=r"C:\Users\LAPTOP-001\AppData\Local\Temp\machine-ui.png")
    browser.close()
