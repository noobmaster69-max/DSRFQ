"""Publish changed RPA files to the deploy target, backing up what they replace.

    python _target_publish.py
"""
import datetime
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tools"))
import paramiko  # noqa: E402

HOST, USER, PASS = "10.228.228.143", "SP_Demo1", os.environ.get("TARGET_PASS", "SP_Demo1")
# Files to publish, relative to C:\Aizera. Pass them on the command line;
# the list below is what the first publish (2026-09-15 11:19) sent.
FILES = sys.argv[1:] or [
    "RPA/API/api.py",
    "RPA/API/Balloon.py",
    "RPA/API/BalloonVector.py",
    "RPA/RFQ/handlers.py",
    "RPA/RFQ/function.py",
    "RPA/RFQ/queue_store.py",
]
LOCAL_ROOT = "C:/Aizera/"
REMOTE_ROOT = "C:/Aizera/"
PY = "C:/Aizera/RPA/PythonLibrary/.venv/Scripts/python.exe"

stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M")
backup = f"C:/Aizera/Backup/publish-{stamp}"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=PASS, timeout=30, look_for_keys=False, allow_agent=False)


def run(cmd):
    _, o, e = c.exec_command(cmd, timeout=600)
    code = o.channel.recv_exit_status()
    return code, o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()


sftp = c.open_sftp()
for rel in FILES:
    local, remote, dest = LOCAL_ROOT + rel, REMOTE_ROOT + rel, f"{backup}/{rel}"
    ps = (f"if (Test-Path '{remote}') {{ New-Item -ItemType Directory -Force (Split-Path '{dest}') | Out-Null; "
          f"Copy-Item '{remote}' '{dest}' -Force; 'backed up' }} else {{ 'new file' }}")
    code, out, err = run(f'powershell -NoProfile -Command "{ps}"')
    if code:
        sys.exit(f"backup failed for {remote}: {err}")
    sftp.put(local, remote)
    print(f"published {rel:<28} {os.path.getsize(local):>9,} bytes  ({out})")

check = ("import ast,sys; [ast.parse(open(p, encoding='utf-8-sig').read()) for p in sys.argv[1:]]; "
         "print('syntax ok on target')")
code, out, err = run(f'{PY} -c "{check}" ' + " ".join(REMOTE_ROOT + f for f in FILES))
print(out or err)
print(f"replaced files backed up to {backup}")
c.close()
sys.exit(code)
