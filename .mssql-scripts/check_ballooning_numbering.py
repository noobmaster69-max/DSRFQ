"""Does the sub-number survive a server-side reorder?

The reorder in RPA/API/BalloonPosition.py renumbers a whole page from a
counter. Before this change it gave every item its own integer, which turned
5-1 into a plain 6 and pushed everything after it along by one - the exact
thing a sub-number exists to prevent.

Runs the real recalculate_balloon_position against a synthetic page.

    python .mssql-scripts/check_ballooning_numbering.py
"""

import os
import sys

API = r"C:\Aizera\RPA\API"
sys.path.insert(0, API)
os.chdir(API)

fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + detail if detail else ''}")
    if not ok:
        fails.append(name)


def ann(_id, number, sub=None, y=0.0, x=0.0, note=False, section=""):
    return {
        "id": _id, "balloonNumber": number, "subNumber": sub,
        "balloonX": x, "balloonY": y,
        "rect": {"x": x, "y": y, "width": 1.0, "height": 1.0},
        "content": f"dim {_id}", "originalContent": "", "type": "Dimension",
        "status": "Pending", "pageIndex": 0, "auto": True, "isNote": note,
        "section": section, "gridStart": "", "gridEnd": "", "viewId": 0,
    }


print("1. import the processor")
from BalloonPosition import SmartPositioner, GridSorter      # noqa: E402
sp = SmartPositioner()
check("SmartPositioner constructs", True)

print("\n2. reorder keeps children off the integer sequence")
# Three parents top-to-bottom, with two children hanging off the middle one.
page = [
    ann("a", 1, y=10.0),
    ann("b", 2, y=20.0),
    ann("b1", 2, sub=1, y=21.0),
    ann("b2", 2, sub=2, y=22.0),
    ann("c", 3, y=30.0),
]
out = {r["id"]: r for r in sp.recalculate_balloon_position(list(page))}
check("every balloon comes back", len(out) == 5, f"{len(out)} of 5")
got = {k: (v["balloonNumber"], v.get("subNumber")) for k, v in out.items()}
print(f"        {got}")

parents = sorted(v["balloonNumber"] for k, v in out.items()
                 if not v.get("subNumber"))
check("parents get a dense 1..N sequence", parents == [1, 2, 3], str(parents))
check("child b1 keeps its parent's number",
      out["b1"]["balloonNumber"] == out["b"]["balloonNumber"],
      f"{out['b1']['balloonNumber']} vs parent {out['b']['balloonNumber']}")
check("child b2 keeps its parent's number",
      out["b2"]["balloonNumber"] == out["b"]["balloonNumber"])
check("children keep their own sub index",
      (out["b1"]["subNumber"], out["b2"]["subNumber"]) == (1, 2))
check("the balloon after the children is the next integer, not +2",
      out["c"]["balloonNumber"] == out["b"]["balloonNumber"] + 1,
      f"c={out['c']['balloonNumber']}, b={out['b']['balloonNumber']}")

print("\n3. a reorder that actually moves things")
# Same page, but the numbers arrive shuffled relative to position.
shuffled = [
    ann("a", 7, y=10.0),
    ann("b", 3, y=20.0),
    ann("b1", 3, sub=1, y=21.0),
    ann("c", 5, y=30.0),
]
out2 = {r["id"]: r for r in sp.recalculate_balloon_position(list(shuffled))}
print(f"        {[(k, v['balloonNumber'], v.get('subNumber')) for k, v in out2.items()]}")
check("child follows its parent to the parent's NEW number",
      out2["b1"]["balloonNumber"] == out2["b"]["balloonNumber"],
      f"child={out2['b1']['balloonNumber']} parent={out2['b']['balloonNumber']}")
check("parents still dense",
      sorted(v["balloonNumber"] for k, v in out2.items()
             if not v.get("subNumber")) == [1, 2, 3])

print("\n4. an orphaned child keeps its own number")
orphan = [ann("a", 1, y=10.0), ann("x1", 9, sub=1, y=50.0)]
out3 = {r["id"]: r for r in sp.recalculate_balloon_position(list(orphan))}
check("orphan is not silently adopted by another balloon",
      out3["x1"]["balloonNumber"] == 9,
      f"got {out3['x1']['balloonNumber']}, expected the 9 it arrived with")

print("\n5. GridSorter still orders by the sheet's grid")
grid = GridSorter.parse_grid_system("F2", "A1")
check("F2->A1 parses", grid is not None, str(grid))
if grid:
    check("both axes read as descending",
          grid["row_direction"] == -1 and grid["col_direction"] == -1)
    k_placed = GridSorter.get_sort_key(
        {"Section": "D8", "ViewId": 0, "BBoxY1": 5.0, "BBoxX1": 5.0}, grid)
    k_unmatched = GridSorter.get_sort_key(
        {"Section": "UNMATCHED", "ViewId": 0, "BBoxY1": 1.0, "BBoxX1": 1.0}, grid)
    check("a placed cell sorts before an unmatched one",
          k_placed < k_unmatched, f"{k_placed} < {k_unmatched}")

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
