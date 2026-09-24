"""Record the part-12 walkthrough as a video.

Playwright records the whole browser context, so the file is written when the
context closes. Each beat is wrapped: a step that cannot find its control logs
and moves on rather than aborting the recording half way through.

Paced deliberately -- real mouse moves and pauses -- so it is watchable rather
than a strobe of instant jumps.

    python .mssql-scripts/record_demo_video.py
"""

import json
import os
import shutil
import sys
import time

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
PART = "12"
OUT_DIR = r"C:\Aizera\DSRFQ\.mssql-scripts\demo-video"
FINAL = r"C:\Aizera\DSRFQ\.mssql-scripts\dsrfq-demo-part12.webm"
W, H = 1680, 1050

os.makedirs(OUT_DIR, exist_ok=True)


# Wall-clock offsets of each beat, measured from the moment the browser context
# is created -- which is also when Playwright starts the video. Written out so
# the narration and subtitles can be timed to the real cut instead of guessed
# from sampled frames.
TIMELINE = []
_t0 = None


def beat(name):
    def deco(fn):
        def run(page):
            start = time.time() - _t0
            print(f"  [{start:6.1f}s] {name}...")
            try:
                fn(page)
            except Exception as exc:
                print(f"    ! {name} skipped: {str(exc)[:110]}")
            TIMELINE.append({"name": name,
                             "start": round(start, 2),
                             "end": round(time.time() - _t0, 2)})
        return run
    return deco


def settle(page, ms):
    page.wait_for_timeout(ms)


@beat("1. Drawing Library")
def beat_library(page):
    page.goto(f"{BASE}/Costing/CostingParts", wait_until="networkidle")
    settle(page, 5000)
    # Drift the pointer across the row so the eye has something to follow.
    page.mouse.move(700, 300)
    settle(page, 1500)
    page.mouse.move(1200, 320)
    settle(page, 3000)


@beat("2. Open the workspace")
def beat_open(page):
    page.goto(f"{BASE}/Costing/Workspace/{PART}", wait_until="networkidle")
    settle(page, 7000)


@beat("3. Turn the 3D model")
def beat_3d(page):
    box = page.locator("#cw-3d, .cw-stage, canvas").first.bounding_box()
    if not box:
        return
    cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
    page.mouse.move(cx, cy)
    page.mouse.down()
    for dx in range(0, 220, 12):
        page.mouse.move(cx + dx, cy - dx / 3)
        page.wait_for_timeout(40)
    page.mouse.up()
    settle(page, 2500)


def click_tray_tab(page, label):
    """The tray tabs are spans, not buttons; match inside the tray only."""
    page.locator(f".cw-tray-tabs :text-is('{label}'), "
                 f".cw-tray :text-is('{label}')").first.click()


@beat("4. Costing lines")
def beat_costing(page):
    click_tray_tab(page, "Costing")
    settle(page, 2000)
    for y in (760, 800, 850, 900, 950):
        page.mouse.move(1000, y)
        page.wait_for_timeout(320)
    settle(page, 3000)


@beat("4b. Parts list")
def beat_bom(page):
    click_tray_tab(page, "BOM")
    settle(page, 2500)
    for y in (760, 810, 860, 910):
        page.mouse.move(1000, y)
        page.wait_for_timeout(300)
    settle(page, 3000)


@beat("4c. Special processes")
def beat_special(page):
    click_tray_tab(page, "Special process")
    settle(page, 2500)
    page.mouse.move(1000, 780)
    settle(page, 1200)
    page.mouse.move(1000, 820)
    settle(page, 3500)


def blur_title_block(page, on=True):
    """Keep the drawing's bottom-right corner masked, continuously.

    The customer's title block is printed into the page image itself, so unlike
    the Customer field it cannot be removed in the database -- it has to be
    covered on screen.

    This installs a ticker rather than positioning the mask once, because every
    one-shot attempt left a window open: the 2D viewer opens on whichever sheet
    was last shown, "Converted" keeps rendering the original image for several
    seconds after the toggle, the balloon viewer renders the original sheet
    outright, and turning a page or zooming moves the image under the mask.
    Frame checks caught the logo three separate times that way. A 150 ms
    re-anchor has no window to miss.

    Masks whatever drawing image is on screen, including the converted sheet.
    Whether a given frame is safe is not something worth assuming.
    """
    set_mask(page, twod=on, balloon=on)


