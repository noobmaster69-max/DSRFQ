"""Screenshot the Visit Plan dialog - the punch photos and the pane sizes.

The complaint is that HR cannot check a day's visits in it, so the check has to
be a picture plus the measured height of the pane they scroll.

    python .mssql-scripts/shot_visit_plan_dialog.py [plan_id]
"""

import os
import sys

from playwright.sync_api import sync_playwright

PLAN = sys.argv[1] if len(sys.argv) > 1 else "1"
BASE = "http://localhost:5000"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1600, "height": 950})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    # What the server actually sends for the detail rows. The evidence card is
    # built from expression fields on the stop, and a missing photo in the UI
    # looks identical whether the photo is absent or merely not selected.
    retrieved = {}

    def on_response(resp):
        if "VisitPlans/Retrieve" in resp.url:
            try:
                retrieved["body"] = resp.json()
            except Exception:
                pass

    page.on("response", on_response)

    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.wait_for_timeout(1500)
    user = page.get_by_placeholder("user name")
    if user.count():
        user.fill("admin")
        page.get_by_placeholder("password").fill("serenity9989")
        page.get_by_role("button", name="Sign In").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2500)
    print("logged in       :", "/Account/Login" not in page.url)

    page.goto(f"{BASE}/HumanResource/VisitPlans", wait_until="networkidle")
    page.wait_for_timeout(3000)

    print("grid rows       :", page.locator(".slick-row").count())
    # Serenity opens the edit dialog from the link cell, not from the row.
    link = page.locator(".slick-row a").first
    if link.count():
        link.click()
    else:
        page.locator(".slick-row").first.dblclick()
    page.wait_for_timeout(9000)

    print("planner present :", page.locator(".s-VisitStopsPlanner").count() > 0)

    ent = (retrieved.get("body") or {}).get("Entity") or {}
    stops = ent.get("Stops") or []
    print(f"stops returned  : {len(stops)}")
    for st in stops:
        print("   stop", st.get("Id"),
              "CheckInEventId=", st.get("CheckInEventId"),
              "Picture=", st.get("CheckInPicture"),
              "Lat=", st.get("CheckInLatitude"),
              "Time=", st.get("CheckInTime"))
    if stops:
        print("   keys on stop 1:", sorted(stops[0].keys()))

    def box(sel):
        el = page.locator(sel).first
        if not el.count():
            return None
        b = el.bounding_box()
        return None if not b else {k: round(v) for k, v in b.items()}

    print("viewport        : 1600 x 950")
    print("vsp-body        :", box(".vsp-body"))
    print("vsp-list-pane   :", box(".vsp-list-pane"))
    print("vsp-map         :", box(".vsp-map"))
    print("punch cards     :", page.locator(".vsp-punch").count())
    print("punch photos    :", page.locator("img.vsp-punch-photo").count())
    print("no-photo slots  :", page.locator(".vsp-punch-nophoto").count())
    print("leftover links  :", page.locator("a.vsp-punch-photo").count())
    print("first photo box :", box("img.vsp-punch-photo"))
    print("photo loaded    :", page.evaluate("""() => {
        const i = document.querySelector('img.vsp-punch-photo');
        return i ? {src: i.getAttribute('src'), w: i.naturalWidth, h: i.naturalHeight} : null;
    }"""))
    print("page errors     :", errors[:2])

    page.screenshot(path=os.path.join(OUT, f"visitplan-{PLAN}.png"))
    pl = page.locator(".s-VisitStopsPlanner").first
    if pl.count():
        pl.screenshot(path=os.path.join(OUT, f"visitplan-planner-{PLAN}.png"))
    punch = page.locator(".vsp-punch").first
    if punch.count():
        punch.screenshot(path=os.path.join(OUT, f"visitplan-punch-{PLAN}.png"))
    print("wrote           :", OUT)
    browser.close()
