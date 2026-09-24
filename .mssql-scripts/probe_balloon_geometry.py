"""Measure the real geometry so ensureAnnotationVisible can be corrected."""
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

    info = page.evaluate("""() => {
        const vp = document.querySelector('#ab-viewport');
        const cc = document.querySelector('#ab-canvas-container');
        const img = document.querySelector('#ab-image');
        const box = document.querySelector('#ab-overlays .ab-annotation-box');
        const r = e => { const x = e.getBoundingClientRect();
            return {l: Math.round(x.left), t: Math.round(x.top),
                    w: Math.round(x.width), h: Math.round(x.height)}; };
        return {
            viewport: r(vp),
            scroll: {left: vp.scrollLeft, top: vp.scrollTop,
                     sw: vp.scrollWidth, sh: vp.scrollHeight,
                     cw: vp.clientWidth, ch: vp.clientHeight},
            container: r(cc),
            containerStyle: {
                left: getComputedStyle(cc).left, top: getComputedStyle(cc).top,
                width: getComputedStyle(cc).width,
                transform: getComputedStyle(cc).transform,
                origin: getComputedStyle(cc).transformOrigin,
            },
            image: img ? {natW: img.naturalWidth, natH: img.naturalHeight, ...r(img)} : null,
            firstBalloon: box ? {...r(box), styleLeft: box.style.left, styleTop: box.style.top} : null,
        };
    }""")

    for key, value in info.items():
        print("%-16s %s" % (key, value))

    print("\n--- what my formula predicts for the first balloon ---")
    pred = page.evaluate("""() => {
        const vp = document.querySelector('#ab-viewport');
        const cc = document.querySelector('#ab-canvas-container');
        const box = document.querySelector('#ab-overlays .ab-annotation-box');
        if (!box) return null;
        const m = new DOMMatrix(getComputedStyle(cc).transform);
        const BASE = 1000;
        const img = document.querySelector('#ab-image');
        const drawnH = BASE * (img.naturalHeight / img.naturalWidth);
        const lx = (parseFloat(box.style.left) + parseFloat(box.style.width || 0) / 2) / 100 * BASE;
        const ly = (parseFloat(box.style.top) + parseFloat(box.style.height || 0) / 2) / 100 * drawnH;
        const predicted = {x: m.e + m.a * lx, y: m.f + m.d * ly};
        const vr = vp.getBoundingClientRect();
        const br = box.getBoundingClientRect();
        return {
            localX: Math.round(lx), localY: Math.round(ly),
            predictedRelViewport: {x: Math.round(predicted.x), y: Math.round(predicted.y)},
            actualRelViewport: {x: Math.round(br.left + br.width/2 - vr.left),
                                y: Math.round(br.top + br.height/2 - vr.top)},
            scroll: {left: vp.scrollLeft, top: vp.scrollTop},
        };
    }""")
    print(pred)
    b.close()