def install_mask_css(page):
    """Declare the mask once; switch it per viewer with a class on <html>.

    CSS, not a JS ticker. Every scripted attempt left the logo visible for
    seconds at a time, and chasing it with timers meant re-checking frames after
    every change. A pseudo-element on the image's own container cannot be
    mistimed, survives the widget re-rendering, and -- sized in percentages of a
    container the viewer already scales -- tracks zoom and page turns for free.

    Two switches rather than one, because the CONVERTED sheet must be shown
    bare: it carries our title block, which is the whole point of that beat.
    """
    page.add_style_tag(content="""
        #ab-canvas-container { position: relative; }
        .v2-surface { position: relative; }
        html.mask-2d .v2-surface::after,
        html.mask-balloon #ab-canvas-container::after {
            content: '';
            position: absolute;
            right: 0; bottom: 0;
            width: 42%; height: 30%;
            background: #f2f2f2;
            border: 1px solid #d8d8d8;
            z-index: 99999;
            pointer-events: none;
        }
    """)


def set_mask(page, twod=None, balloon=None):
    page.evaluate("""([t, b]) => {
        const c = document.documentElement.classList;
        if (t !== null) c.toggle('mask-2d', t);
        if (b !== null) c.toggle('mask-balloon', b);
    }""", [twod, balloon])


def preload_converted_pages(page):
    """Warm the browser cache with the converted renders.

    Without this, clicking Converted leaves the viewer showing the original for
    several seconds while the new image downloads -- and since the mask has to
    stay up until the swap is real, the beat reads as "Converted, and blurred",
    which is precisely the thing that beat exists to disprove.

    Fetched straight from the URL pattern rather than by driving the toggle, so
    nothing flickers on screen. Extension is not assumed: originals are .png and
    the converted renders are .jpg, so both are tried and the misses cost
    nothing but a 404.
    """
    page.evaluate("""() => {
        const img = document.querySelector('.v2-image');
        if (!img || !img.src) return 0;
        const m = img.src.match(/^(.*\\/Drawing\\/\\d+\\/)Image\\/(.*)_Page_\\d+\\.\\w+$/);
        if (!m) return 0;
        let n = 0;
        for (let i = 1; i <= 9; i++) {
            for (const ext of ['jpg', 'png']) {
                const p = new Image();
                p.src = `${m[1]}ConvertedDrawing/Image/${m[2]}_Page_${i}.${ext}`;
                n++;
            }
        }
        return n;
    }""")


def wait_for_converted_image(page, timeout=15000):
    """Block until the viewer is really showing the converted render.

    Toggling to Converted does not swap the image immediately -- for several
    seconds the 2D viewer is still displaying the original, customer title block
    and all. Frame checks caught exactly that. The converted pages live under
    .../ConvertedDrawing/..., so the src is the reliable signal that it is safe
    to lift the mask.
    """
    page.wait_for_function(
        """() => {
            const img = document.querySelector('.v2-image');
            return !!img && /ConvertedDrawing/i.test(img.src) && img.complete;
        }""", timeout=timeout)


@beat("5. Priced as -> choose a material")
def beat_material(page):
    # Serenity's LookupEditor is a select2: the <input> it wraps is parked
    # off-screen at 0,0 with zero width, so it can never be clicked. The visible
    # control is the .select2-choice anchor, and typing goes into the search box
    # that select2 drops into the document body when it opens.
    choice = page.locator(".cw-material-editor .select2-choice").first
    choice.scroll_into_view_if_needed()
    settle(page, 1500)
    choice.click()
    settle(page, 1800)

    search = page.locator(".select2-drop-active input[type=text], "
                          ".select2-drop input.select2-input").first
    search.type("AL 6061", delay=130)

    # Wait for a real result, not the "Searching..." placeholder select2 shows
    # while the lookup is in flight.
    page.wait_for_function(
        """() => {
            const li = document.querySelectorAll('.select2-results li');
            if (!li.length) return false;
            return ![...li].some(e => /searching|loading/i.test(e.textContent));
        }""", timeout=15000)
    settle(page, 1200)
    # Enter, not a click on the result. select2 highlights the first match as
    # you type, and it covers the page with .select2-drop-mask while open --
    # a click aimed at the list can land on that mask instead, leaving the
    # dropdown up, which then swallowed Save and the whole next beat.
    page.keyboard.press("Enter")
    page.wait_for_function(
        "() => !document.querySelector('.select2-drop-mask')", timeout=10000)
    settle(page, 2500)

    page.locator("#cw-save").first.click()
    settle(page, 7000)


@beat("5. Original sheet, title block masked")
def beat_original(page):
    page.keyboard.press("Escape")
    page.evaluate("() => document.querySelector('.select2-drop-mask')?.remove()")
    settle(page, 800)
    # Declare and arm the mask BEFORE the drawing can appear.
    install_mask_css(page)
    set_mask(page, twod=True, balloon=True)
    page.locator(".cw-doc-badge:has-text('2D'), .cw-doc:has-text('2D')").first.click()
    settle(page, 4000)
    page.locator(":text-is('Original')").first.click()
    settle(page, 2000)
    # Warm the converted renders now, while the original is on screen, so the
    # next beat's toggle swaps instantly instead of sitting masked.
    preload_converted_pages(page)
    settle(page, 4000)


