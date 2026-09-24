"""A datum feature is drawn in its own colour, not the dimensions' blue.

A datum is the surface every other characteristic is measured FROM, not one of
them. It used to be drawn exactly like a dimension - same blue box, same blue
balloon - so on a sheet of 170 the only thing setting one apart was the small
triangle in its text.

  1. the colour is its own, and clashes with nothing already in use
  2. an operator's own colour still wins over it
  3. the box on the drawing is marked too, and stays marked when audited
  4. live: the datum boxes and balloons on part 41 really are magenta

    C:\\Aizera\\RPA\\PythonLibrary\\.venv\\Scripts\\python.exe check_datum_colour.py
"""
import io
import os
import re
import subprocess
import sys
import tempfile

W = r"C:\Aizera\DSRFQ\DSRFQ.Web\Modules\Common\Widgets\BallooningWidget"
STYLE = os.path.join(W, "BallooningStyle.ts")
CSS = os.path.join(W, "BallooningWidgetCss.ts")
WIDGET = os.path.join(W, "BallooningWidget.ts")
BASE = os.environ.get("DSRFQ_BASE", "http://127.0.0.1:5001")
PART = int(os.environ.get("DSRFQ_PART", "41"))

DATUM = "#c026d3"
fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


style = io.open(STYLE, encoding="utf-8").read()
css = io.open(CSS, encoding="utf-8").read()
widget = io.open(WIDGET, encoding="utf-8").read()

print("1. the colour is its own")
check("DATUM_COLOR is defined and exported",
      f"export const DATUM_COLOR = '{DATUM}'" in style)
# Everything else the widget already means by a colour.
taken = {
    "#2778b9": "an ordinary balloon",
    "#ff8c00": "a selected balloon",
    "#d97706": "the Warning preset",
    "#dc2626": "the Error preset",
    "#16a34a": "the Success preset",
}
for hexv, what in taken.items():
    check(f"does not collide with {what} ({hexv})", DATUM.lower() != hexv.lower())
check("nothing else in the widget already uses it",
      len(re.findall(re.escape(DATUM), style, re.I)) == 1, "in BallooningStyle.ts")
check("the box css uses the same colour, so box and balloon read as one thing",
      "192, 38, 211" in css)

print("\n2. an operator's own colour still wins")
# Run the real resolver through esbuild-free evaluation: lift the function's
# logic by exercising the compiled bundle would need a browser, so this asserts
# the precedence in the source instead - the order is the whole point.
order = re.search(r"const fallback = a\.isDatum.*?let text = .*?;", style, re.S)
check("the datum colour is a fallback, not an override", order is not None)
if order:
    text = order.group(0)
    check("a balloonColor set by hand comes first", "a.balloonColor && HEX.test" in text)
    check("then a style preset", text.index("preset ??") < text.index("fallback ??"))
    check("then the datum colour", text.index("fallback ??") < text.index("shop.borderColor"))
check("selection still overrides everything",
      style.index("const fallback = a.isDatum") < style.index("if (selected) { stroke = SELECTED"))
check("isDatum is part of the style fields, so every caller passes it",
      "isDatum?: boolean;" in style)

print("\n3. the box on the drawing")
check("a datum box gets its own class", "${ann.isDatum ? 'datum' : ''}" in widget)
check("styled with the datum colour", ".ab-annotation-box.datum {" in css)
check("border AND wash, so it survives the audited green on the inner div",
      re.search(r"\.ab-annotation-box\.datum \{[^}]*background-color[^}]*border-color", css, re.S) is not None)
check("the audited tint is still on the inner element, not the box",
      ".ab-annotation-box.audited .ab-annotation-bg" in widget)
check("hover still responds", ".ab-annotation-box.datum:hover" in css)

print("\n4. live on part %d" % PART)
script = r'''
import json, sys
from playwright.sync_api import sync_playwright
BASE, PART = sys.argv[1], sys.argv[2]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1700, "height": 1050})
    def goto(u):
        for _ in range(3):
            try:
                pg.goto(u, wait_until="domcontentloaded"); return
            except Exception:
                pg.wait_for_timeout(2000)
    goto(BASE + "/Account/Login")
    if pg.get_by_placeholder("user name").count():
        pg.get_by_placeholder("user name").fill("admin")
        pg.get_by_placeholder("password").fill("serenity")
        pg.get_by_role("button", name="Sign In").click()
        pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(2000)
    goto(f"{BASE}/Costing/Workspace/{PART}")
    pg.wait_for_timeout(6000)
    # The workspace opens on whichever document it likes; ballooning needs the
    # 2D one, so click the PDF in the Documents rail.
    pdf = pg.locator("text=/\\.pdf/").first
    if pdf.count(): pdf.click()
    pg.wait_for_timeout(4000)
    bl = pg.get_by_text("Balloon", exact=True)
    if bl.count(): bl.last.click()
    pg.wait_for_timeout(12000)
    out = pg.evaluate("""() => {
      const res = {boxes: 0, datums: 0, datumBox: null, plainBox: null, badges: []};
      res.boxes = document.querySelectorAll('.ab-annotation-box').length;
      const ds = [...document.querySelectorAll('.ab-annotation-box.datum')];
      res.datums = ds.length;
      const cs = e => { const s = getComputedStyle(e); return [s.backgroundColor, s.borderColor]; };
      if (ds[0]) res.datumBox = cs(ds[0]);
      const plain = document.querySelector('.ab-annotation-box:not(.datum)');
      if (plain) res.plainBox = cs(plain);
      const strokeOf = id => {
        const b = document.querySelector('.ab-balloon-badge[data-id="' + id + '"]');
        const s = b && b.querySelector('circle,polygon,path,ellipse');
        return s ? s.getAttribute('stroke') : null;
      };
      for (const d of ds) res.badges.push(strokeOf(d.dataset.id));
      res.plainBadge = plain ? strokeOf(plain.dataset.id) : null;
      return res;
    }""")
    print(json.dumps(out)); b.close()
'''
tmp = os.path.join(tempfile.gettempdir(), "_datum_live.py")
io.open(tmp, "w", encoding="utf-8").write(script)
proc = subprocess.run([sys.executable, tmp, BASE, str(PART)], capture_output=True, text=True)
if proc.returncode != 0:
    check(f"the app answers on {BASE}", False, proc.stderr.strip()[-200:])
else:
    import json
    live = json.loads(proc.stdout.strip().splitlines()[-1])
    check("the sheet has boxes", live["boxes"] > 0, live["boxes"])
    check("some of them are datums", live["datums"] > 0, live["datums"])
    check("a datum box is magenta",
          live["datumBox"] and "192, 38, 211" in live["datumBox"][0], live["datumBox"])
    check("a normal box is not", live["plainBox"] and "192, 38, 211" not in live["plainBox"][0],
          live["plainBox"])
    check("the two are visibly different",
          bool(live["datumBox"]) and bool(live["plainBox"])
          and live["datumBox"][0] != live["plainBox"][0])
    check("every datum balloon is magenta too",
          live["badges"] and all(b and b.lower() == DATUM for b in live["badges"]), live["badges"])
    check("a normal balloon keeps the shop blue",
          (live["plainBadge"] or "").lower() == "#2778b9", live["plainBadge"])

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
