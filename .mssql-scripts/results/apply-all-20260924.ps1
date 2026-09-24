<#
  Finish the 2026-09-24 deploy. Run ONCE, as administrator, at the console:

    powershell -ExecutionPolicy Bypass -File C:\Aizera\Staging\apply-all-20260924.ps1

  All the new files are ALREADY in place (copied over SSH). This only restarts the
  services so they load them, then checks each one answers.

    OneZera-Web            C:\Aizera\DSRFQ\DSRFQ.Web (old files: C:\Aizera\Backup\web-20260924-0830;
                           the DLL that was running is *.old-web-20260924-0830).
                           On start it creates the CostingPartViewLinks table itself.
    OneZera-RpaApi         RPA\API
    OneZera-Consumer       RPA\RFQ
    OneZera-TableRecognize RPA\table-recognize-3parts
                           (old Python files: C:\Aizera\Backup\publish-20260924-0829)

  Rolling back = copy the backup folder(s) back over and run this again.
#>
$ErrorActionPreference = 'Continue'

Write-Host '== Restarting services ==' -ForegroundColor Cyan
foreach ($s in 'OneZera-Web', 'OneZera-RpaApi', 'OneZera-Consumer', 'OneZera-TableRecognize', 'OneZera-NewTsh') {
    try {
        Restart-Service $s -Force -ErrorAction Stop
        Write-Host "restarted $s" -ForegroundColor Green
    } catch {
        Write-Warning "$s : $($_.Exception.Message)"
    }
}

Write-Host '== Checks (up to 3 minutes each) ==' -ForegroundColor Cyan
$checks = [ordered]@{
    'DSRFQ web      :5001' = 'http://127.0.0.1:5001/Account/Login'
    'RPA API        :8000' = 'http://127.0.0.1:8000/health'
    'Costing        :8888' = 'http://127.0.0.1:8888/health'
    'Title block    :3600' = 'http://127.0.0.1:3600/docs'
    'Ollama        :11434' = 'http://127.0.0.1:11434/api/tags'
}
foreach ($k in $checks.Keys) {
    $ok = $false
    for ($i = 0; $i -lt 36 -and -not $ok; $i++) {
        try { Invoke-WebRequest $checks[$k] -UseBasicParsing -TimeoutSec 5 | Out-Null; $ok = $true }
        catch { Start-Sleep -Seconds 5 }
    }
    if ($ok) { Write-Host "OK    $k" -ForegroundColor Green } else { Write-Warning "DOWN  $k" }
}
$c = Get-Service OneZera-Consumer -ErrorAction SilentlyContinue
if ($c -and $c.Status -eq 'Running') { Write-Host 'OK    RFQ consumer (service running)' -ForegroundColor Green }
else { Write-Warning 'RFQ consumer is not running - see C:\Aizera\logs' }
Write-Host 'Done.'
