"""What are the 21 nodes in the balloon overlay for a 10-balloon page?"""
from collections import Counter

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1700, "height": 1100})
    page.goto("http://localhost:5001/Account/Login", wait_until="domcontentloaded")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/Account/Login" not in u, timeout=20000)

    page.goto("http://localhost:5001/Costing/Workspace/5", wait_until="domcontentloaded")
    page.wait_for_selector(".cw-root", timeout=20000)
    page.wait_for_timeout(3000)
    page.locator(".cw-doc", has=page.locator(".cw-doc-type", has_text="2D")).first.click()
    page.wait_for_timeout(2000)
    page.locator('[data-mode="balloon"]').click()
    page.wait_for_timeout(6000)
    for _ in range(2):
        page.locator("#btn-next-page").click()
        page.wait_for_timeout(2500)

    nodes = page.evaluate("""() => {
        const o = document.querySelector('#ab-overlays');
        if (!o) return [];
        return [...o.children].map(e => ({
            tag: e.tagName.toLowerCase(),
            cls: String(e.className || '').trim().slice(0, 40),
            text: (e.innerText || '').trim().slice(0, 20)
        }));
    }""")
    print("overlay has %d direct children\n" % len(nodes))
    for kind, n in Counter("%s.%s" % (x["tag"], x["cls"] or "(none)") for x in nodes).items():
        print("  %-46s x%d" % (kind, n))

    print("\nfirst few:")
    for x in nodes[:6]:
        print("  <%s class=%r> %r" % (x["tag"], x["cls"], x["text"]))
    b.close()
