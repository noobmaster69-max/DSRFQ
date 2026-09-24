"""The grid's re-run buttons render, read legibly in every theme, and work.

The last check actually clicks Costing on a real part and waits for the status
to move, because a button that renders and posts but never reaches a consumer
is exactly the failure this feature is meant to remove.
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

CONTRAST_JS = """
e => {
    const ctx = document.createElement('canvas').getContext('2d');
    const parse = c => {
        if (!c) return [];
        if (/^rgba?\\(/.test(c)) return c.replace(/[^\\d.,]/g, '').split(',').map(Number);
        ctx.fillStyle = '#000'; ctx.fillStyle = c;
        const v = ctx.fillStyle;
        if (v.startsWith('#'))
            return [parseInt(v.slice(1,3),16), parseInt(v.slice(3,5),16), parseInt(v.slice(5,7),16)];
        if (/^rgba?\\(/.test(v)) return v.replace(/[^\\d.,]/g, '').split(',').map(Number);
        return [];
    };
    const lum = ([r,g,b]) => {
        const f = v => { v/=255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); };
        return .2126*f(r) + .7152*f(g) + .0722*f(b);
    };
    const fg = parse(getComputedStyle(e).color);
    let node = e, bg = null;
    while (node) {
        const p = parse(getComputedStyle(node).backgroundColor);
        if (p.length >= 3 && (p.length < 4 || p[3] > 0)) { bg = p; break; }
        node = node.parentElement;
    }
    bg = bg || [255,255,255];
    if (fg.length > 3 && fg[3] < 1) {
        const a = fg[3];
        for (let i = 0; i < 3; i++) fg[i] = fg[i]*a + bg[i]*(1-a);
    }
    const l1 = lum(fg), l2 = lum(bg);
    return [(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05),
            'fg rgb(' + fg.slice(0,3) + ') on bg rgb(' + bg.slice(0,3) + ')'];
}
"""


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + ((" -- " + detail) if detail else ""))
    if not ok:
        failures.append(label)


APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"
raw = json.load(io.open(APPSETTINGS, encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")), timeout=90)


def costing_state():
    cur = conn.cursor()
    r = cur.execute("SELECT CostingStatusID, (SELECT COUNT(*) FROM dbo.CostingPartCostingResults "
                    "WHERE CostingPartID = ? AND IsActive = 1) FROM dbo.CostingParts WHERE ID = ?",
                    PART, PART).fetchone()
    conn.commit()
    return r[0], r[1]


def login(page):
    page.goto(BASE + "/Account/Login", wait_until="domcontentloaded")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/Account/Login" not in u, timeout=30000)


def open_grid(page):
    page.goto(BASE + "/Costing/CostingParts", wait_until="domcontentloaded")
    page.wait_for_selector(".slick-viewport", timeout=30000)
    page.wait_for_timeout(2500)


with sync_playwright() as p:
    b = p.chromium.launch()

    for theme in ("light", "dark"):
        print("\n=== theme: %s ===" % theme)
        page = b.new_page(viewport={"width": 1800, "height": 1000})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        login(page)
        open_grid(page)
        if theme == "dark":
            page.evaluate("document.documentElement.classList.remove('theme-azure-light');"
                          "document.documentElement.classList.add('theme-cosmos-dark');")
            page.wait_for_timeout(500)

        groups = page.locator(".cp-rerun-group")
        check("re-run group rendered per row", groups.count() >= 1,
              "%d group(s)" % groups.count())

        first = groups.first
        buttons = first.locator(".cp-rerun")
        check("three stages offered", buttons.count() == 3,
              "%d button(s)" % buttons.count())

        text = first.inner_text()
        for want in ("Drawing", "Costing", "Balloon"):
            check("%s button present" % want, want in text)

        ratio, colors = buttons.first.evaluate(CONTRAST_JS)
        check("button label contrast >= 4.5:1", ratio >= 4.5, "%.2f:1 %s" % (ratio, colors))

        real = [e for e in errors if "favicon" not in e.lower()]
        check("no page errors", not real, "; ".join(real[:2]))

        page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\rerun-buttons-%s.png" % theme)
        print("  screenshot: .mssql-scripts/rerun-buttons-%s.png" % theme)
        page.close()

    # --- the real thing: click Costing on a part and watch it run -------------
    print("\n=== clicking Costing for part %d ===" % PART)
    before_status, before_lines = costing_state()
    print("  before: status=%s, %d active cost line(s)" % (before_status, before_lines))

    page = b.new_page(viewport={"width": 1800, "height": 1000})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("dialog", lambda d: d.accept())
    login(page)
    open_grid(page)

    row = page.locator(".slick-row").filter(has=page.locator("text=%d" % PART)).first
    target = page.locator('.cp-rerun[data-stage="2"]')
    check("costing button found", target.count() >= 1, "%d found" % target.count())

    if target.count():
        # Find the button on the row for our part: match by the row's Id cell.
        idx = None
        rows = page.locator(".slick-row")
        for i in range(rows.count()):
            if re.search(r"\b%d\b" % PART, rows.nth(i).inner_text()):
                idx = i
                break
        btn = (rows.nth(idx).locator('.cp-rerun[data-stage="2"]')
               if idx is not None else target.first)
        btn.click()
        page.wait_for_timeout(1200)

        # Serenity confirms with its own modal, not window.confirm.
        yes = page.locator(".modal.show button, .s-MessageModal button", has_text=re.compile("Yes|OK", re.I))
        if yes.count():
            yes.first.click()
            print("  confirmed via Serenity modal")
        page.wait_for_timeout(2500)

        deadline = time.time() + 240
        moved = False
        while time.time() < deadline:
            st, lines = costing_state()
            if st != before_status or lines != before_lines:
                moved = True
                print("  status moved to %s (%d line(s)) after %ds"
                      % (st, lines, time.time() - deadline + 240))
                break
            time.sleep(5)
        check("the click actually started a costing run", moved,
              "status stayed %s" % before_status)

    real = [e for e in errors if "favicon" not in e.lower()]
    check("no page errors during the click", not real, "; ".join(real[:2]))
    page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\rerun-clicked.png")
    b.close()

conn.close()
print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
