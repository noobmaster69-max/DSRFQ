"""ApplyMaterial: picking "Priced as" writes the material line.

Drives the real endpoint over HTTP against a real part, then restores whatever
the part had before. Covers the three outcomes that matter: a material with a
price, clearing it, and a material with no price row.

    python .mssql-scripts/check_apply_material.py [partId]
"""

import sys

import pyodbc
import yaml
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
USER, PASSWORD = "admin", "serenity"
PART = int(sys.argv[1]) if len(sys.argv) > 1 else 15

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


with open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)
d = cfg["Database"]
conn = pyodbc.connect("DRIVER={" + d["Driver"] + "};"
                      f"SERVER={d['Server']};DATABASE={d['Database']};"
                      f"UID={d['Uid']};PWD={d['Pwd']}")
cur = conn.cursor()


def part_state():
    r = cur.execute(
        "SELECT MaterialID, CAST(GrossWeight AS float), CAST(NetWeight AS float) "
        "FROM dbo.CostingParts WHERE ID = ?", PART).fetchone()
    return r[0], r[1], r[2]


def material_line():
    return cur.execute(
        "SELECT CAST(Quantity AS float), CAST(UnitPrice AS float), "
        "CAST(Total AS float), Description "
        "FROM dbo.CostingPartCostingResults "
        "WHERE CostingPartID = ? AND Name = 'Material Cost' AND IsActive = 1",
        PART).fetchone()


before_mat, before_gross, before_net = part_state()
before_line = material_line()
print(f"part {PART} before: MaterialID={before_mat} gross={before_gross} "
      f"line={'yes' if before_line else 'none'}")

# Driven from inside the browser rather than with requests: the login form
# carries an antiforgery token, so a plain POST to /Account/Login gets a 400
# and every subsequent service call is unauthenticated.
_pw = sync_playwright().start()
_browser = _pw.chromium.launch(headless=True)
_page = _browser.new_page()
_page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
_page.fill("input[name=Username]", USER)
_page.fill("input[name=Password]", PASSWORD)
_page.click("button[type=submit]")
_page.wait_for_load_state("networkidle")
_page.wait_for_timeout(1200)


def apply(material_id):
    """POST to ApplyMaterial with Serenity's antiforgery header.

    The CSRF-TOKEN cookie has to be echoed back as X-CSRF-TOKEN or every
    service endpoint answers 400 with an empty body -- which looks exactly
    like an unregistered route.
    """
    return _page.evaluate(
        """async ([part, mat]) => {
            const m = document.cookie.match(/(?:^|;\\s*)CSRF-TOKEN=([^;]+)/);
            const h = {'Content-Type': 'application/json'};
            if (m) h['X-CSRF-TOKEN'] = decodeURIComponent(m[1]);
            const r = await fetch('/Services/Costing/CostingParts/ApplyMaterial', {
                method: 'POST', headers: h,
                body: JSON.stringify({CostingPartId: part, MaterialId: mat})
            });
            // Read the body once -- calling .text() after .json() throws
            // "body stream already read" and masks the real status.
            const text = await r.text();
            let body;
            try { body = JSON.parse(text); } catch (e) { body = {raw: text.slice(0, 300)}; }
            return [r.status, body];
        }""", [PART, material_id])


print("\n=== 1. price it as SS 316L (id 6, 8.00 g/cm3, 7.20/kg) ===")
code, body = apply(6)
print(f"  HTTP {code}  {body.get('Message') or body.get('Error') or body}")
check("the call succeeded", code == 200 and "Error" not in body)

mat, gross, net = part_state()
line = material_line()
vol = cur.execute("SELECT CAST(GrossVolume AS float) FROM dbo.CostingParts "
                  "WHERE ID = ?", PART).fetchval()
expect_gross = round(vol * 8.0 / 1_000_000, 4)

print(f"  gross weight  {gross}  (volume {vol:,.0f} mm3 x 8.00 g/cm3 -> {expect_gross})")
check("MaterialID was set", mat == 6, str(mat))
check("gross weight was recomputed from density",
      abs(gross - expect_gross) < 0.01, f"{gross} vs {expect_gross}")
check("a material line exists", line is not None)
if line:
    print(f"  line: qty {line[0]} x {line[1]} = {line[2]}  [{line[3]}]")
    check("the line is quoted on gross weight", abs(line[0] - gross) < 0.01)
    check("the rate is the material's price", abs(line[1] - 7.20) < 0.001, str(line[1]))
    check("total is weight x rate",
          abs(line[2] - round(line[0] * line[1], 2)) < 0.02, str(line[2]))

print("\n=== 2. switching material re-prices rather than duplicating ===")
code, body = apply(1)          # AL 6061-T6, 2.70 g/cm3, 6.50/kg
print(f"  HTTP {code}  {body.get('Message') or body.get('Error')}")
n = cur.execute("SELECT COUNT(*) FROM dbo.CostingPartCostingResults "
                "WHERE CostingPartID = ? AND Name = 'Material Cost' AND IsActive = 1",
                PART).fetchval()
check("still exactly one active material line", n == 1, f"{n}")
line = material_line()
_, gross2, _ = part_state()
if line:
    print(f"  line: qty {line[0]} x {line[1]} = {line[2]}")
    check("weight followed the new density",
          abs(gross2 - round(vol * 2.70 / 1_000_000, 4)) < 0.01, str(gross2))
    check("rate followed the new material", abs(line[1] - 6.50) < 0.001, str(line[1]))

print("\n=== 3. clearing the material drops the line ===")
code, body = apply(None)
print(f"  HTTP {code}  {body.get('Message') or body.get('Error')}")
check("the call succeeded", code == 200 and "Error" not in body)
check("no material line remains", material_line() is None)
mat, _, _ = part_state()
check("MaterialID was cleared", mat is None, str(mat))

print("\n=== 4. a material with no price is refused, not priced at zero ===")
unpriced = cur.execute(
    "SELECT TOP 1 m.ID, m.Name FROM dbo.Materials m "
    "LEFT JOIN dbo.MaterialRawMaterialCosts c ON c.MaterialID = m.ID AND c.IsActive = 1 "
    "WHERE m.IsActive = 1 AND c.ID IS NULL").fetchone()
if unpriced:
    code, body = apply(unpriced[0])
    msg = body.get("Error", {}).get("Message") if isinstance(body.get("Error"), dict) else body.get("Message")
    print(f"  {unpriced[1]}: HTTP {code}  {msg}")
    check("an unpriced material is rejected",
          code != 200 or "Error" in body, f"HTTP {code}")
    check("no zero-value line was written", material_line() is None)
else:
    print("  every material has a price row; nothing to test")

# --- restore -------------------------------------------------------------
print("\n=== restoring ===")
apply(before_mat) if before_mat else apply(None)
cur.execute("UPDATE dbo.CostingParts SET GrossWeight = ?, NetWeight = ? WHERE ID = ?",
            before_gross, before_net, PART)
conn.commit()
mat, gross, _ = part_state()
print(f"  MaterialID={mat} gross={gross} line={'yes' if material_line() else 'none'}")
check("the part was restored", mat == before_mat and abs((gross or 0) - (before_gross or 0)) < 0.01)

conn.close()
_browser.close()
_pw.stop()
print()
print("all good" if not failures else f"{len(failures)} failure(s): " + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
