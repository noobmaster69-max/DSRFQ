<#
    Run this in an ELEVATED PowerShell (right-click > Run as administrator).

    Two things this box needs that a non-elevated session cannot do:

    1. Restart the SQL Server instance. During the part-5 runs the machine hit
       its commit limit (61.2 GB of 61.2 GB) and SQL Server was squeezed down to
       a ~45 MB working set. It stopped accepting connections entirely -- the
       service still reports Running but nothing listens on 65001, so every
       write from the RFQ consumer failed with "Communication link failure
       (10054)" and no part status could ever be persisted.

    2. Raise the paging file. 15 GB of RAM is not enough to hold the Paddle
       services and SQL Server at once, and the automatic page file kept
       resizing itself between ~36 GB and ~61 GB right when it was needed most.
       Pinning it removes both the OOM kills and the SQL Server starvation.

    After this, RFQ's Processing.Mode can go back to 'parallel' if you want the
    stages to overlap again.
#>

[CmdletBinding()]
param(
    # Matches the instance behind deskdev,65001.
    [string] $SqlService = 'MSSQL$MSSQLSERVER04',
    [int]    $PageFileInitialMB = 32768,
    [int]    $PageFileMaximumMB = 65536,
    [string] $PageFileDrive = 'C:'
)

$ErrorActionPreference = 'Stop'

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
        ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error 'Not elevated. Re-run this from an administrator PowerShell.'
    return
}

Write-Host '=== 1. Paging file ===' -ForegroundColor Cyan
$cs = Get-CimInstance Win32_ComputerSystem
if ($cs.AutomaticManagedPagefile) {
    Write-Host '  disabling automatic management (it was resizing under load)'
    Set-CimInstance -InputObject $cs -Property @{ AutomaticManagedPagefile = $false } | Out-Null
}

$path = "$PageFileDrive\pagefile.sys"
$setting = Get-CimInstance Win32_PageFileSetting -Filter "Name='$($path -replace '\\','\\\\')'" -ErrorAction SilentlyContinue
if ($setting) {
    Set-CimInstance -InputObject $setting -Property @{
        InitialSize = $PageFileInitialMB; MaximumSize = $PageFileMaximumMB
    } | Out-Null
} else {
    New-CimInstance -ClassName Win32_PageFileSetting -Property @{
        Name = $path; InitialSize = $PageFileInitialMB; MaximumSize = $PageFileMaximumMB
    } | Out-Null
}
Write-Host ("  {0} pinned to {1} MB initial / {2} MB maximum" -f $path, $PageFileInitialMB, $PageFileMaximumMB) -ForegroundColor Green
Write-Host '  (takes effect after a reboot)' -ForegroundColor Yellow

Write-Host ''
Write-Host '=== 2. SQL Server ===' -ForegroundColor Cyan
$svc = Get-Service -Name $SqlService -ErrorAction SilentlyContinue
if (-not $svc) {
    Write-Warning "  service '$SqlService' not found; skipping."
} else {
    Write-Host "  restarting $SqlService (was: $($svc.Status))"
    Restart-Service -Name $SqlService -Force
    Start-Sleep -Seconds 10

    $listening = Get-NetTCPConnection -LocalPort 65001 -State Listen -ErrorAction SilentlyContinue
    if ($listening) {
        Write-Host '  port 65001 is listening again' -ForegroundColor Green
    } else {
        Write-Warning '  port 65001 still not listening -- check the SQL Server ERRORLOG.'
    }
}

Write-Host ''
Write-Host '=== current memory ===' -ForegroundColor Cyan
$os = Get-CimInstance Win32_OperatingSystem
'{0,-10} {1,8:N1} GB free of {2:N1} GB' -f 'RAM', ($os.FreePhysicalMemory / 1MB), ($os.TotalVisibleMemorySize / 1MB)
'{0,-10} {1,8:N1} GB used of {2:N1} GB' -f 'Commit', (($os.TotalVirtualMemorySize - $os.FreeVirtualMemory) / 1MB), ($os.TotalVirtualMemorySize / 1MB)

Write-Host ''
Write-Host 'Reboot when convenient to pick up the paging-file change.' -ForegroundColor Yellow
