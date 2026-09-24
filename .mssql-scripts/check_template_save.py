"""Saving a drawing-conversion template works, including the only-template case.

The demote query in ToolTemplateConversionSaveHandler.BeforeSave clears Default
on every OTHER row. SqlUpdate.Execute expects exactly one affected row by
default, so when there is nothing to demote -- one template, already the
default -- it threw "Query affected 0 rows while 1 expected!" and no template
could be saved at all.

Covers: save unchanged, edit the new Replace With field, and the two-template
handover where the demote genuinely does match a row.

    python .mssql-scripts/check_template_save.py
"""

import json
import sys
import time

import pyodbc
import yaml
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5001"
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

original = cur.execute(
    "SELECT ReplacementText FROM dbo.ToolTemplateConversion WHERE ID = 1").fetchval()
extra_id = None

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page()
    page.goto(f"{BASE}/Account/Login", wait_until="networkidle")
    page.fill("input[name=Username]", "admin")
    page.fill("input[name=Password]", "serenity")
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    def call(url, payload):
        return page.evaluate(
            """async ([u, p]) => {
                const m = document.cookie.match(/(?:^|;\\s*)CSRF-TOKEN=([^;]+)/);
                const h = {'Content-Type': 'application/json'};
                if (m) h['X-CSRF-TOKEN'] = decodeURIComponent(m[1]);
                const r = await fetch(u, {method:'POST', headers:h, body: JSON.stringify(p)});
                const t = await r.text();
                let j; try { j = JSON.parse(t); } catch(e) { j = {raw: t.slice(0,300)}; }
                return [r.status, j];
            }""", [url, payload])

    def msg(body):
        return (body.get("Error") or {}).get("Message", "")[:110]

    code, body = call("/Services/Master/ToolTemplateConversion/Retrieve", {"EntityId": 1})
    check("the template can be retrieved", code == 200, msg(body))
    entity = body.get("Entity", {})

    print()
    print("=" * 74)
    print("1. The only template, already the default")
    print("=" * 74)

    code, body = call("/Services/Master/ToolTemplateConversion/Update",
                      {"EntityId": 1, "Entity": entity})
    check("saving it unchanged succeeds", code == 200, f"HTTP {code} {msg(body)}")

    code, body = call("/Services/Master/ToolTemplateConversion/Update",
                      {"EntityId": 1, "Entity": {"Id": 1, "ReplacementText": "ACME"}})
    check("editing Replace With succeeds", code == 200, f"HTTP {code} {msg(body)}")
    got = cur.execute("SELECT ReplacementText FROM dbo.ToolTemplateConversion "
                      "WHERE ID = 1").fetchval()
    check("the new value was stored", got == "ACME", repr(got))

    code, body = call("/Services/Master/ToolTemplateConversion/Update",
                      {"EntityId": 1, "Entity": {"Id": 1, "ReplacementText": original,
                                                 "Default": True}})
    check("saving with Default ticked succeeds", code == 200, f"HTTP {code} {msg(body)}")

    print()
    print("=" * 74)
    print("2. Two templates: the handover the demote exists for")
    print("=" * 74)

    code, body = call("/Services/Master/ToolTemplateConversion/Create",
                      {"Entity": {"Name": "check_template_save temp",
                                  "ReplacementText": "TEMP", "Default": True}})
    check("a second template can be created as default", code == 200,
          f"HTTP {code} {msg(body)}")
    extra_id = body.get("EntityId")
    print(f"  created template {extra_id}")

    if extra_id:
        rows = cur.execute(
            "SELECT ID, [Default] FROM dbo.ToolTemplateConversion "
            "WHERE IsActive = 1 ORDER BY ID").fetchall()
        for r in rows:
            print(f"    template {r[0]}: Default = {r[1]}")
        check("exactly one row is the default",
              sum(1 for r in rows if r[1] == 1) == 1,
              str([(r[0], r[1]) for r in rows]))
        check("the new one took it over",
              next(r[1] for r in rows if r[0] == extra_id) == 1)

        # Hand it back -- this time the demote DOES match a row.
        code, body = call("/Services/Master/ToolTemplateConversion/Update",
                          {"EntityId": 1, "Entity": {"Id": 1, "Default": True}})
        check("handing default back succeeds", code == 200, f"HTTP {code} {msg(body)}")
        rows = cur.execute(
            "SELECT ID, [Default] FROM dbo.ToolTemplateConversion "
            "WHERE IsActive = 1 ORDER BY ID").fetchall()
        check("still exactly one default after the handover",
              sum(1 for r in rows if r[1] == 1) == 1,
              str([(r[0], r[1]) for r in rows]))
        check("it is template 1 again",
              next(r[1] for r in rows if r[0] == 1) == 1)

        call("/Services/Master/ToolTemplateConversion/Delete", {"EntityId": extra_id})
        print(f"  deleted template {extra_id}")

    b.close()

cur.execute("UPDATE dbo.ToolTemplateConversion SET ReplacementText = ? WHERE ID = 1",
            original)
conn.commit()
back = cur.execute("SELECT ReplacementText, [Default] FROM dbo.ToolTemplateConversion "
                   "WHERE ID = 1").fetchone()
print(f"\nrestored: ReplacementText={back[0]!r} Default={back[1]}")
check("the template was restored", back[0] == original and back[1] == 1)
conn.close()

print()
print("all good" if not failures else f"{len(failures)} failure(s): "
      + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
