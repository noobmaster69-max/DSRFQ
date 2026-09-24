"""Service Status page and the upload dialog's per-stage readiness.

    python check_service_health_ui.py
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("DSRFQ_BASE", "http://127.0.0.1:5001")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)
fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


def login(page):
    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    if page.get_by_placeholder("user name").count():
        page.get_by_placeholder("user name").fill("admin")
        page.get_by_placeholder("password").fill("serenity")
        page.get_by_role("button", name="Sign In").click()
        page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)


def goto(page, path):
    for _ in range(3):
        try:
            page.goto(f"{BASE}{path}", wait_until="domcontentloaded")
            return
        except Exception:
            page.wait_for_timeout(2000)


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1500, "height": 1100})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    login(page)

    print("1. the endpoint")
    api = page.evaluate("""async () => {
        const token = (document.cookie.match(/(?:^|; )CSRF-TOKEN=([^;]*)/) || [])[1];
        const r = await fetch('/Services/Costing/ServiceHealth/Current', {method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-CSRF-TOKEN': token}, body: '{}'});
        return {status: r.status, body: await r.json()};
    }""")
    body = api["body"]
    check("answers 200", api["status"] == 200, api["status"])
    services = {s["Key"]: s for s in body.get("Services", [])}
    check("reports the seven services", len(services) == 7, sorted(services))
    check("every service has been checked", all(s["State"] != "unknown" for s in services.values()),
          {k: s["State"] for k, s in services.items()})
    check("three stages with a state", [s["Stage"] for s in body.get("Stages", [])] == ["drawing", "costing", "ballooning"])
    print("  info  states:", {k: s["State"] for k, s in services.items()})
    print("  info  stages:", {s["Stage"]: (s["State"], s["Blocking"], s["Degrading"]) for s in body["Stages"]})
    # A stage is blocked exactly when a service it requires is down.
    for st in body["Stages"]:
        down = [s["Name"] for s in services.values() if st["Stage"] in s["RequiredBy"] and s["State"] == "down"]
        check(f"{st['Stage']}: blocked iff a required service is down", (st["State"] == "blocked") == bool(down), down)

    print("\n2. Service Status page")
    goto(page, "/Costing/ServiceStatus")
    page.wait_for_selector(".sh-card", timeout=30000)
    check("three stage tiles", page.locator(".sh-stage").count() == 3)
    check("one card per service", page.locator(".sh-card").count() == len(services), page.locator(".sh-card").count())
    check("every card has an uptime strip and a response-time chart",
          page.locator(".sh-card .sh-strip").count() == len(services) and page.locator(".sh-card .sh-spark").count() == len(services))
    check("status is icon + word, not colour alone",
          all(t.strip() for t in page.locator(".sh-card .sh-pill-label").all_inner_texts()))
    page.wait_for_timeout(11000)                         # at least one more probe + page refresh
    bars = page.locator(".sh-card").first.locator(".sh-bar-up, .sh-bar-slow, .sh-bar-down").count()
    check("history fills in (at least one minute has a reading)", bars >= 1, bars)
    spark = page.locator(".sh-card").first.locator(".sh-hit")
    box = spark.bounding_box()
    page.mouse.move(box["x"] + box["width"] - 3, box["y"] + box["height"] / 2)
    page.wait_for_timeout(300)
    tip = page.locator(".sh-tooltip")
    check("hovering the chart shows a tooltip", tip.is_visible() and tip.inner_text().strip() != "", tip.inner_text()[:40])
    check("a table view is there", page.locator(".sh-table tbody tr").count() == len(services))
    page.screenshot(path=os.path.join(OUT, "service_status.png"), full_page=True)

    print("\n3. upload dialog")
    goto(page, "/Costing/CostingParts")
    page.wait_for_selector(".cp-card", timeout=30000)
    page.locator(".tool-button.export-xlsx-button").first.click()
    page.wait_for_selector(".di-stage-health", timeout=15000)
    page.wait_for_function("() => [...document.querySelectorAll('.di-stage-health')].every(e => e.dataset.state !== 'unknown')", timeout=15000)
    shown = {page.locator(".di-stage").nth(i).get_attribute("data-stage"):
             page.locator(".di-stage-health").nth(i).get_attribute("data-state") for i in range(3)}
    want = {s["Stage"]: s["State"] for s in body["Stages"]}
    check("each stage shows the server's readiness", shown == want, shown)
    check("a link to Service Status", page.locator(".di-stage-note a[href='/Costing/ServiceStatus']").count() == 1)
    page.screenshot(path=os.path.join(OUT, "upload_dialog_health.png"))

    check("no page errors", not errors, errors[:2])
    browser.close()

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}  (screenshots in {OUT})")
sys.exit(1 if fails else 0)
