"""Push changed wwwroot/esm files (compiled TypeScript) to the deploy target, live.

Static files: the running web app serves them from disk, so no restart is needed -
a browser reload picks them up. Files that differ are backed up first; files that
exist only on the target (older chunks) are left in place, since a page still open
in someone's browser may import them.

    python _target_push_esm.py
"""
import datetime
import hashlib
import io
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tools"))
import paramiko  # noqa: E402

LOCAL = r"C:\Aizera\DSRFQ\DSRFQ.Web\wwwroot\esm"
REMOTE = "C:/Aizera/DSRFQ/DSRFQ.Web/wwwroot/esm"

local = {}
for root, _, files in os.walk(LOCAL):
    for f in files:
        rel = os.path.relpath(os.path.join(root, f), LOCAL).replace("\\", "/")
        local[rel] = hashlib.md5(open(os.path.join(root, f), "rb").read()).hexdigest().upper()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("10.228.228.143", username="SP_Demo1", password=os.environ.get("TARGET_PASS", "SP_Demo1"),
          timeout=30, look_for_keys=False, allow_agent=False)
sftp = c.open_sftp()
sftp.putfo(io.BytesIO("\r\n".join(local).encode("utf-8")), "C:/Users/SP_Demo1/esm_files.txt")
ps = ("$root = 'C:\\Aizera\\DSRFQ\\DSRFQ.Web\\wwwroot\\esm'; Get-Content C:\\Users\\SP_Demo1\\esm_files.txt | ForEach-Object { "
      "$p = Join-Path $root $_; if (Test-Path -LiteralPath $p) { (Get-FileHash -LiteralPath $p -Algorithm MD5).Hash + '|' + $_ } else { 'MISSING|' + $_ } }")
sftp.putfo(io.BytesIO(ps.encode("utf-8-sig")), "C:/Users/SP_Demo1/esm_hash.ps1")
_, out, err = c.exec_command("powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/SP_Demo1/esm_hash.ps1", timeout=300)
remote = dict(reversed(line.strip().split("|", 1)) for line in out.read().decode("utf-8", "replace").splitlines() if "|" in line)
for f in ("esm_files.txt", "esm_hash.ps1"):
    sftp.remove(f"C:/Users/SP_Demo1/{f}")

changed = sorted(r for r in local if remote.get(r) != local[r])
print(f"{len(local)} esm files; {len(changed)} differ on the target")
if not changed:
    sys.exit(0)

stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M")
backup = f"C:/Aizera/Backup/esm-{stamp}"


def mkdirs(path):
    parts = path.split("/")
    for i in range(2, len(parts) + 1):
        d = "/".join(parts[:i])
        try:
            sftp.stat(d)
        except IOError:
            sftp.mkdir(d)


for rel in changed:
    target = f"{REMOTE}/{rel}"
    if remote.get(rel) not in (None, "MISSING"):
        mkdirs(f"{backup}/{rel}".rsplit("/", 1)[0])
        with sftp.open(target, "rb") as src, sftp.open(f"{backup}/{rel}", "wb") as dst:
            dst.write(src.read())
    mkdirs(target.rsplit("/", 1)[0])
    sftp.put(os.path.join(LOCAL, rel.replace("/", os.sep)), target)
    print(f"  pushed {rel}")
print(f"backup of replaced files: {backup}")
c.close()
