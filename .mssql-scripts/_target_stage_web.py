"""Stage a DSRFQ.Web Release publish on the deploy target, ready for an admin to apply.

SP_Demo1 cannot stop OneZera-Web, and the running app locks DSRFQ.Web.dll, so
files cannot be swapped in place. This uploads only the files that differ from
what the target runs into C:/Aizera/Staging/web-<stamp>, plus apply-web.ps1 for
an administrator to run: stop the service, back up, copy, add the Ballooning
appsettings section if missing, start, check.

Never staged: appsettings*.json (the target's secrets and connection string),
App_Data (uploads, keys), logs.

    python _target_stage_web.py
"""
import datetime
import hashlib
import io
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tools"))
import paramiko  # noqa: E402

HOST, USER, PASS = "10.228.228.143", "SP_Demo1", os.environ.get("TARGET_PASS", "SP_Demo1")
LOCAL = r"C:\Aizera\DSRFQ\DSRFQ.Web\bin\Release\net8.0\publish"
# The TypeScript output, shipped whole and mirrored rather than diffed: it is
# pure build output, and the publish folder keeps chunks from older builds
# (CopyToPublishDirectory=PreserveNewest never deletes), so the source tree's
# freshly built esm is the exact set the pages import.
ESM = r"C:\Aizera\DSRFQ\DSRFQ.Web\wwwroot\esm"
REMOTE_WEB = "C:/Aizera/DSRFQ/DSRFQ.Web"
SKIP_DIRS = {"App_Data", "logs"}
SKIP_FILES = {"appsettings.json", "appsettings.Development.json", "appsettings.Production.json"}

stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M")
stage = f"C:/Aizera/Staging/web-{stamp}"

local = {}
for root, dirs, files in os.walk(LOCAL):
    rel_root = os.path.relpath(root, LOCAL)
    if rel_root == ".":
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for f in files:
        rel = os.path.normpath(os.path.join(rel_root, f)).replace("\\", "/")
        if rel in SKIP_FILES or rel.startswith("wwwroot/esm/"):
            continue
        p = os.path.join(root, f)
        local[rel] = hashlib.md5(open(p, "rb").read()).hexdigest().upper()
print(f"{len(local)} files in the publish")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=PASS, timeout=30, look_for_keys=False, allow_agent=False)
sftp = c.open_sftp()


def run(cmd, timeout=1800):
    _, o, e = c.exec_command(cmd, timeout=timeout)
    code = o.channel.recv_exit_status()
    return code, o.read().decode("utf-8", "replace"), e.read().decode("utf-8", "replace")


# Hash what the target has, for the same relative paths.
listing = "\r\n".join(local)
sftp.putfo(io.BytesIO(listing.encode("utf-8")), "C:/Users/SP_Demo1/web_files.txt")
ps = ("$root = 'C:\\Aizera\\DSRFQ\\DSRFQ.Web'; "
      "Get-Content C:\\Users\\SP_Demo1\\web_files.txt | ForEach-Object { $p = Join-Path $root $_; "
      "if (Test-Path -LiteralPath $p) { (Get-FileHash -LiteralPath $p -Algorithm MD5).Hash + '|' + $_ } else { 'MISSING|' + $_ } }")
sftp.putfo(io.BytesIO(ps.encode("utf-8-sig")), "C:/Users/SP_Demo1/web_hash.ps1")
code, out, err = run("powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/SP_Demo1/web_hash.ps1")
for tmp in ("web_files.txt", "web_hash.ps1"):
    sftp.remove(f"C:/Users/SP_Demo1/{tmp}")
remote = {}
for line in out.splitlines():
    if "|" in line:
        h, rel = line.strip().split("|", 1)
        remote[rel] = h
if len(remote) != len(local):
    sys.exit(f"could not hash the target ({len(remote)}/{len(local)}): {err[:500]}")

changed = sorted(r for r in local if remote[r] != local[r])
new = [r for r in changed if remote[r] == "MISSING"]
print(f"{len(changed)} to publish ({len(new)} new, {len(changed) - len(new)} changed); "
      f"{len(local) - len(changed)} already identical")


def mkdirs(path):
    parts = path.split("/")
    for i in range(2, len(parts) + 1):
        d = "/".join(parts[:i])
        try:
            sftp.stat(d)
        except IOError:
            sftp.mkdir(d)


total = 0
for rel in changed:
    dest = f"{stage}/files/{rel}"
    mkdirs(dest.rsplit("/", 1)[0])
    src = os.path.join(LOCAL, rel.replace("/", os.sep))
    sftp.put(src, dest)
    total += os.path.getsize(src)
esm_count = 0
for root, dirs, files in os.walk(ESM):
    for f in files:
        rel = os.path.relpath(os.path.join(root, f), ESM).replace("\\", "/")
        dest = f"{stage}/esm/{rel}"
        mkdirs(dest.rsplit("/", 1)[0])
        sftp.put(os.path.join(root, f), dest)
        total += os.path.getsize(os.path.join(root, f))
        esm_count += 1
print(f"uploaded {total / 1e6:.1f} MB to {stage} ({len(changed)} changed file(s) + all {esm_count} wwwroot/esm files)")

