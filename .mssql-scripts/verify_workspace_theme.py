"""Contrast check for the costing workspace under the app's real dark theme.

The workspace, 2D viewer and ballooning panels were originally themed against
data-bs-theme, which this app never sets -- so dark mode was never actually
exercised. This measures text-vs-background on the panels that matter.
"""
import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
PART_ID = 5

CONTRAST_JS = """
e => {
    const parse = c => c.replace(/[^\\d.,]/g, '').split(',').map(Number);
    const lum = ([r, g, b]) => {
        const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
        return .2126 * f(r) + .7152 * f(g) + .0722 * f(b);
    };
    const fg = parse(getComputedStyle(e).color);
    let node = e, bg = null;
    while (node) {
        const p = parse(getComputedStyle(node).backgroundColor);
        if (p.length >= 3 && (p.length < 4 || p[3] > 0)) { bg = p; break; }
        node = node.parentElement;
    }
    bg = bg || [255, 255, 255];
    const l1 = lum(fg), l2 = lum(bg);
    return [(Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05),
            'fg rgb(' + fg.slice(0,3) + ') on bg rgb(' + bg.slice(0,3) + ')'];
}
"""

# Selector -> friendly name. Only elements that carry text.
TARGETS = [
    (".cw-root", "workspace root"),
    (".cw-header", "workspace header"),
    (".cw-tray", "workspace tray"),
    (".cw-panel", "workspace panel"),
]

failures = []


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + ((" -- " + detail) if detail else ""))
    if not ok:
        failures.append(label)


with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1700, "height": 1050})
    page.goto(BASE + "/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/Account/Login" not in u, timeout=20000)

    page.goto("%s/Costing/Workspace/%d" % (BASE, PART_ID), wait_until="networkidle")
    page.evaluate("document.documentElement.classList.remove('theme-azure-light');"
                  "document.documentElement.classList.add('theme-cosmos-dark');")
    page.wait_for_timeout(3000)

    print("=== costing workspace, theme-cosmos-dark ===")
    for sel, name in TARGETS:
        loc = page.locator(sel)
        if not loc.count():
            print("  SKIP  %s (not present)" % name)
            continue
        ratio, colors = loc.first.evaluate(CONTRAST_JS)
        check("%s contrast >= 4.5:1" % name, ratio >= 4.5, "%.2f:1 %s" % (ratio, colors))

    page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\workspace-dark.png")
    print("  screenshot: .mssql-scripts/workspace-dark.png")
    b.close()

print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
