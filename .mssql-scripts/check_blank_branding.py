"""The DSRFQ logo and favicon are blank (transparent), layout unchanged.

Login page and the sidebar after signing in: every .s-site-logo-img loads the
transparent blank-logo.png, and the favicon served is fully transparent.
Read-only.

    python check_blank_branding.py
"""
import io
import os
import sys

import requests
from PIL import Image
from playwright.sync_api import sync_playwright

BASE = os.environ.get("DSRFQ_BASE", "http://127.0.0.1:5001")
HERE = os.path.dirname(os.path.abspath(__file__))
fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


fav = Image.open(io.BytesIO(requests.get(f"{BASE}/favicon.ico?v=blank", timeout=30).content)).convert("RGBA")
check("favicon is fully transparent", fav.getchannel("A").getextrema()[1] == 0, fav.size)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1400, "height": 900})
    pg.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    logos = pg.evaluate("""() => [...document.querySelectorAll('.s-site-logo-img')].map(e => getComputedStyle(e).content)""")
    bg = pg.evaluate("""() => [...document.querySelectorAll('.s-site-logo-img')].map(e => getComputedStyle(e).backgroundColor)""")
    check("no coloured disc behind the login logo", all(c in ("rgba(0, 0, 0, 0)", "transparent") for c in bg), bg)
    check("login page logo uses the blank image", bool(logos) and all("blank-logo.png" in c for c in logos), logos)
    pg.screenshot(path=os.path.join(HERE, "shots", "branding_login.png"))
    pg.get_by_placeholder("user name").fill("admin")
    pg.get_by_placeholder("password").fill("serenity")
    pg.get_by_role("button", name="Sign In").click()
    pg.wait_for_url(lambda u: "/Account/Login" not in u, timeout=60000)
    pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(1500)
    logos = pg.evaluate("""() => [...document.querySelectorAll('.s-site-logo-img')].map(e => getComputedStyle(e).content)""")
    check("sidebar logo uses the blank image", bool(logos) and all("blank-logo.png" in c for c in logos), logos)
    icon = pg.evaluate("document.querySelector('link[rel=icon]')?.getAttribute('href')")
    check("page links the new favicon", icon and "v=blank" in icon, icon)
    pg.screenshot(path=os.path.join(HERE, "shots", "branding_sidebar.png"))
    b.close()

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