manifest = {"stamp": stamp, "files": changed, "new": new}
sftp.putfo(io.BytesIO(json.dumps(manifest, indent=1).encode("utf-8")), f"{stage}/manifest.json")

apply_ps = r"""#Requires -RunAsAdministrator
<#
  Apply the staged DSRFQ.Web publish (__STAMP__). Run in an elevated PowerShell:
      powershell -ExecutionPolicy Bypass -File C:\Aizera\Staging\web-__STAMP__\apply-web.ps1

  Stops OneZera-Web, backs up every file it replaces to
  C:\Aizera\Backup\web-__STAMP__, copies the staged files over
  C:\Aizera\DSRFQ\DSRFQ.Web, adds the Ballooning section to appsettings.json if
  it is missing (nothing else in that file is touched), starts the service and
  waits for it to answer. The database migration for this build is already
  applied, so start-up has nothing to migrate.

  wwwroot\esm (the compiled TypeScript) is replaced as a whole folder; the old
  one is backed up first.

  To roll back: stop OneZera-Web, copy C:\Aizera\Backup\web-__STAMP__\* back over
  C:\Aizera\DSRFQ\DSRFQ.Web (delete wwwroot\esm first so the old folder comes
  back exactly), start it.
#>
$ErrorActionPreference = 'Stop'
$stage  = $PSScriptRoot
$web    = 'C:\Aizera\DSRFQ\DSRFQ.Web'
$backup = 'C:\Aizera\Backup\web-__STAMP__'
$svc    = 'OneZera-Web'
$files  = (Get-Content (Join-Path $stage 'manifest.json') -Raw | ConvertFrom-Json).files

Write-Host "Stopping $svc..."
Stop-Service $svc -Force
(Get-Service $svc).WaitForStatus('Stopped', [TimeSpan]::FromSeconds(60))
Start-Sleep -Seconds 2

Write-Host "Backing up and copying $($files.Count) file(s)..."
foreach ($rel in $files) {
    $target = Join-Path $web $rel
    if (Test-Path -LiteralPath $target) {
        $b = Join-Path $backup $rel
        New-Item -ItemType Directory -Force (Split-Path $b) | Out-Null
        Copy-Item -LiteralPath $target $b -Force
    }
    New-Item -ItemType Directory -Force (Split-Path $target) | Out-Null
    Copy-Item -LiteralPath (Join-Path (Join-Path $stage 'files') $rel) $target -Force
}

# wwwroot\esm is the compiled TypeScript: replaced as a whole, so the pages load
# exactly this build's scripts and no chunk from an older one is left behind.
$esm = Join-Path $web 'wwwroot\esm'
Write-Host "Replacing wwwroot\esm (TypeScript output)..."
if (Test-Path $esm) {
    New-Item -ItemType Directory -Force (Join-Path $backup 'wwwroot') | Out-Null
    Copy-Item $esm (Join-Path $backup 'wwwroot\esm') -Recurse -Force
}
& robocopy (Join-Path $stage 'esm') $esm /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy of wwwroot\esm failed ($LASTEXITCODE)" }
Write-Host "  $((Get-ChildItem $esm -Recurse -File).Count) file(s) in wwwroot\esm"

$settings = Join-Path $web 'appsettings.json'
$json = Get-Content $settings -Raw | ConvertFrom-Json
if (-not $json.PSObject.Properties['Ballooning']) {
    Copy-Item $settings (Join-Path $backup 'appsettings.json') -Force
    $key = ''
    $envFile = 'C:\Aizera\RPA\API\.env'
    if (Test-Path $envFile) {
        $line = Select-String -Path $envFile -Pattern '^ERP_API_KEY=(.*)$' | Select-Object -First 1
        if ($line) { $key = $line.Matches[0].Groups[1].Value.Trim() }
    }
    $json | Add-Member -NotePropertyName Ballooning -NotePropertyValue ([ordered]@{
        EngineUrl = 'http://localhost:5999'; ApiUrl = 'http://localhost:8000'; ApiKey = $key })
    $json | ConvertTo-Json -Depth 20 | Set-Content $settings -Encoding UTF8
    Write-Host "Added the Ballooning section to appsettings.json."
}

Write-Host "Starting $svc..."
Start-Service $svc
$ok = $false
for ($i = 0; $i -lt 40 -and -not $ok; $i++) {
    Start-Sleep -Seconds 3
    try { $ok = (Invoke-WebRequest http://localhost:5001/ -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 5 -ErrorAction Stop).StatusCode -lt 500 }
    catch { if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -lt 500) { $ok = $true } }
}
if ($ok) { Write-Host "DSRFQ is up on http://localhost:5001  (backup: $backup)" -ForegroundColor Green }
else { Write-Warning "Not answering after 2 minutes - check C:\Aizera\logs\OneZera-Web.err.log. Backup: $backup" }
""".replace("__STAMP__", stamp)
sftp.putfo(io.BytesIO(apply_ps.encode("utf-8-sig")), f"{stage}/apply-web.ps1")

print(f"\nstaged. As administrator on the target run:\n"
      f"  powershell -ExecutionPolicy Bypass -File {stage.replace('/', chr(92))}\\apply-web.ps1")
c.close()
