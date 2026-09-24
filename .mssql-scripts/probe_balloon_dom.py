"""What page controls does the ballooning widget expose in balloon mode?"""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1700, "height": 1100})
    page.goto(BASE + "/Account/Login", wait_until="domcontentloaded")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/Account/Login" not in u, timeout=20000)

    page.goto(BASE + "/Costing/Workspace/5", wait_until="domcontentloaded")
    page.wait_for_selector(".cw-root", timeout=20000)
    page.wait_for_timeout(3000)
    page.locator(".cw-doc", has=page.locator(".cw-doc-type", has_text="2D")).first.click()
    page.wait_for_timeout(2000)
    page.locator('[data-mode="balloon"]').click()
    page.wait_for_timeout(6000)

    print("=== visible elements inside the balloon stage with ids/classes ===")
    info = page.evaluate("""() => {
        const stage = document.querySelector('.cw-stage-balloon');
        if (!stage) return [];
        return [...stage.querySelectorAll('*')]
            .filter(e => e.offsetParent !== null)
            .filter(e => e.id || (e.className && String(e.className).includes('ab-')))
            .slice(0, 40)
            .map(e => ({
                tag: e.tagName.toLowerCase(),
                id: e.id || '',
                cls: String(e.className || '').slice(0, 46),
                text: (e.innerText || '').trim().slice(0, 28)
            }));
    }""")
    for e in info:
        print("  %-8s #%-22s .%-46s %s" % (e["tag"], e["id"], e["cls"], e["text"]))

    print("\n=== overlay children (the balloons themselves) ===")
    n = page.evaluate("""() => {
        const o = document.querySelector('#ab-overlays');
        return o ? o.children.length : -1;
    }""")
    print("  #ab-overlays children: %s" % n)

    print("\n=== current image src in the balloon viewer ===")
    print("  %s" % page.evaluate(
        "() => (document.querySelector('#ab-image')||{}).getAttribute?.('src') || '(none)'"))

    b.close()
