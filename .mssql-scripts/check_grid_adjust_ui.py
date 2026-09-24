r"""Can an operator drag the sheet's grid onto the printed frame?

Ported from One Supply's 显示网格 / 手动调整网格 pair. The value is not the
drawing - it is that a balloon's Section can be corrected when recognition put
the grid in the wrong place, because Section decides where the balloon lands in
the inspection report.

The failure worth guarding is silent: a grid that draws but files balloons into
transposed cells looks right and sorts the report wrongly. So this checks the
labels on the drawn cells, not just that lines appeared.

    python .mssql-scripts/check_grid_adjust_ui.py [part_id]
"""

import json
import os
import subprocess
import sys

from playwright.sync_api import sync_playwright

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 12
BASE = "http://localhost:5001"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)
fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + str(detail) if detail else ''}")
    if not ok:
        fails.append(name)


def sql(query):
    out = subprocess.run(
        ["sqlcmd", "-S", "deskdev,65001", "-U", "sa", "-P", "Tsh9989", "-C",
         "-W", "-h", "-1", "-s", "|", "-Q", f"USE RFQ; SET NOCOUNT ON; {query}"],
        capture_output=True, text=True, encoding="utf-8")
    return [l.strip() for l in (out.stdout or "").splitlines()
            if l.strip() and not l.startswith("Changed database")]


