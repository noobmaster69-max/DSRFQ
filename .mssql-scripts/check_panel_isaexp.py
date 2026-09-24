"""Does the new ISA_EXP panel entry parse, and does what it names exist?

A services.yaml entry fails at the moment you press Start, in a log nobody is
watching - a wrong dll path or csproj name looks exactly like a crash. This
checks the file parses, the entry matches DS_ERP's shape, and every path it
names is really on disk.

    python .mssql-scripts/check_panel_isaexp.py
"""

import os
import sys

import yaml

PANEL = r"C:\Aizera\RPA\control-panel\services.yaml"
fails = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + str(detail) if detail else ''}")
    if not ok:
        fails.append(name)


with open(PANEL, encoding="utf-8") as fh:
    cfg = yaml.safe_load(fh)

svcs = {s["id"]: s for g in cfg["groups"] for s in g["services"]}
check("services.yaml parses", True, f"{len(svcs)} services")
check("isa-exp is registered", "isa-exp" in svcs)
if "isa-exp" not in svcs:
    sys.exit(1)

isa, ref = svcs["isa-exp"], svcs["dserp"]

print("\n1. same shape as DSEFACTORY")
for key in ("check", "env"):
    check(f"{key} matches dserp", isa.get(key) == ref.get(key),
          f"{isa.get(key)!r}")
check("has both task buttons",
      [t["id"] for t in isa.get("tasks", [])] == [t["id"] for t in ref["tasks"]],
      [t["id"] for t in isa.get("tasks", [])])
check("rebuild restarts, like dserp",
      isa["tasks"][1].get("restart") is True)
# The whole point of dserp's command line, and the thing DSRFQ still lacks.
check("binds every interface, not just loopback",
      any("0.0.0.0" in str(a) for a in isa["command"]), isa["command"][-1])
# net10.0 is native on this box; a roll-forward here would be cargo-culted
# from DSRFQ, which needs it because it targets net8.0.
check("no roll-forward (net10.0 is native here)",
      "DOTNET_ROLL_FORWARD" not in (isa.get("env") or {}))

print("\n2. the paths it names")
cwd = isa["cwd"]
check("cwd exists", os.path.isdir(cwd), cwd)
dll = os.path.join(cwd, isa["command"][1])
check("the dll exists", os.path.isfile(dll), dll)
csproj = os.path.join(cwd, isa["tasks"][1]["command"][2])
check("the csproj exists", os.path.isfile(csproj), csproj)
check("tsbuild.js exists", os.path.isfile(os.path.join(cwd, "tsbuild.js")))

print("\n3. no collisions with the other apps")
ports = [(i, s.get("port")) for i, s in svcs.items() if s.get("port")]
dupes = [i for i, p in ports if p == isa["port"] and i != "isa-exp"]
check("its port is unused", not dupes, f"{isa['port']} also on {dupes}")
# Both other Serenity apps answer /Account/Login identically, so a probe of it
# cannot tell which app replied.
check("the health check is app-specific",
      "/Account/Login" not in isa["url"], isa["url"])
check("the health url uses its own port",
      f":{isa['port']}" in isa["url"], isa["url"])

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
