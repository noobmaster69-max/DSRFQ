"""Static checks on the visit-plan punch photo change.

The visual proof needs a DS_ERP login I do not have, so this at least confirms
the built bundle carries the new markup and none of the old, and that the CSS
that sizes it is present and parses.

    python .mssql-scripts/check_visit_punch_photo.py
"""

import io
import os
import re
import sys

WEB = r"C:\Aizera\DSEFACTORY\DS_ERP\DS_ERP.Web"
CSS = os.path.join(WEB, "wwwroot", "Content", "site", "site-map.css")
SRC = os.path.join(WEB, "Modules", "HumanResource", "VisitPlans",
                   "VisitStopsPlannerEditor.ts")
ESM = os.path.join(WEB, "wwwroot", "esm")

fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + str(detail) if detail else ''}")
    if not ok:
        fails.append(name)


print("1. the source")
src = io.open(SRC, encoding="utf-8").read()
check("the 'View photo' link is gone", "'View photo'" not in src
      and '"View photo"' not in src)
check("an <img> is rendered instead", 'img class="vsp-punch-photo"' in src)
check("it uses uploadUrl, not a hardcoded /upload/",
      "'/upload/' + punch.Picture" not in src and "uploadUrl(punch.Picture)" in src)
check("a missing photo is stated, not left blank", "vsp-punch-nophoto" in src)

print("\n2. the built bundle")
built = []
for root, _dirs, files in os.walk(ESM):
    for f in files:
        if f.endswith(".js"):
            p = os.path.join(root, f)
            try:
                t = io.open(p, encoding="utf-8", errors="ignore").read()
            except OSError:
                continue
            if "vsp-punch-photo" in t:
                built.append((p, t))
check("the bundle was rebuilt with it", len(built) > 0, f"{len(built)} file(s)")
if built:
    joined = "\n".join(t for _p, t in built)
    check("no 'View photo' text survives in the build", "View photo" not in joined)
    check("the img class is in the build", 'img class="vsp-punch-photo"' in joined)
    for p, _t in built[:3]:
        print(f"        {os.path.relpath(p, WEB)}")

print("\n3. the css")
css = io.open(CSS, encoding="utf-8").read()
check("braces balance", css.count("{") == css.count("}"),
      f'{css.count("{")} open / {css.count("}")} close')
for rule in (".vsp-punch-photo", ".vsp-punch-nophoto",
             "grid-template-areas", "clamp(26rem"):
    check(f"css carries {rule}", rule in css)
# The two numbers the complaint is actually about.
m = re.search(r"\.vsp-body\s*\{[^}]*height:\s*([^;]+);", css, re.S)
print(f"        vsp-body height   : {m.group(1).strip() if m else 'NOT FOUND'}")
check("the 400px fixed height is gone", "height: 400px" not in css)
m = re.search(r"\.vsp-list-pane\s*\{[^}]*flex:\s*([^;]+);", css, re.S)
print(f"        vsp-list-pane flex: {m.group(1).strip() if m else 'NOT FOUND'}")
check("the list pane was widened past 23rem", "flex: 0 0 23rem" not in css)
m = re.search(r"\.vsp-punch-photo\s*\{[^}]*width:\s*([^;]+);", css, re.S)
print(f"        photo size        : {m.group(1).strip() if m else 'NOT FOUND'}")

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