sql(f"DELETE FROM dbo.CostingPartBalloonGrids WHERE CostingPartID = {PART};")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1600, "height": 950})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.wait_for_timeout(1500)
    u = page.get_by_placeholder("user name")
    if u.count():
        u.fill("admin")
        page.get_by_placeholder("password").fill("serenity")
        page.get_by_role("button", name="Sign In").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)

    page.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="networkidle")
    page.wait_for_timeout(3000)
    d = page.locator(".cw-rail-docs [class*=row]:has-text('2D')").first
    if not d.count():
        d = page.locator(".cw-rail-docs >> text=2D").first
    if d.count():
        d.click()
        page.wait_for_timeout(3500)
    m = page.locator(".cw-modes button:has-text('Balloon')").first
    if m.count():
        m.click()
    page.wait_for_timeout(6000)

    print("1. the controls appear only for a sheet that declares a grid")
    check("the Grid button is there", page.locator("#btn-grid").count() > 0)
    check("the Adjust button is there", page.locator("#btn-grid-adjust").count() > 0)
    check("nothing is drawn until asked", page.locator(".ab-grid-layer").count() == 0)

    print("\n2. the grid draws with the right number of lines")
    page.locator("#btn-grid").click()
    page.wait_for_timeout(900)
    check("a grid layer appeared", page.locator(".ab-grid-layer").count() > 0)
    v = page.locator(".ab-grid-line.v").count()
    h = page.locator(".ab-grid-line.h").count()
    print(f"        {v} vertical, {h} horizontal")
    # D8 -> A1 is 8 columns across and 4 rows down, so 9 and 5. Transposed
    # would be 5 and 9, and every recomputed cell would be wrong.
    check("8 columns across means 9 vertical lines", v == 9, v)
    check("4 rows down means 5 horizontal lines", h == 5, h)
    check("every cell is labelled", page.locator(".ab-grid-cell").count() == 32,
          page.locator(".ab-grid-cell").count())

    print("\n3. the labels are the right way round")
    cells = page.evaluate(
        """() => Array.from(document.querySelectorAll('.ab-grid-cell'))
             .map(e => ({t: e.textContent.trim(),
                         x: parseFloat(e.style.left), y: parseFloat(e.style.top)}))""")
    top_left = min(cells, key=lambda c: (c["y"], c["x"]))
    bottom_right = max(cells, key=lambda c: (c["y"], c["x"]))
    print(f"        top-left {top_left['t']}, bottom-right {bottom_right['t']}")
    check("the start corner D8 is top-left", top_left["t"] == "D8", top_left)
    check("the end corner A1 is bottom-right", bottom_right["t"] == "A1", bottom_right)
    # One step across must change the NUMBER, not the letter.
    same_row = sorted([c for c in cells if abs(c["y"] - top_left["y"]) < 0.01],
                      key=lambda c: c["x"])
    print(f"        top row: {[c['t'] for c in same_row]}")
    check("the numbers run across the top row",
          [c["t"] for c in same_row] == ["D8", "D7", "D6", "D5", "D4", "D3", "D2", "D1"],
          [c["t"] for c in same_row])
    page.screenshot(path=os.path.join(OUT, "grid-shown.png"))

    print("\n4. only the inner lines can be dragged")
    page.locator("#btn-grid-adjust").click()
    page.wait_for_timeout(900)
    handles = page.locator("[data-grid-axis]")
    print(f"        {handles.count()} draggable lines")
    # 9 + 5 lines, minus the four outer borders.
    check("the borders are not draggable", handles.count() == 10, handles.count())
    check("Apply appeared", page.locator("#btn-grid-apply").count() > 0)

    print("\n5. a line can be dragged, and stays between its neighbours")
    before = page.evaluate(
        """() => Array.from(document.querySelectorAll('.ab-grid-line.v'))
             .map(e => parseFloat(e.style.left))""")
    handle = page.locator('[data-grid-axis="x"][data-grid-index="1"]')
    box = handle.bounding_box()
    # NOT the middle of the handle: a vertical line runs the full height, so
    # its bounding-box centre is at 50% - exactly where the middle horizontal
    # line crosses it, and that one is painted later and takes the pointer.
    # An operator grabs the line anywhere along it; the test does the same.
    grab_y = box["y"] + box["height"] * 0.125
    page.mouse.move(box["x"] + box["width"] / 2, grab_y)
    page.mouse.down()
    page.mouse.move(box["x"] + 60, grab_y, steps=8)
    page.mouse.up()
    page.wait_for_timeout(700)
    after = page.evaluate(
        """() => Array.from(document.querySelectorAll('.ab-grid-line.v'))
             .map(e => parseFloat(e.style.left))""")
    print(f"        line 1: {before[1]:.2f} -> {after[1]:.2f}")
    check("the line moved", abs(after[1] - before[1]) > 0.5,
          f"{before[1]:.2f} -> {after[1]:.2f}")
    check("the lines are still ascending",
          all(after[i] < after[i + 1] for i in range(len(after) - 1)),
          [round(a, 2) for a in after])
    check("its neighbours did not move",
          abs(after[0] - before[0]) < 0.01 and abs(after[2] - before[2]) < 0.01)
    page.screenshot(path=os.path.join(OUT, "grid-adjusted.png"))

    print("\n6. applying saves the lines and re-files the balloons")
    sections_before = page.evaluate(
        """() => Array.from(document.querySelectorAll('.ab-table tbody tr[data-id]')).length""")
    page.locator("#btn-grid-apply").click()
    page.wait_for_timeout(900)
    check("the apply dialog opened", page.locator("#ab-grid-apply").count() > 0)
    check("it offers save-only as well", page.locator("#ab-grid-save").count() > 0)
    check("and an all-pages checkbox", page.locator("#ab-grid-all").count() > 0)
    page.locator("#ab-grid-apply").click()
    page.wait_for_timeout(2500)

    row = sql(f"SELECT TOP 1 PageNumber, XLines, YLines FROM dbo.CostingPartBalloonGrids "
              f"WHERE CostingPartID = {PART} AND IsActive = 1 ORDER BY ID DESC;")
    print(f"        stored: {str(row)[:150]}")
    check("a grid row was written", bool(row), row)
    if row:
        parts = row[0].split("|")
        xs = json.loads(parts[1])
        ys = json.loads(parts[2])
        check("it stored 9 x-lines", len(xs) == 9, len(xs))
        check("and 5 y-lines", len(ys) == 5, len(ys))
        check("ascending", all(xs[i] < xs[i + 1] for i in range(len(xs) - 1)), xs)
        check("and it is the adjusted position, not the even one",
              abs(xs[1] - after[1]) < 0.01, f"{xs[1]} vs {after[1]}")

    check("the balloon list survived", page.locator(".ab-table tbody tr[data-id]").count()
          == sections_before, sections_before)
    check("no page errors", not errors, errors[:3])
    browser.close()

sql(f"DELETE FROM dbo.CostingPartBalloonGrids WHERE CostingPartID = {PART};")

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
