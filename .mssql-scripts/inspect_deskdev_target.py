r"""What is already at C:\Aizera on deskdev, before the deploy kit is written there.

Creating a folder tree on someone else's machine is cheap to do and annoying to
undo, so this looks first. Read-only.

    set DESKDEV_USER=... & set DESKDEV_PASS=...
    python .mssql-scripts/inspect_deskdev_target.py
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tools"))

import paramiko                                                 # noqa: E402

USER = os.environ.get("DESKDEV_USER")
PASS = os.environ.get("DESKDEV_PASS")
if not USER or not PASS:
    sys.exit("set DESKDEV_USER and DESKDEV_PASS first")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("deskdev", username=USER, password=PASS, timeout=30,
               look_for_keys=False, allow_agent=False)

CHECKS = [
    ("hostname / user", "$env:COMPUTERNAME + ' / ' + $env:USERNAME"),
    ("is admin", "([Security.Principal.WindowsPrincipal]"
                 "[Security.Principal.WindowsIdentity]::GetCurrent())"
                 ".IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)"),
    ("free on C:", "'{0:N1} GB' -f ((Get-PSDrive C).Free/1GB)"),
    ("C:\\Aizera exists", "Test-Path C:\\Aizera"),
    ("C:\\Aizera\\DSRFQ exists", "Test-Path C:\\Aizera\\DSRFQ"),
    ("top of C:\\Aizera", "Get-ChildItem C:\\Aizera -Directory -EA SilentlyContinue | "
                          "Select-Object -First 15 -Expand Name"),
    ("C:\\Aizera\\DSRFQ", "Get-ChildItem C:\\Aizera\\DSRFQ -EA SilentlyContinue | "
                          "Select-Object -First 15 -Expand Name"),
]

for label, cmd in CHECKS:
    _stdin, stdout, stderr = client.exec_command(
        f'powershell -NoProfile -Command "{cmd}"')
    text = stdout.read().decode(errors="replace").strip()
    if not text:
        text = stderr.read().decode(errors="replace").strip()
    print(f"{label}:")
    for line in (text or "(nothing)").splitlines():
        print("   ", line.rstrip())

client.close()
