r"""Does the new One Supply panel entry parse, and does what it names exist?

The path is non-ASCII and contains parentheses, so "the YAML still loads" is a
real question rather than a formality - and a wrong cwd shows up only as a
service that starts and dies with no window.

    python .mssql-scripts/check_panel_one_supply.py
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
check("services.yaml still parses", True, f"{len(svcs)} services")
check("one-supply is registered", "one-supply" in svcs)
if "one-supply" not in svcs:
    sys.exit(1)

app = svcs["one-supply"]

print("\n1. shape")
# proc, because there is no port. An http check would need a URL it does not
# have, and tcp would need a port it does not open.
check("checked as a process, not a port", app["check"] == "proc", app["check"])
check("has no port or url", "port" not in app and "url" not in app)
check("runs windowless python", app["command"][0].endswith("pythonw.exe"),
      app["command"][0])
check("entry point is main.py", app["command"][1] == "main.py")

print("\n2. the UTF-8 environment")
# This is the one that matters. Without it the app dies on its first Chinese
# log line, the same way Bubble.exe does when it has no console.
env = app.get("env") or {}
check("PYTHONIOENCODING=utf-8", env.get("PYTHONIOENCODING") == "utf-8", env.get("PYTHONIOENCODING"))
check("PYTHONUTF8=1", str(env.get("PYTHONUTF8")) == "1", env.get("PYTHONUTF8"))

print("\n3. the paths it names")
cwd = app["cwd"]
print(f"        cwd: {cwd}")
check("cwd exists", os.path.isdir(cwd))
check("main.py exists", os.path.isfile(os.path.join(cwd, "main.py")))
check("pythonw.exe exists", os.path.isfile(app["command"][0]))
check("its api_config.json exists",
      os.path.isfile(os.path.join(cwd, "config", "api_config.json")))

print("\n4. it points at the engine that is actually running")
import json                                                     # noqa: E402
cfg_path = os.path.join(cwd, "config", "api_config.json")
if os.path.isfile(cfg_path):
    with open(cfg_path, encoding="utf-8") as fh:
        api = json.load(fh)
    base = api["server"]["base_url"]
    print(f"        base_url: {base}")
    # 5999 is Bubble-V6. 6001 was the shipped default and nothing has ever
    # listened on it here.
    check("base_url is the 5999 engine", base.endswith(":5999"), base)
    bubble = svcs.get("bubble-new") or {}
    check("and that is the port the panel starts bubble-new on",
          bubble.get("port") == 5999, bubble.get("port"))

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
