r"""Run a PowerShell command on deskdev over SSH and stream the result back.

    set DESKDEV_USER=... & set DESKDEV_PASS=...
    python .mssql-scripts/run_on_deskdev.py "<powershell command>"

Used to drive the deploy kit remotely without an interactive session. Whatever
is passed runs as `Programmer`, which SSH gives a full administrator token -
unlike SMB, where UAC remote-token filtering closes the admin shares.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tools"))

import paramiko                                                 # noqa: E402

if len(sys.argv) < 2:
    sys.exit(__doc__)

USER = os.environ.get("DESKDEV_USER")
PASS = os.environ.get("DESKDEV_PASS")
if not USER or not PASS:
    sys.exit("set DESKDEV_USER and DESKDEV_PASS first")

command = sys.argv[1]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(os.environ.get("DESKDEV_HOST", "deskdev"), username=USER,
               password=PASS, timeout=30, look_for_keys=False, allow_agent=False)

# -NoProfile so a profile script cannot colour or wrap the output, and
# -ExecutionPolicy Bypass because the kit's .ps1 files arrive unsigned.
_stdin, stdout, stderr = client.exec_command(
    f'powershell -NoProfile -ExecutionPolicy Bypass -Command {command!r}'
    if False else
    f'powershell -NoProfile -ExecutionPolicy Bypass -Command "{command}"')

out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
code = stdout.channel.recv_exit_status()

print(out.rstrip())
if err.strip():
    print("--- stderr ---")
    print(err.rstrip())
print(f"--- exit {code} ---")

client.close()
sys.exit(code)
