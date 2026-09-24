"""Run read-only SQL on the deploy target's RFQ database (via SSH + its own appsettings).

    python _target_query.py "SELECT TOP 5 ID FROM dbo.CostingParts ORDER BY ID DESC" ["another query" ...]
"""
import io
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tools"))
import paramiko  # noqa: E402

PS = r"""
param([string] $QueryFile)
$cs = (Get-Content C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json -Raw | ConvertFrom-Json).Data.Default.ConnectionString
$c = New-Object System.Data.SqlClient.SqlConnection $cs
$c.Open()
foreach ($q in ((Get-Content $QueryFile -Raw -Encoding UTF8) -split "`n---`n")) {
    if (-not $q.Trim()) { continue }
    $cmd = $c.CreateCommand(); $cmd.CommandText = $q; $cmd.CommandTimeout = 120
    $r = $cmd.ExecuteReader()
    $t = New-Object System.Data.DataTable; $t.Load($r)
    "### " + $q.Trim().Split("`n")[0]
    $t | Format-Table -AutoSize -Wrap | Out-String -Width 400
}
$c.Close()
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("10.228.228.143", username="SP_Demo1", password=os.environ.get("TARGET_PASS", "SP_Demo1"),
          timeout=30, look_for_keys=False, allow_agent=False)
s = c.open_sftp()
s.putfo(io.BytesIO(PS.encode("utf-8-sig")), "C:/Users/SP_Demo1/tq.ps1")
s.putfo(io.BytesIO("\n---\n".join(sys.argv[1:]).encode("utf-8")), "C:/Users/SP_Demo1/tq.sql")
_, o, e = c.exec_command("powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/SP_Demo1/tq.ps1 -QueryFile C:/Users/SP_Demo1/tq.sql", timeout=300)
print(o.read().decode("utf-8", "replace"))
err = e.read().decode("utf-8", "replace").strip()
if err:
    print("ERR:", err[:2000])
for f in ("tq.ps1", "tq.sql"):
    s.remove(f"C:/Users/SP_Demo1/{f}")
c.close()
