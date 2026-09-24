"""Browser check for the drawing-conversion template builder.

Verifies the parts that only fail at runtime: that the grid page's bundle loads,
that the dialog's canvas picks up the uploaded artwork, and that the eleven
seeded coordinate quads come back as drawn boxes.
"""
import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
USER, PASSWORD = "admin", "serenity"

failures = []
observed_panel = {}

# WCAG relative-luminance contrast, walking up for the first opaque ancestor
# background so a transparent element does not read as black.
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
        const c = getComputedStyle(node).backgroundColor;
        const p = parse(c);
        if (p.length >= 3 && (p.length < 4 || p[3] > 0)) { bg = p; break; }
        node = node.parentElement;
    }
    bg = bg || [255, 255, 255];
    const l1 = lum(fg), l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
    return [ratio, 'fg rgb(' + fg.slice(0,3) + ') on bg rgb(' + bg.slice(0,3) + ')'];
}
"""


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + ((" -- " + detail) if detail else ""))
    if not ok:
        failures.append(label)


def run(theme):
    print("\n=== theme: %s ===" % theme)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1600, "height": 1000})

        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        # Console only says "404"; the response event names the URL.
        page.on("response", lambda r: errors.append("HTTP %d %s" % (r.status, r.url))
                if r.status >= 400 else None)

        page.goto(BASE + "/Account/Login", wait_until="networkidle")
        page.fill("input[name=Username]", USER)
        page.fill("input[name=Password]", PASSWORD)
        page.click("button[type=submit], input[type=submit]")
        # The post redirects, so waiting on load state alone can observe the
        # pre-redirect URL and read as a failed login.
        page.wait_for_url(lambda u: "/Account/Login" not in u, timeout=20000)
        check("login", "/Account/Login" not in page.url, page.url)

        page.goto(BASE + "/Master/ToolTemplateConversion", wait_until="networkidle")

        # The app themes off a class on <html> (theme-azure-light /
        # theme-cosmos-dark), not off data-bs-theme -- setting the attribute
        # alone leaves --bs-body-color untouched and silently makes the dark run
        # a duplicate of the light one. Must also be applied after navigating.
        if theme == "dark":
            page.evaluate("document.documentElement.classList.remove('theme-azure-light');"
                          "document.documentElement.classList.add('theme-cosmos-dark');")
            page.wait_for_timeout(400)
            check("dark theme applied",
                  page.evaluate("document.documentElement.className").find("cosmos-dark") >= 0,
                  page.evaluate("document.documentElement.className"))
        page.wait_for_timeout(1500)

        check("grid rendered", page.locator(".slick-viewport").count() > 0)
        rows = page.locator(".slick-row").count()
        check("seeded row listed", rows >= 1, "%d row(s)" % rows)

        thumb = page.locator(".slick-row img[src*='/upload/ToolTemplateConversion']")
        check("thumbnail column renders", thumb.count() >= 1, "%d img(s)" % thumb.count())
        if thumb.count():
            loaded = thumb.first.evaluate("i => i.complete && i.naturalWidth > 0")
            check("thumbnail image loads", loaded)

        # Open the record via its edit link.
        page.locator(".slick-row a").first.click()
        page.wait_for_timeout(2500)

        check("builder mounted", page.locator(".ttc-wrap").count() == 1)
        canvas = page.locator(".ttc-canvas")
        check("canvas visible", canvas.count() == 1 and canvas.first.is_visible())

        if canvas.count():
            size = canvas.first.evaluate("c => [c.width, c.height]")
            check("canvas sized from artwork", size[0] > 0 and size[1] > 0, "%dx%d" % tuple(size))
            painted = canvas.first.evaluate(
                "c => { const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;"
                "  for (let i=0;i<d.length;i+=4) if (d[i+3]>0 && (d[i]<250||d[i+1]<250||d[i+2]<250)) return true;"
                "  return false; }")
            check("artwork painted onto canvas", painted)

        legend = page.locator(".ttc-legend-item")
        check("all 11 seeded boxes restored", legend.count() == 11, "%d box(es)" % legend.count())

        status = page.locator(".ttc-status").inner_text() if page.locator(".ttc-status").count() else ""
        check("status reports image resolution", "5482" in status, status)

        # The builder must not paint light-on-light or dark-on-dark. Measure the
        # real contrast ratio rather than just checking the colours parsed.
        if page.locator(".ttc-legend-item").count():
            ratio, colors = page.locator(".ttc-legend-item").first.evaluate(CONTRAST_JS)
            check("legend text contrast >= 4.5:1", ratio >= 4.5,
                  "%.2f:1 %s" % (ratio, colors))

        panel = page.locator(".ttc-wrap").evaluate(
            "e => getComputedStyle(e).backgroundColor")
        observed_panel[theme] = panel
        print("  panel background: %s" % panel)

        page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\ttc-%s.png" % theme, full_page=False)
        print("  screenshot: .mssql-scripts/ttc-%s.png" % theme)

        real_errors = [e for e in errors if "favicon" not in e.lower()]
        check("no page errors", not real_errors, "; ".join(real_errors[:3]))

        browser.close()


for theme in ("light", "dark"):
    run(theme)

print("\n=== theme comparison ===")
check("panel background differs between themes",
      observed_panel.get("light") != observed_panel.get("dark"),
      "light=%s dark=%s" % (observed_panel.get("light"), observed_panel.get("dark")))

print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
