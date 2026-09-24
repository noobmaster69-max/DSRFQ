"""The check sheet's three Excel exports match DSEFACTORY SMARTQC's.

Presses I-QA-001 (IP), I-QA-002 (FP/LP) and I-QA-003 (QC) in Balloon mode's
check sheet, then opens each file and checks it against the layout of
DSEFACTORY's SqcCheckItemRevEndpoint ListExcelIP / ListExcelFPLP / ListExcel:

  - one sheet per page of 23 / 27 / 20 items, named I-QA-00n-1, -2, ...
  - the template sheet kept but very hidden
  - header: Reference Drawing No / Rev No. / Material in the form's cells
  - each row: B seq, C check item name, D symbol, H +tol, I -tol (H:I merged
    when there is no -tol), J method
  - column F in the Y14.5M-2009 font
  - every line on screen in the file, in order

Read-only: the export writes nothing, and the page cannot save anyway.

    python check_checksheet_excel.py            (part 12)
    set DSRFQ_PART=41 & python check_checksheet_excel.py
"""
import math
import os
import sys

import openpyxl
from playwright.sync_api import sync_playwright

from _readonly_guard import make_read_only

BASE = os.environ.get("DSRFQ_BASE", "http://127.0.0.1:5001")
PART = int(os.environ.get("DSRFQ_PART", "12"))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots", "checksheet_excel")
os.makedirs(OUT, exist_ok=True)

# DSEFACTORY SqcCheckItemRevEndpoint.cs: sheet, items/page, first row, header cells
FORMS = {
    "IP":         ("I-QA-001", 23, 11, "A7", "K7", "K6"),
    "FPLP":       ("I-QA-002", 27, 13, "A7", "K7", "K6"),
    "CheckSheet": ("I-QA-003", 20, 16, "A12", "K12", "K11"),
}
fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


