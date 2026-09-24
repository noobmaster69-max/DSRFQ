"""Probe this laptop from deskdev over Tailscale.  DESKDEV_PASS=... python _deskdev_probe.py"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tools"))
import paramiko  # noqa: E402

TS = r'"C:\Program Files\Tailscale\tailscale.exe"'
LAPTOP = "100.68.166.119"
CMDS = [
    f"{TS} ping -c 3 {LAPTOP}",
    f"{TS} ping -c 2 --tsmp {LAPTOP}",
    f"ping -n 2 {LAPTOP}",
    f"{TS} status",
    'powershell -NoProfile -Command "foreach ($p in 5001,15675,7171) { $t = New-Object Net.Sockets.TcpClient; '
    '$r = $t.BeginConnect(\'' + LAPTOP + '\', $p, $null, $null); $ok = $r.AsyncWaitHandle.WaitOne(4000) -and $t.Connected; '
    '\'port {0}: {1}\' -f $p, $ok; $t.Close() }"',
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("100.97.0.29", username="Programmer", password=os.environ["DESKDEV_PASS"], timeout=20,
          look_for_keys=False, allow_agent=False)
for cmd in CMDS:
    _, o, e = c.exec_command(cmd, timeout=90)
    out = (o.read().decode(errors="replace") + e.read().decode(errors="replace")).strip()
    print(f"$ {cmd[:80]}\n{out[:900]}\n")
c.close()
