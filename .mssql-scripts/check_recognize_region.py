"""Server test: CostingPartBalloons/RecognizeRegion (Area and Single recognition).

Reads only - nothing is saved. Needs DSRFQ running with the current build and
the Ballooning Model engine on 5999.

    python .mssql-scripts/check_recognize_region.py [part_id]
"""

import os
import sys

from playwright.sync_api import sync_playwright

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 12
BASE = os.environ.get("DSRFQ_BASE", "http://localhost:5001")
fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + str(detail) if detail != '' else ''}")
    if not ok:
        fails.append(name)


CALL = """async ([url, body]) => {
    const csrf = (document.cookie.match(/CSRF-TOKEN=([^;]+)/) || [])[1];
    const r = await fetch('/Services/' + url, {method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf}, body: JSON.stringify(body)});
    return await r.json();
}"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.wait_for_timeout(1000)
    page.get_by_placeholder("user name").fill("admin")
    page.get_by_placeholder("password").fill("serenity")
    page.get_by_role("button", name="Sign In").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    call = lambda url, body: page.evaluate(CALL, [url, body])

    docs = call("Costing/CostingPartDocuments/List", {"Criteria": [["CostingPartID"], "=", PART]})
    doc_ids = [d["Id"] for d in docs.get("Entities", [])]
    images = call("Costing/CostingPartDocumentImages/List", {"Criteria": [["CostingPartDocumentID"], "in", [doc_ids]]})
    pages = sorted([i for i in images.get("Entities", []) if i.get("Original") and (i.get("Page") or 1) == 1],
                   key=lambda i: i.get("Id"))
    check("the part has a page 1 image", bool(pages), len(pages))
    img = pages[0]["FileDirectory"] if pages else ""

    balloons = call("Costing/CostingPartBalloons/List", {"Criteria": [["CostingPartID"], "=", PART]})
    targets = [b for b in balloons.get("Entities", []) if (b.get("PageNumber") or 1) == 1
               and not b.get("RemovedByUser") and not b.get("IsNote")
               and (b.get("Symbol") or "").strip()[:1] in ".0123456789" and len((b.get("Symbol") or "").strip()) <= 10]
    check("a numeric balloon to aim at", bool(targets), len(targets))
    t = targets[0] if targets else {"BBoxX1": 40, "BBoxY1": 40, "BBoxX2": 45, "BBoxY2": 42, "Symbol": "?"}
    rect = {"X": t["BBoxX1"] - 0.5, "Y": t["BBoxY1"] - 0.5,
            "Width": (t["BBoxX2"] - t["BBoxX1"]) + 1, "Height": (t["BBoxY2"] - t["BBoxY1"]) + 1}
    print(f"        aiming at '{t['Symbol']}' {rect}")

    print("area")
    r = call("Costing/CostingPartBalloons/RecognizeRegion", {"CostingPartId": PART, "PageImage": img, "Mode": "area", **rect})
    items = r.get("Items") or []
    check("area answers without error", not r.get("Error"), (r.get("Error") or {}).get("Message", ""))
    check("area reads at least one item", len(items) >= 1, [i.get("Symbol") for i in items][:5])
    # The crop is padded a little, so allow a margin round the box.
    inside = all(rect["X"] - 3 <= i["BBoxX1"] and i["BBoxX2"] <= rect["X"] + rect["Width"] + 3 for i in items)
    check("items come back in page percent, inside the box", bool(items) and inside,
          [(round(i["BBoxX1"], 2), round(i["BBoxX2"], 2)) for i in items][:3])
    want = "".join(ch for ch in (t.get("Symbol") or "") if ch.isdigit())[:3]
    got = " ".join(i.get("Symbol") or "" for i in items)
    check("what it read matches the balloon's digits", want and want in "".join(ch for ch in got if ch.isdigit()), f"{t.get('Symbol')!r} vs {got!r}")

    print("single")
    wide = {**rect, "X": rect["X"] - 3, "Width": rect["Width"] + 8, "Height": rect["Height"] + 2}
    r = call("Costing/CostingPartBalloons/RecognizeRegion", {"CostingPartId": PART, "PageImage": img, "Mode": "single", **wide})
    check("single returns exactly one balloon", len(r.get("Items") or []) == 1, [i.get("Symbol") for i in r.get("Items") or []])

    print("refusals")
    r = call("Costing/CostingPartBalloons/RecognizeRegion", {"CostingPartId": PART, "PageImage": img, "Mode": "everything", **rect})
    check("an unknown mode is refused", bool(r.get("Error")), (r.get("Error") or {}).get("Message", ""))
    r = call("Costing/CostingPartBalloons/RecognizeRegion", {"CostingPartId": PART, "PageImage": "../appsettings.json", "Mode": "area", **rect})
    check("a path outside the part's images is refused", bool(r.get("Error")), (r.get("Error") or {}).get("Message", ""))
    r = call("Costing/CostingPartBalloons/RecognizeRegion", {"CostingPartId": PART + 100000, "PageImage": img, "Mode": "area", **rect})
    check("another part's id cannot read this image", bool(r.get("Error")), (r.get("Error") or {}).get("Message", ""))
    r = call("Costing/CostingPartBalloons/RecognizeRegion", {"CostingPartId": PART, "PageImage": img, "Mode": "area", **{**rect, "Width": 0}})
    check("an empty box is refused", bool(r.get("Error")), (r.get("Error") or {}).get("Message", ""))
    browser.close()

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
