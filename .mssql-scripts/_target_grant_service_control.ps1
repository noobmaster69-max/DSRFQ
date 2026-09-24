#Requires -RunAsAdministrator
<#
  Let SP_Demo1 start, stop and query the OneZera services, so publishes can be
  finished over SSH without someone at the console.

  Run ONCE, as an administrator at this machine's console:
      powershell -ExecutionPolicy Bypass -File C:\Aizera\Staging\grant-service-control.ps1

  Adds one ACE per service: start (RP), stop (WP), pause/continue (DT),
  query status (LO), query config (RC). Nothing else - SP_Demo1 still cannot
  reconfigure, delete or install services. Safe to run again.

  Why it is needed: the administrator accounts have blank passwords, and Windows
  only lets blank-password accounts sign in at the console ("Limit local account
  use of blank passwords to console logon only"), so they cannot be used over
  SSH or runas.

  To undo, for each service:  sc.exe sdset <name> <the original from sc.exe sdshow>
  (the originals are saved next to this script as service-sddl-backup.txt).
#>
$ErrorActionPreference = 'Stop'
$sid  = 'S-1-5-21-305784246-2725369126-179715006-1004'   # DESKTOP-19H56GN\SP_Demo1
$ace  = "(A;;RPWPDTLORC;;;$sid)"
$svcs = 'OneZera-Web','OneZera-RpaApi','OneZera-Consumer','OneZera-NewTsh',
        'OneZera-ReplaceApi','OneZera-TableRecognize','OneZera-TableToJson'
$backup = Join-Path $PSScriptRoot 'service-sddl-backup.txt'

foreach ($s in $svcs) {
    $sddl = (& sc.exe sdshow $s | Where-Object { $_ -match '^D:' }) -join ''
    if (-not $sddl) { Write-Warning "$s not found"; continue }
    Add-Content $backup "$s  $sddl"
    if ($sddl -like "*$sid*") { Write-Host "  $s  already granted"; continue }
    # Insert into the DACL, before any SACL part.
    $new = if ($sddl -match '^(D:[^S]*)(S:.*)?$') { $Matches[1] + $ace + $Matches[2] } else { $sddl + $ace }
    & sc.exe sdset $s $new | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "sc sdset $s failed ($LASTEXITCODE)" }
    Write-Host "  $s  granted"
}
Write-Host "SP_Demo1 can now start/stop the OneZera services. Originals saved to $backup" -ForegroundColor Green
