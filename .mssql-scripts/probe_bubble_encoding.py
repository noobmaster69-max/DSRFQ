"""Which environment lets Bubble.exe start with its stdout redirected?

It runs fine by hand and dies under the control panel. The panel's only
material difference is that it captures stdout to a file instead of leaving it
attached to a console - and vert.initialize_license prints a Chinese string,
which a cp1252 stdout cannot encode.

The panel already exports PYTHONIOENCODING and PYTHONUTF8, so the question is
whether this frozen executable honours them. PyInstaller builds that use an
isolated PyConfig ignore the environment entirely, and no amount of setting
them would help. Rather than reason about which, try each.

Each attempt is given a few seconds to bind 5999, then killed.

    python .mssql-scripts/probe_bubble_encoding.py
"""

import os
import socket
import subprocess
import sys
import tempfile
import time

EXE = r"C:\Aizera\Bubble\Bubble-V6\Bubble.exe"
CWD = r"C:\Aizera\Bubble\Bubble-V6"
PORT = 5999
WAIT = 45           # models load before uvicorn binds


def listening() -> bool:
    with socket.socket() as s:
        s.settimeout(0.4)
        return s.connect_ex(("127.0.0.1", PORT)) == 0


def attempt(name: str, extra_env: dict, redirect: bool,
            console: bool = False) -> tuple[bool, str]:
    if listening():
        return False, "port already in use - stop the other instance first"

    env = {**os.environ, **extra_env}
    log = tempfile.NamedTemporaryFile(suffix=".log", delete=False)
    log.close()

    flags = subprocess.CREATE_NEW_PROCESS_GROUP
    if console:
        # A console makes Python write through WriteConsoleW, which is Unicode
        # all the way and never consults a code page. Redirected output has no
        # console, so it falls back to the locale encoding instead.
        flags |= subprocess.CREATE_NEW_CONSOLE

    out = open(log.name, "ab", buffering=0) if redirect else None
    proc = subprocess.Popen(
        [EXE], cwd=CWD, env=env,
        stdout=None if console else (out or subprocess.DEVNULL),
        stderr=None if console else (subprocess.STDOUT if redirect else subprocess.DEVNULL),
        creationflags=flags,
    )

    up = False
    for _ in range(WAIT * 2):
        if proc.poll() is not None:
            break
        if listening():
            up = True
            break
        time.sleep(0.5)

    proc.kill()
    proc.wait(timeout=20)
    if out:
        out.close()

    tail = ""
    try:
        with open(log.name, "rb") as fh:
            raw = fh.read()[-400:]
        tail = raw.decode("utf-8", "replace").strip().replace("\n", " | ")[-200:]
    except Exception:
        pass
    os.unlink(log.name)
    return up, tail


CASES = [
    ("own console, no env               ", {}, False, True),
    ("own console + PYTHONUTF8=1        ", {"PYTHONUTF8": "1"}, False, True),
]

print(f"{EXE}\n")
for name, env, redirect, console in CASES:
    ok, tail = attempt(name, env, redirect, console)
    print(f"  {'UP  ' if ok else 'DIED'}  {name}")
    if tail:
        print(f"          {tail}")
    time.sleep(2)

print("\nUP on a row means that environment is enough to start it.")
