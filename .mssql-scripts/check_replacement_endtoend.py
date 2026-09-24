"""End-to-end: change "Replace With", re-run the drawing, see it in the output.

Sets the default template's ReplacementText to a distinctive word, re-queues
part 15's drawing conversion, waits for it, and reads the converted PDF back to
confirm the word actually landed on the sheet. Restores the original value
whatever happens.

    python .mssql-scripts/check_replacement_endtoend.py
"""

import os
import subprocess
import sys
import time

import fitz
import pyodbc
import yaml

PART = 15
MARKER = "ZEBRAWORKS"
CONVERTED = rf"C:\Aizera\RPA\RFQ\ConvertedDrawing\{PART}"
REQUEUE = r"C:\Aizera\DSRFQ\.mssql-scripts\requeue-drawing.sql"

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
    "SELECT ReplacementText FROM dbo.ToolTemplateConversion "
    "WHERE [Default] = 1 AND IsActive = 1").fetchval()
print(f"template's current Replace With: {original!r}")

pdf_before = os.path.join(CONVERTED, next(
    f for f in os.listdir(CONVERTED) if f.lower().endswith(".pdf")))
mtime_before = os.path.getmtime(pdf_before)

try:
    cur.execute("UPDATE dbo.ToolTemplateConversion SET ReplacementText = ? "
                "WHERE [Default] = 1 AND IsActive = 1", MARKER)
    conn.commit()
    print(f"set to {MARKER!r}\n")

    out = subprocess.run(
        ["sqlcmd", "-S", "deskdev,65001", "-U", "sa", "-P", "Tsh9989",
         "-C", "-W", "-l", "60", "-i", REQUEUE],
        capture_output=True, text=True, timeout=120)
    print(out.stdout.strip())
    item = [l for l in out.stdout.splitlines() if l.strip().startswith("queued")]
    check("the drawing job was queued", bool(item), out.stderr[:200])

    print("\nwaiting for the re-run...")
    status = None
    for _ in range(90):
        time.sleep(10)
        status = cur.execute(
            "SELECT TOP 1 Status FROM dbo.CostingPartQueue "
            "WHERE CostingPartID = ? AND Lane = 'drawing' ORDER BY ID DESC",
            PART).fetchval()
        if status in ("completed", "failed", "cancelled"):
            break
        print(f"  {status}...")
    print(f"  -> {status}")
    check("the re-run completed", status == "completed", str(status))

    # The converted PDF must have been rewritten.
    pdf_after = os.path.join(CONVERTED, next(
        f for f in os.listdir(CONVERTED) if f.lower().endswith(".pdf")))
    check("the converted PDF was rewritten",
          os.path.getmtime(pdf_after) > mtime_before,
          time.strftime("%H:%M:%S", time.localtime(os.path.getmtime(pdf_after))))

    doc = fitz.open(pdf_after)
    hits, amat = 0, 0
    for page in doc:
        text = page.get_text()
        hits += text.upper().count(MARKER)
        amat += text.upper().count("APPLIED MATERIALS")
    doc.close()

    print(f"\n  {MARKER} on the converted sheet : {hits} time(s)")
    print(f"  'APPLIED MATERIALS' remaining   : {amat} time(s)")
    check(f"the configured word reached the drawing", hits > 0, f"{hits}")

finally:
    cur.execute("UPDATE dbo.ToolTemplateConversion SET ReplacementText = ? "
                "WHERE [Default] = 1 AND IsActive = 1", original)
    conn.commit()
    back = cur.execute(
        "SELECT ReplacementText FROM dbo.ToolTemplateConversion "
        "WHERE [Default] = 1 AND IsActive = 1").fetchval()
    print(f"\nrestored to {back!r}")
    check("the template was restored", back == original, repr(back))
    conn.close()

print()
print("all good" if not failures else f"{len(failures)} failure(s): "
      + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
