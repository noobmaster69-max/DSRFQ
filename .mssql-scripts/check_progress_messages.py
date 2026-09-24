"""Progress messages are fit for a grid cell, and the upload refreshes the grid.

Two complaints:
  * the messages RFQ publishes to the Progress topic were written for a console
    -- "Thread for part 15: ...", terminal colour codes, raw tracebacks
  * uploading a drawing did not make the new rows appear

    python .mssql-scripts/check_progress_messages.py
"""

import ast
import re
import sys

HANDLERS = r"C:\Aizera\RPA\RFQ\handlers.py"
GRID = (r"C:\Aizera\DSRFQ\DSRFQ.Web\Modules\Costing\CostingParts"
        r"\CostingPartsGrid.tsx")
DIALOG = (r"C:\Aizera\DSRFQ\DSRFQ.Web\Modules\Costing\Drawing"
          r"\DrawingImportDialog.ts")

failures = []


def check(name, ok, detail=""):
    print(f"{'ok   ' if ok else 'FAIL '} {name}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(name)


src = open(HANDLERS, encoding="utf-8").read()
ast.parse(src)
check("handlers.py parses", True)

# Every string that ends up in a Progress payload's Message.
messages = re.findall(r'"Message"\s*:\s*(f?"[^"]*"(?:\s*(?:f?"[^"]*")|\s*\n\s*f?"[^"]*")*)',
                      src)
flat = []
for m in messages:
    flat.append(" ".join(re.findall(r'"([^"]*)"', m)))

print(f"\n{len(flat)} progress message(s) found\n")

print("=" * 76)
print("1. Nothing console-only reaches the browser")
print("=" * 76)

ansi = [m for m in flat if re.search(r"\{(RED|GREEN|BLUE|YELLOW|RESET)\}", m)]
check("no terminal colour codes", not ansi, str(ansi[:2]))

threads = [m for m in flat if re.search(r"Thread for [Pp]art", m)]
check("no 'Thread for part N' internals", not threads, str(threads[:2]))

tracebacks = [m for m in flat if "{e}" in m or "{exc}" in m]
check("no raw exception text", not tracebacks, str(tracebacks[:2]))

jargon = [m for m in flat
          if re.search(r"\bAPI failed|retrieve token|File ID|file_id|"
                       r"JSON download|aborting\b", m, re.I)]
check("no service-internal jargon", not jargon, str(jargon[:3]))

print()
print("=" * 76)
print("2. What the operator now sees")
print("=" * 76)
for m in flat:
    shown = re.sub(r"\{[^}]*\}", "…", m).strip()
    if shown:
        print(f"  {shown[:96]}")

print()
print("=" * 76)
print("3. Failures say what to do next")
print("=" * 76)
fails = [m for m in flat if m.startswith("❌")]
actionable = [m for m in fails
              if re.search(r"Re-run|Re-upload|check |Upload a|type them in", m, re.I)]
print(f"  {len(fails)} failure message(s), {len(actionable)} suggest an action")
for m in fails:
    mark = "ok " if m in actionable else "   "
    print(f"  {mark} {re.sub(r'{[^}]*}', '…', m)[:92]}")
check("every failure message suggests an action",
      len(actionable) == len(fails), f"{len(fails) - len(actionable)} do not")

print()
print("=" * 76)
print("4. The upload refreshes the grid")
print("=" * 76)

dialog = open(DIALOG, encoding="utf-8").read()
grid = open(GRID, encoding="utf-8").read()

check("the dialog exposes an onUploaded callback",
      "public onUploaded" in dialog)
check("it fires on the success path, before closing",
      dialog.index("th.onUploaded?.()") < dialog.index("th.dialogClose()"))
check("the grid subscribes to it",
      "dialog.onUploaded = () => this.refresh()" in grid)
check("the dialogclose backstop is still there",
      "dialogclose" in grid)

print()
print("all good" if not failures else f"{len(failures)} failure(s): "
      + ", ".join(failures[:6]))
sys.exit(1 if failures else 0)
