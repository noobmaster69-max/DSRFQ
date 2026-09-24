"""DSRFQ works the same over Tailscale as on localhost.

Opened as http://localhost:5001 the browser treats the page as a "secure
context"; opened as http://100.68.166.119:5001 it does not, and features that
only exist on secure contexts silently vanish. crypto.randomUUID was one of
them: adding a balloon, an area or a mask threw and did nothing.

Runs every check against the Tailscale address. NEVER saves - each edit is
undone before the page is left.

  1. the page really is a non-secure context (or this test proves nothing)
  2. the id helpers work there
  3. adding a balloon, a mask and an area works
  4. exports and the other pages load without script errors
  5. live progress (MQTT over WebSocket on 15675) connects

    python check_remote_access.py
    set DSRFQ_REMOTE=http://wxlp.tailca12ae.ts.net:5001 & python check_remote_access.py
"""
import os
import sys

from playwright.sync_api import sync_playwright

from _readonly_guard import make_read_only

BASE = os.environ.get("DSRFQ_REMOTE", "http://100.68.166.119:5001")
PART = int(os.environ.get("DSRFQ_PART", "41"))
fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


def goto(pg, url):
    """Navigate, and make sure we actually got there.

    A goto right after a download or while background polls are in flight can
    be reported as interrupted even though it went through - or not go through
    at all. Checking the address afterwards tells the two apart.
    """
    path = url.split(":5001", 1)[-1] or "/"
    for _ in range(4):
        try:
            pg.goto(url, wait_until="domcontentloaded")
        except Exception:
            pg.wait_for_timeout(1500)
        if pg.evaluate("location.pathname").rstrip("/") == path.rstrip("/"):
            return
    raise RuntimeError(f"could not open {url}")


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1700, "height": 1050}, accept_downloads=True)
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(f"{pg.url.split(':5001')[-1]} :: {str(e)[:180]}"))
    # Read-only: balloon writes are blocked in the browser and "save first?"
    # is answered no. This test used to accept every dialog, and Export
    # Excel's "Save now and then export?" saved a test balloon onto part 41.
    blocked_writes = make_read_only(pg)
    sockets = []
    pg.on("websocket", lambda ws: (sockets.append(ws.url),
                                   ws.on("framereceived", lambda f: sockets.append("frame"))))

    goto(pg, f"{BASE}/Account/Login")
    print(f"against {BASE}")
    print("\n1. the conditions this is meant to test")
    check("the page is NOT a secure context", pg.evaluate("window.isSecureContext") is False,
          "if this fails the test is not exercising the Tailscale case")

    if pg.get_by_placeholder("user name").count():
        pg.get_by_placeholder("user name").fill("admin")
        pg.get_by_placeholder("password").fill("serenity")
        pg.get_by_role("button", name="Sign In").click()
        pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(2500)

    print("\n2. ids can be made here")
    check("crypto.randomUUID exists (polyfilled by ScriptInit)",
          pg.evaluate("typeof crypto.randomUUID") == "function")
    ids = pg.evaluate("() => Array.from({length: 200}, () => crypto.randomUUID())")
    check("it gives RFC 4122 v4 UUIDs",
          all(len(i) == 36 and i[14] == "4" and i[19] in "89ab" for i in ids), ids[0])
    check("and 200 of them are all different", len(set(ids)) == 200)

    print("\n3. edits in the ballooning editor")
    goto(pg, f"{BASE}/Costing/Workspace/{PART}")
    pg.wait_for_timeout(6000)
    pg.locator("text=/\\.pdf/").first.click()
    pg.wait_for_timeout(3500)
    pg.get_by_text("Balloon", exact=True).last.click()
    pg.wait_for_selector(".ab-annotation-box", timeout=60000)
    pg.wait_for_timeout(2500)

    def count(sel):
        return pg.locator(sel).count()

    # Exports FIRST, on the drawing exactly as loaded. Once anything is edited
    # the Excel export wants to save before it runs, which this test must not.
    before_err = len(errors)
    try:
        # By id: in the workspace the toolbar scrolls sideways, so the label
        # is often out of view.
        with pg.expect_download(timeout=60000) as dl:
            pg.locator("#btn-export-xls").click()
        check("Export Excel downloads a file", dl.value.suggested_filename.endswith(".xlsx"),
              dl.value.suggested_filename)
    except Exception as e:
        check("Export Excel downloads a file", False, str(e)[:120])
    # A download is a navigation: come back to a settled editor before editing.
    pg.wait_for_selector(".ab-annotation-box", timeout=60000)
    try:
        with pg.expect_download(timeout=120000) as dl:
            pg.locator("#btn-export").click()
        check("Export PDF downloads a file", dl.value.suggested_filename.endswith(".pdf"),
              dl.value.suggested_filename)
    except Exception as e:
        check("Export PDF downloads a file", False, str(e)[:120])
    check("the exports threw nothing", len(errors) == before_err, errors[before_err:][:2])
    pg.wait_for_timeout(1500)

    def drag_with(tool, dx=0):
        pg.get_by_text(tool, exact=True).first.click()
        pg.wait_for_timeout(300)
        box = pg.locator(".ab-annotation-box").first.bounding_box()
        x, y = box["x"] + 230 + dx, box["y"] + 170
        pg.mouse.move(x, y)
        pg.mouse.down()
        pg.mouse.move(x + 45, y + 25, steps=6)
        pg.mouse.up()
        pg.wait_for_timeout(1200)

    before_err = len(errors)
    n = count(".ab-annotation-box")
    drag_with("Add Balloon")
    check("Add Balloon adds a balloon", count(".ab-annotation-box") == n + 1,
          f"{n} -> {count('.ab-annotation-box')}")

    m = count(".ab-overlay-mask")
    drag_with("Mask", dx=90)
    check("Mask adds a mask", count(".ab-overlay-mask") == m + 1, f"{m} -> {count('.ab-overlay-mask')}")

    r = count(".ab-region")
    drag_with("Area", dx=180)
    # Drawing an area opens a dialog to name it and choose how it is sorted.
    # Confirm it with its footer's own button - whatever that is called - or
    # it stays open and swallows every click and key that follows.
    if count(".ab-modal-overlay"):
        title = pg.locator(".ab-modal-header").first.inner_text().strip()
        buttons = pg.locator(".ab-modal-footer button")
        labels = [t.strip() for t in buttons.all_inner_texts()]
        confirm = [i for i, t in enumerate(labels) if t and "cancel" not in t.lower()]
        print(f"  info  the area dialog is \"{title}\", buttons {labels}")
        if confirm:
            buttons.nth(confirm[-1]).click()
            pg.wait_for_timeout(800)
    check("Area adds an area", count(".ab-region") == r + 1, f"{r} -> {count('.ab-region')}")
    check("none of them threw", len(errors) == before_err, errors[before_err:][:2])

    # Put it all back with the toolbar's Undo button, until there is nothing
    # left to undo. Four steps, not three: the area dialog's "Apply and
    # renumber" is an edit of its own.
    steps = 0
    while pg.locator("#btn-undo").is_enabled() and steps < 10:
        pg.locator("#btn-undo").click()
        pg.wait_for_timeout(500)
        steps += 1
    print(f"  info  {steps} undo step(s) back to the drawing as loaded")
    check("undo takes all three back out",
          count(".ab-annotation-box") == n and count(".ab-overlay-mask") == m and count(".ab-region") == r,
          f"boxes {count('.ab-annotation-box')}/{n}, masks {count('.ab-overlay-mask')}/{m}, "
          f"areas {count('.ab-region')}/{r}")

    print("\n4. the other pages")
    for path, sel in [("/", ".dashboard, h1, canvas, svg"),
                      # .cp-card alone: the page also carries its table view's
                      # rows, hidden at 0x0 while cards are shown, and a
                      # combined selector waits on the first - invisible - one.
                      ("/Costing/CostingParts", ".cp-card"),
                      ("/Costing/Queue", ".slick-row, .slick-viewport"),
                      ("/Costing/ServiceStatus", ".sh-card")]:
        before_err = len(errors)
        goto(pg, BASE + path)
        try:
            pg.wait_for_selector(sel, timeout=60000)
            loaded = True
        except Exception:
            loaded = False
        pg.wait_for_timeout(1500)
        check(f"{path} loads without script errors", loaded and len(errors) == before_err,
              errors[before_err:][:1] or ("" if loaded else "never rendered"))

    goto(pg, f"{BASE}/Costing/CostingParts")
    pg.wait_for_selector(".cp-card", timeout=30000)
    pg.get_by_text("Upload Drawing").first.click()
    pg.wait_for_timeout(1500)
    check("the upload dialog opens and checks the services",
          pg.locator(".di-stage-health").count() == 3)

    print("\n5. live progress")
    check("the MQTT socket opened on the Tailscale address",
          any(s.startswith("ws://") and ":15675" in s for s in sockets if s != "frame"),
          [s for s in sockets if s != "frame"][:1])
    check("and the broker answered", sockets.count("frame") >= 2, sockets.count("frame"))

    check("no script errors anywhere in the run", not errors, errors[:3])
    check("and nothing tried to save a balloon", not blocked_writes, blocked_writes[:3])
    b.close()

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}  (nothing was saved)")
sys.exit(1 if fails else 0)
