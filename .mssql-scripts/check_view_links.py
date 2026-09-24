"""Section / detail view detection (RPA/RFQ/view_links.py) on real drawings.

Draws what was found onto the page - label magenta, view blue, marks orange,
cutting line / detail circle red - into shots/vl_<part>_p<page>.png, and checks
part 42's SECTION A-A.

    python check_view_links.py              (part 42, plus renders of 11, 13, 37)
    python check_view_links.py 50 2         (render part 50 page 2)
"""
import glob
import os
import sys

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
import fitz  # noqa: E402

from view_links import find_view_links  # noqa: E402

fitz.TOOLS.mupdf_display_errors(False)
HERE = os.path.dirname(os.path.abspath(__file__))
fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


def pdf_of(part):
    return glob.glob(rf"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\{part}\*.pdf")[0]


def render(part, pageno):
    d = fitz.open(pdf_of(part))
    links = find_view_links(d)
    p = d[pageno - 1]
    W, H = p.rect.width, p.rect.height
    R = lambda r: fitz.Rect(r["x1"] * W / 100, r["y1"] * H / 100, r["x2"] * W / 100, r["y2"] * H / 100)
    for l in links:
        if l["page"] == pageno:
            if l["view"]:
                p.draw_rect(R(l["view"]), color=(0, 0.5, 1), width=3)
            p.draw_rect(R(l["label"]), color=(1, 0, 1), width=3)
        if l["markPage"] == pageno:
            for m in l["marks"]:
                p.draw_rect(R(m), color=(1, 0.4, 0), width=3)
            if l["line"]:
                p.draw_rect(R(l["line"]), color=(0.9, 0, 0), width=2)
    out = os.path.join(HERE, "shots", f"vl_{part}_p{pageno}.png")
    p.get_pixmap(dpi=40).save(out)
    print(f"  rendered {out}")
    return links


if len(sys.argv) > 1:
    # python check_view_links.py 13 37:1 11:2   - render and list, no checks
    for arg in sys.argv[1:]:
        part, _, page = arg.partition(":")
        for l in render(part, int(page or 1)):
            print(f"    {l['title']:<13} label p{l['page']}  view {'yes' if l['view'] else 'NO '}"
                  f"  marks p{l['markPage']} x{len(l['marks'])}  line {'yes' if l['line'] else 'no'}")
    sys.exit(0)

print("part 42")
links = render(42, 1)
a = [l for l in links if l["title"] == "SECTION A-A"]
check("SECTION A-A found once", len(a) == 1, [l["title"] for l in links])
if a:
    a = a[0]
    check("both cutting-plane letters found", len(a["marks"]) == 2, a["marks"])
    check("cutting line found, between the letters", a["line"] and a["line"]["y1"] < 50 and a["line"]["y2"] > 56, a["line"])
    v = a["view"]
    check("view is the side view above the label", v and v["y2"] <= a["label"]["y1"] + 1 and v["y1"] > 70, v)
    # Ø1.34 sits right of the section, around x 30.5%, y 87.5% of the page.
    check("view takes in its dimensions (Ø1.34, Ø3.00)", v and v["x2"] > 31 and v["x1"] < 24, v)
    check("but not the front view's 2X Ø.330 (y 75%)", v and v["y1"] > 77, v)
print("\npart 54 (cuts drawn as the part's thin centre lines, letters beside them)")
links = {l["title"]: l for l in render(54, 1)}
for t in ("SECTION A-A", "SECTION B-B"):
    l = links.get(t)
    check(f"{t}: both letters and the line", bool(l) and len(l["marks"]) == 2 and bool(l["line"]), l and l["marks"])
v = (links.get("SECTION A-A") or {}).get("view") or {}
# ".300" sits left of the A-A strip at about x 77%, "1.875" right of it at 88%.
check("A-A's view takes in .300 / .600 / 1.875", v.get("x1", 100) < 77 and v.get("x2", 0) > 88, v)
v = (links.get("SECTION B-B") or {}).get("view") or {}
check("B-B's view is the hatched strip, not only its dimensions", v.get("y1", 100) < 8, v)

print("\npart 37: A-A's real letters are vector glyphs - no link rather than a wrong one")
links = {l["title"]: l for l in render(37, 1)}
check("A-A not linked", not links["SECTION A-A"]["marks"], links["SECTION A-A"]["marks"])

for part, page in [(11, 2), (13, 1)]:
    render(part, page)

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
