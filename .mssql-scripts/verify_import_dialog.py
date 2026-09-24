"""Browser check for the processing-mode chooser in the upload dialog."""
import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
failures = []

CONTRAST_JS = """
e => {
    // color-mix() computes to color(srgb ...) in Chrome, which a naive
    // "strip non-digits" parser turns into NaN. Normalise through a canvas,
    // which always yields #rrggbb or rgba(...).
    const ctx = document.createElement('canvas').getContext('2d');
    const parse = c => {
        if (!c) return [];
        if (/^rgba?\\(/.test(c)) {
            const p = c.replace(/[^\\d.,]/g, '').split(',').map(Number);
            return p;
        }
        ctx.fillStyle = '#000';
        ctx.fillStyle = c;
        const v = ctx.fillStyle;              // '#rrggbb' or 'rgba(...)'
        if (v.startsWith('#')) {
            return [parseInt(v.slice(1,3),16), parseInt(v.slice(3,5),16), parseInt(v.slice(5,7),16)];
        }
        if (/^rgba?\\(/.test(v)) return v.replace(/[^\\d.,]/g, '').split(',').map(Number);
        // color(srgb r g b / a): components are 0..1 and space separated.
        const m = c.match(/color\\(\\s*srgb\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)(?:\\s*\\/\\s*([\\d.]+))?/);
        if (m) return [ +m[1]*255, +m[2]*255, +m[3]*255, m[4] === undefined ? 1 : +m[4] ];
        return [];
    };
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
    // Composite any remaining alpha over the backdrop before comparing.
    if (fg.length > 3 && fg[3] < 1) {
        const a = fg[3];
        for (let i = 0; i < 3; i++) fg[i] = fg[i] * a + bg[i] * (1 - a);
    }
    const l1 = lum(fg), l2 = lum(bg);
    return [(Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05),
            'fg rgb(' + fg.slice(0,3) + ') on bg rgb(' + bg.slice(0,3) + ')'];
}
"""


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + ((" -- " + detail) if detail else ""))
    if not ok:
        failures.append(label)


def run(theme):
    print("\n=== theme: %s ===" % theme)
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width": 1500, "height": 1000})
        errors = []
        page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))

        page.goto(BASE + "/Account/Login", wait_until="domcontentloaded")
        page.fill("input[name=Username]", "admin")
        page.fill("input[name=Password]", "serenity")
        page.click("button[type=submit]")
        page.wait_for_url(lambda u: "/Account/Login" not in u, timeout=20000)

        page.goto(BASE + "/Costing/CostingParts", wait_until="domcontentloaded")
        page.wait_for_selector(".slick-viewport", timeout=25000)
        page.wait_for_timeout(2000)

        if theme == "dark":
            page.evaluate("document.documentElement.classList.remove('theme-azure-light');"
                          "document.documentElement.classList.add('theme-cosmos-dark');")
            page.wait_for_timeout(400)

        # The grid's toolbar opens the upload dialog.
        opened = False
        for name in ("Upload Drawing", "Import", "Upload", "New"):
            btn = page.locator(".s-Toolbar .tool-button", has_text=name)
            if btn.count():
                btn.first.click()
                opened = True
                break
        check("upload dialog opened", opened)
        if not opened:
            print("     toolbar buttons: %s" %
                  page.locator(".s-Toolbar .tool-button").all_inner_texts())
            b.close()
            return

        page.wait_for_selector(".di-modes", timeout=15000)
        page.wait_for_timeout(600)

        cards = page.locator(".di-mode")
        check("both modes offered", cards.count() == 2, "%d card(s)" % cards.count())

        text = page.locator(".di-modes").inner_text()
        check("serial option present", "One step at a time" in text)
        check("parallel option present", "All at once" in text)
        check("recommendation shown", "Recommended" in text)
        check("pros listed", page.locator(".di-pro").count() >= 4,
              "%d pro(s)" % page.locator(".di-pro").count())
        check("cons listed", page.locator(".di-con").count() >= 3,
              "%d con(s)" % page.locator(".di-con").count())
        check("guidance note shown", page.locator(".di-note").count() == 1)

        check("serial selected by default",
              "is-selected" in (page.locator('[data-mode="serial"]').get_attribute("class") or ""))

        # Selecting the other card must move the highlight.
        page.locator('[data-mode="parallel"]').click()
        page.wait_for_timeout(400)
        check("clicking parallel selects it",
              "is-selected" in (page.locator('[data-mode="parallel"]').get_attribute("class") or ""))
        check("serial deselected",
              "is-selected" not in (page.locator('[data-mode="serial"]').get_attribute("class") or ""))
        check("radio stays in sync",
              page.locator('[data-mode="parallel"] input').is_checked())

        ratio, colors = page.locator(".di-mode-head").first.evaluate(CONTRAST_JS)
        check("heading contrast >= 4.5:1", ratio >= 4.5, "%.2f:1 %s" % (ratio, colors))
        ratio2, colors2 = page.locator(".di-con").first.evaluate(CONTRAST_JS)
        check("warning text contrast >= 4.5:1", ratio2 >= 4.5, "%.2f:1 %s" % (ratio2, colors2))

        page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\import-dialog-%s.png" % theme)
        print("  screenshot: .mssql-scripts/import-dialog-%s.png" % theme)

        real = [e for e in errors if "favicon" not in e.lower()]
        check("no page errors", not real, "; ".join(real[:2]))
        b.close()


for theme in ("light", "dark"):
    run(theme)

print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