@beat("5b. Converted sheet")
def beat_converted(page):
    page.locator(":text-is('Converted')").first.click()
    # Cached by now, so this returns almost immediately and the masked window is
    # a few hundred milliseconds rather than the six seconds it used to be.
    wait_for_converted_image(page)
    settle(page, 400)
    set_mask(page, twod=False)
    settle(page, 8000)


@beat("6. Balloons")
def beat_balloons(page):
    # Back on for the balloon viewer: it renders the ORIGINAL sheet even when
    # its own Original/Converted toggle says Converted, so the customer's block
    # is live there regardless.
    set_mask(page, twod=True, balloon=True)
    page.locator("button:has-text('Balloon')").first.click()
    settle(page, 5000)

    for _ in range(2):
        nxt = page.locator("#btn-next-page")
        if nxt.count() and not nxt.first.is_disabled():
            nxt.first.click()
            settle(page, 2800)

    vp = page.locator("#ab-viewport").first.bounding_box()
    if vp:
        page.mouse.move(vp["x"] + vp["width"] / 2, vp["y"] + vp["height"] / 2)
        for _ in range(4):
            page.mouse.wheel(0, -220)
            page.wait_for_timeout(500)
    settle(page, 3500)


@beat("6b. Clear the mask before leaving the drawing")
def beat_unmask(page):
    blur_title_block(page, False)
    settle(page, 500)


def redact_customer_cells(page):
    """Blank any grid cell naming the customer.

    The File Library lists every file in the system, not just part 12, so the
    Customer column still shows the name on the other parts -- the database
    change was scoped to part 12 on purpose. A grid is static text, so unlike
    the drawing it can simply be rewritten in place.

    Re-applied after the search, because the grid re-renders its rows.
    """
    page.evaluate("""() => {
        const hit = /APPLIED\\s*MATERIALS/i;
        document.querySelectorAll('.slick-cell').forEach(c => {
            if (hit.test(c.textContent)) {
                c.textContent = '';
                c.style.background = '#f2f2f2';
            }
        });
    }""")


@beat("7. File Library search")
def beat_files(page):
    page.goto(f"{BASE}/Costing/Files", wait_until="networkidle")
    settle(page, 3000)
    redact_customer_cells(page)          # before the grid is on screen long
    settle(page, 1500)
    box = page.locator(".s-DataGrid .s-QuickSearchInput, "
                       ".grid-container .s-QuickSearchInput").first
    box.click()
    box.type("0043-07547", delay=140)
    settle(page, 3000)
    redact_customer_cells(page)          # the search re-rendered the rows
    settle(page, 3000)


@beat("8. Dashboard")
def beat_dashboard(page):
    page.goto(f"{BASE}/", wait_until="networkidle")
    settle(page, 5000)
    page.mouse.wheel(0, 300)
    settle(page, 3500)


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={"width": W, "height": H},
                        record_video_dir=OUT_DIR,
                        record_video_size={"width": W, "height": H})
    # Playwright starts the recording with the context, so this is frame zero.
    _t0 = time.time()
    page = ctx.new_page()

    print("logging in (not recorded as a beat, but it is in the file)...")
    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)

    # beat_material is deliberately NOT in this list. Serenity's LookupEditor is
    # a select2 whose real input sits off-screen at 0,0 and which masks the page
    # while open; driving it headlessly proved unreliable, and a half-open
    # dropdown then broke the balloon beat after it. Picking the material is one
    # click for a presenter and it is the better live moment anyway -- it is
    # step 5 in the script, done by hand.
    print("recording:")
    for fn in (beat_library, beat_open, beat_3d,
               beat_costing, beat_bom, beat_special,
               beat_original, beat_converted, beat_balloons, beat_unmask,
               beat_files, beat_dashboard):
        fn(page)

    video = page.video.path() if page.video else None
    ctx.close()          # the file is only finalised here
    b.close()

TIMELINE_PATH = r"C:\Aizera\DSRFQ\.mssql-scripts\demo-timeline.json"
with open(TIMELINE_PATH, "w", encoding="utf-8") as fh:
    json.dump(TIMELINE, fh, indent=2)
print(f"\ntimeline -> {TIMELINE_PATH}")
for b_ in TIMELINE:
    print(f"  {b_['start']:>6.1f} - {b_['end']:>6.1f}s  {b_['name']}")

if video and os.path.exists(video):
    shutil.move(video, FINAL)
    size = os.path.getsize(FINAL) / 1024 / 1024
    print(f"\nwrote {FINAL}  ({size:.1f} MB)")
else:
    print("\nno video file was produced")
    sys.exit(1)
