r"""Push the DSRFQ deploy kit to deskdev over SFTP.

Why this and not scp/robocopy: the OpenSSH client on Windows cannot take a
password non-interactively, this box is not administrator so WinRM TrustedHosts
cannot be set, and deskdev's admin share is closed to local accounts by UAC
remote-token filtering (the credential itself is fine - `net use \\deskdev\IPC$`
authenticates). SFTP over the already-open port 22 is what is left.

Credentials come from the environment, not the command line, so they do not end
up in a shell history or a process list.

    set DESKDEV_USER=... & set DESKDEV_PASS=...
    python .mssql-scripts/push_deploy_kit.py [--apply]

Without --apply it connects, reports what it would do, and writes nothing.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tools"))

import paramiko                                                 # noqa: E402

HOST = os.environ.get("DESKDEV_HOST", "deskdev")
USER = os.environ.get("DESKDEV_USER")
PASS = os.environ.get("DESKDEV_PASS")
LOCAL = r"C:\Aizera\DSRFQ\deploy"
REMOTE = os.environ.get("DESKDEV_DEST", "C:/Aizera/DSRFQ/deploy")
APPLY = "--apply" in sys.argv

if not USER or not PASS:
    sys.exit("set DESKDEV_USER and DESKDEV_PASS first")

files = sorted(f for f in os.listdir(LOCAL)
               if os.path.isfile(os.path.join(LOCAL, f)))
if not files:
    sys.exit(f"nothing to push - {LOCAL} is empty")

print(f"{len(files)} file(s) from {LOCAL}")
for f in files:
    print(f"    {f:<22} {os.path.getsize(os.path.join(LOCAL, f)):>7,} bytes")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30,
               look_for_keys=False, allow_agent=False)

stdin, stdout, stderr = client.exec_command("hostname")
print(f"\nconnected to {stdout.read().decode(errors='replace').strip()} as {USER}")

sftp = client.open_sftp()


def remote_exists(path):
    try:
        sftp.stat(path)
        return True
    except IOError:
        return False


print(f"remote dir  : {REMOTE}  (exists: {remote_exists(REMOTE)})")

if not APPLY:
    print("\ndry run - pass --apply to write")
    sftp.close()
    client.close()
    sys.exit(0)

# mkdir -p, one level at a time: SFTP has no recursive mkdir and the parent
# folders may not exist on a machine that has never held this project.
parts = REMOTE.strip("/").split("/")
built = parts[0]
for part in parts[1:]:
    built = built + "/" + part
    if not remote_exists(built):
        sftp.mkdir(built)
        print(f"  created {built}")

print()
pushed = 0
for f in files:
    local_path = os.path.join(LOCAL, f)
    remote_path = REMOTE + "/" + f
    sftp.put(local_path, remote_path)
    # Verified by size rather than trusted: a truncated transfer over SFTP
    # raises nothing, and a half-written installer script is worse than none.
    local_size = os.path.getsize(local_path)
    remote_size = sftp.stat(remote_path).st_size
    ok = local_size == remote_size
    print(f"  {'OK  ' if ok else 'BAD '} {f:<22} {remote_size:>7,} bytes")
    if not ok:
        print(f"       size mismatch: local {local_size}, remote {remote_size}")
    else:
        pushed += 1

sftp.close()
print(f"\npushed {pushed}/{len(files)} to {HOST}:{REMOTE}")

# Read it back through the shell as a final, independent check - sftp.stat and
# a directory listing can disagree if the path resolved somewhere unexpected.
stdin, stdout, stderr = client.exec_command(
    f'powershell -NoProfile -Command "Get-ChildItem \'{REMOTE}\' | '
    f'Measure-Object -Property Length -Sum | '
    f'ForEach-Object {{ \\"{{0}} files, {{1}} bytes\\" -f $_.Count, $_.Sum }}"')
out = stdout.read().decode(errors="replace").strip()
err = stderr.read().decode(errors="replace").strip()
print(f"remote sees : {out or err}")

client.close()
sys.exit(0 if pushed == len(files) else 1)
