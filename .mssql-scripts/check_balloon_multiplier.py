"""Why is CostingPartBalloons.Multiplier always NULL?

Walks the chain a quantity prefix has to survive:

    recogniser text  ->  SmartPositioner.process_api_response   (RPA/API)
                     ->  the /ballooning/upload response
                     ->  handlers.py INSERT                     (RPA/RFQ)
                     ->  CostingPartBalloons.Multiplier

    python .mssql-scripts/check_balloon_multiplier.py
"""

import os
import re
import sys

API = r"C:\Aizera\RPA\API"
RFQ = r"C:\Aizera\RPA\RFQ"
sys.path.insert(0, API)
os.chdir(API)

fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + detail if detail else ''}")
    if not ok:
        fails.append(name)


print("1. the detector itself")
from BalloonPosition import OCRContentProcessor, SmartPositioner   # noqa: E402
d = OCRContentProcessor.detect_quantity_prefix

check('"4X Ø.250" -> 4', d("4X Ø.250")["quantity"] == 4, str(d("4X Ø.250")))
check('"2x50" -> 2', d("2x50")["quantity"] == 2)
check('"(3X)Ø10" -> 3', d("(3X)Ø10")["quantity"] == 3, str(d("(3X)Ø10")))
check('a plain dimension -> 1', d("Ø10.5")["quantity"] == 1)
# This is the one that matters for the live data.
bare = d("4X")
check('a BARE "4X" with nothing after it -> 1, not 4',
      bare["quantity"] == 1 and not bare["has_quantity"], str(bare))
print('        ^ requires "2 <= qty <= 99 and content"; a bare prefix has no'
      ' content,\n          so it can never become a multiplier on its own.')

print("\n2. does the API layer put Quantity on the item?")
positioner = SmartPositioner(canvas_width=3200, canvas_height=2133)
# The real response nests OCR under views[].ocr_results - see
# Bubble-V6/API_DOCUMENTATION.md. A flat rec_text at the top level is ignored
# and yields zero items.
payload = {
    "start": "A1", "end": "H8", "row": "char", "col": "num",
    "views": [{
        "view_id": 1,
        "core_bbox": [0, 0, 3200, 2133],
        "ocr_results": {
            "rec_text": ["4X Ø.250", "Ø10.5", "4X"],
            "rec_scores": [0.99, 0.99, 0.99],
            "rec_polys": [
                [[100, 100], [300, 100], [300, 160], [100, 160]],
                [[100, 300], [300, 300], [300, 360], [100, 360]],
                [[100, 500], [160, 500], [160, 560], [100, 560]],
            ],
            "type": ["normal", "normal", "normal"],
            "belong": ["D5", "D6", "D7"],
        },
    }],
    "tolerance": [], "notes": [], "border": [],
    "bom": [], "table": [], "table_info": {},
}
try:
    items = positioner.process_api_response(payload)
except Exception as exc:                                   # noqa: BLE001
    items = []
    check("process_api_response ran", False, str(exc)[:160])

if items:
    by_text = {str(i.get("Symbol", "")): i for i in items}
    print(f"        {len(items)} item(s): "
          + ", ".join(f"{k!r}->Qty={v.get('Quantity')}" for k, v in by_text.items()))
    check("every item carries a Quantity key",
          all("Quantity" in i for i in items))
    hit = next((v for k, v in by_text.items() if ".250" in k), None)
    check('the prefixed dimension reports 4',
          hit is not None and hit.get("Quantity") == 4,
          str(hit.get("Quantity")) if hit else "item not found")

print("\n3. does the consumer's INSERT carry it?")
src = open(os.path.join(RFQ, "handlers.py"), encoding="utf-8").read()
insert = re.search(r"INSERT INTO dbo\.CostingPartBalloons(.{0,700}?)\"\"\"",
                   src, re.S)
check("found the INSERT", insert is not None)
if insert:
    stmt = insert.group(1)
    cols = re.search(r"\((.*?)\)\s*VALUES", stmt, re.S).group(1)
    names = [c.strip() for c in cols.replace("\n", " ").split(",") if c.strip()]
    placeholders = re.search(r"VALUES\s*\((.*?)\)", stmt, re.S).group(1)
    n_q = placeholders.count("?")
    n_lit = len([x for x in placeholders.split(",")
                 if x.strip() and "?" not in x])
    check("Multiplier is one of the columns", "Multiplier" in names,
          f"{len(names)} columns")
    check("column count matches placeholders + literals",
          len(names) == n_q + n_lit,
          f"{len(names)} columns vs {n_q} '?' + {n_lit} literal")
    check("the value bound for it is the engine's Quantity",
          "_quantity_or_none(item.get(\"Quantity\"))" in src)

print("\n4. 1 must not be written as a multiplier")
# Up to the next top-level def, not the next blank line - a blank line inside
# the docstring would truncate it mid-string.
q = re.search(r"\ndef _quantity_or_none.*?(?=\n(?:def |class |@))", src, re.S)
check("_quantity_or_none exists", q is not None)
if q:
    ns = {}
    exec(compile(q.group(0), "handlers", "exec"), ns)     # noqa: S102
    f = ns["_quantity_or_none"]
    check("4 -> '4'", f(4) == "4")
    check("1 -> None (1 is the default, not a multiplier)", f(1) is None)
    check("0 -> None", f(0) is None)
    check("None -> None", f(None) is None)
    check("junk -> None", f("abc") is None)

print("\n5. what the live data actually looks like")
try:
    import pyodbc
    import yaml
    cfg = yaml.safe_load(open(os.path.join(RFQ, "config.yaml"), encoding="utf-8"))["Database"]
    cn = pyodbc.connect(
        f"DRIVER={{{cfg['Driver']}}};SERVER={cfg['Server']};DATABASE={cfg['Database']};"
        f"UID={cfg['Uid']};PWD={cfg['Pwd']};TrustServerCertificate=yes")
    cur = cn.cursor()
    total, nulls = cur.execute(
        "SELECT COUNT(*), SUM(CASE WHEN Multiplier IS NULL THEN 1 ELSE 0 END) "
        "FROM dbo.CostingPartBalloons WHERE IsActive = 1").fetchone()
    bare = cur.execute(
        "SELECT COUNT(*) FROM dbo.CostingPartBalloons WHERE IsActive = 1 "
        "AND ISNULL(IsNote,0)=0 AND LTRIM(RTRIM(Symbol)) LIKE '%[0-9]X' "
        "AND LEN(LTRIM(RTRIM(Symbol))) <= 4").fetchval()
    withcontent = cur.execute(
        "SELECT COUNT(*) FROM dbo.CostingPartBalloons WHERE IsActive = 1 "
        "AND ISNULL(IsNote,0)=0 AND Symbol LIKE '[0-9]X%' "
        "AND LEN(LTRIM(RTRIM(Symbol))) > 4").fetchval()
    print(f"        {total} active balloons, {nulls} with NULL Multiplier")
    print(f"        {bare} are a BARE quantity prefix on their own "
          f'("4X", "8X")')
    print(f"        {withcontent} carry a prefix WITH content "
          f'("4X Ø.250")')
    if withcontent == 0 and bare > 0:
        print("\n        So fixing the INSERT alone changes nothing for this\n"
              "        data: the recogniser is emitting the prefix as its own\n"
              "        box, and nothing merges it back onto the dimension.")
    cn.close()
except Exception as exc:                                   # noqa: BLE001
    print(f"        (could not read the database: {exc})")

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