s = lambda v: "" if v is None else str(v)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1700, "height": 1050}, accept_downloads=True)
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)[:160]))
    blocked = make_read_only(pg)

    for _ in range(3):
        try:
            pg.goto(f"{BASE}/Account/Login", wait_until="domcontentloaded")
            break
        except Exception:
            pg.wait_for_timeout(2000)
    pg.get_by_placeholder("user name").fill("admin")
    pg.get_by_placeholder("password").fill("serenity")
    pg.get_by_role("button", name="Sign In").click()
    pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(2000)
    pg.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="domcontentloaded")
    pg.wait_for_selector(".cw-traytab", timeout=60000)
    pg.wait_for_timeout(2500)
    part_no = pg.locator(".cw-root h1, .cw-head h1, h1").first.inner_text().strip()
    pg.locator("text=/\\.pdf/").first.click()
    pg.wait_for_timeout(3000)
    pg.get_by_text("Balloon", exact=True).last.click()
    pg.wait_for_selector(".ab-annotation-box", timeout=60000)
    pg.wait_for_timeout(2000)
    pg.locator("#btn-checksheet").click()
    pg.wait_for_selector(".ab-cs-table tbody tr", timeout=15000)

    heads = [h.strip().upper() for h in pg.locator(".ab-cs-table thead th").all_inner_texts()]
    i = {h: n for n, h in enumerate(heads)}
    screen = pg.evaluate("""() => [...document.querySelectorAll('.ab-cs-table tbody tr')]
        .map(tr => [...tr.children].map(td => td.textContent))""")
    print(f"part {PART} ({part_no}): {len(screen)} lines on screen")

    labels = [t.strip() for t in pg.locator("[data-cs-form]").all_inner_texts()]
    check("the three DSEFACTORY export buttons, in its order",
          [l.split(" ", 1)[-1] for l in labels] == ["I-QA-001 (IP)", "I-QA-002 (FP/LP)", "I-QA-003 (QC)"], labels)

    for key, (sheet, per, first, dcell, rcell, mcell) in FORMS.items():
        print(f"\n{sheet} ({key})")
        try:
            with pg.expect_download(timeout=60000) as dl:
                pg.locator(f'[data-cs-form="{key}"]').click()
            path = os.path.join(OUT, dl.value.suggested_filename)
            dl.value.save_as(path)
        except Exception as e:
            check("downloads a file", False, str(e)[:160])
            continue
        check("downloads an .xlsx", path.endswith(".xlsx") and sheet in os.path.basename(path),
              os.path.basename(path))

        wb = openpyxl.load_workbook(path)
        pages = math.ceil(len(screen) / per)
        visible = [ws for ws in wb.worksheets if ws.sheet_state == "visible"]
        hidden = [ws for ws in wb.worksheets if ws.sheet_state != "visible"]
        want_names = [sheet] if pages == 1 else [f"{sheet}-{n}" for n in range(1, pages + 1)]
        check(f"{pages} page(s) of {per}, named as DSEFACTORY names them",
              [ws.title for ws in visible] == want_names, [ws.title for ws in visible])
        check("the template sheet kept, very hidden",
              [(ws.title, ws.sheet_state) for ws in hidden] == [("_Template_Hidden", "veryHidden")],
              [(ws.title, ws.sheet_state) for ws in hidden])

        ws1 = visible[0]
        check("header: drawing number", s(ws1[dcell].value).startswith("Reference Drawing No:"), ws1[dcell].value)
        check("header: revision", s(ws1[rcell].value).startswith("Rev No. :"), ws1[rcell].value)
        check("header: material", s(ws1[mcell].value).startswith("Material:"), ws1[mcell].value)

        # Every line, in order, in the right cells, across all pages.
        got = []
        for ws in visible:
            for r in range(first, first + per):
                if ws.cell(r, 2).value is None:
                    continue
                got.append((ws, r))
        check("every line on screen is in the file", len(got) == len(screen), f"{len(got)} vs {len(screen)}")
        mism = []
        for (ws, r), line in zip(got, screen):
            if (s(ws.cell(r, 2).value) != line[i["SEQ"]].strip()
                    or s(ws.cell(r, 3).value) != line[i["CHECK ITEM NAME"]].strip()
                    or s(ws.cell(r, 4).value) != line[i["SYMBOL"]]
                    or s(ws.cell(r, 8).value) != line[i["+TOL"]].strip()
                    or s(ws.cell(r, 9).value) != line[i["-TOL"]].strip()
                    or s(ws.cell(r, 10).value) != line[i["METHOD"]].strip()):
                mism.append((ws.title, r, line[i["SEQ"]]))
        check("B seq, C name, D symbol, H +tol, I -tol, J method all match the screen", not mism, mism[:4])

        merged = {str(m) for ws in visible for m in ws.merged_cells.ranges}
        bad_merge = [f"{ws.title}!H{r}" for (ws, r), line in zip(got, screen)
                     if (f"H{r}:I{r}" in {str(m) for m in ws.merged_cells.ranges}) != (line[i["-TOL"]].strip() == "")]
        check("H:I merged exactly where there is no -tol", not bad_merge, bad_merge[:4])
        # D, not F: the symbol goes in D, which the template merges across
        # D:G and already sets in the GD&T face. DSEFACTORY also sets F's font,
        # but F is a hidden cell inside that merge and shows nothing.
        # Every row, every page - the IP template itself has rows 28-33 in Arial.
        not_gdt = [f"{ws.title}!D{r}" for ws in visible for r in range(first, first + per)
                   if ws.cell(r, 4).font.name != "Y14.5M-2009"]
        check("every symbol cell (D, merged D:G) is in the Y14.5M-2009 font", not not_gdt, not_gdt[:4])
        check("and D:G is still one merged cell for the symbol",
              f"D{first}:G{first}" in {str(m) for m in ws1.merged_cells.ranges})
        wb.close()

    check("no script errors", not errors, errors[:2])
    check("nothing tried to write", not blocked, blocked[:3])
    b.close()

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}  (files in {OUT})")
sys.exit(1 if fails else 0)
