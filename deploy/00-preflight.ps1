<#
.SYNOPSIS
    Checks a machine for everything DSRFQ needs, before any of it is copied.

.DESCRIPTION
    Run this ON THE TARGET first. Every check here corresponds to something that
    otherwise fails late and quietly: a missing ODBC driver surfaces as the
    consumer dying mid-drawing, a missing Tesseract as BOM extraction silently
    returning nothing, the wrong Python as a venv that imports but cannot load a
    single compiled wheel.

    Read-only. It installs nothing and changes nothing.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File 00-preflight.ps1
#>
[CmdletBinding()]
param(
    # Where the payload will land. Must be C:\Aizera unless you have also
    # rewritten the absolute paths compiled into api.py and config.yaml -
    # see Payload.psd1 for which ones and why.
    [string] $InstallRoot = 'C:\Aizera',

    # SQL Server holding the RFQ database.
    [string] $SqlServer = 'localhost',

    # MySQL holding tsh_new, which new_tsh and the consumer's costing path use.
    [string] $MySqlHost = 'localhost',
    [int]    $MySqlPort = 3307
)

$ErrorActionPreference = 'Continue'
$script:Fail = 0
$script:Warn = 0

function Report {
    param(
        [string] $Name,
        [ValidateSet('PASS', 'FAIL', 'WARN')] [string] $State,
        [string] $Detail = ''
    )
    $colour = 'Green'
    if ($State -eq 'FAIL') { $colour = 'Red'; $script:Fail++ }
    if ($State -eq 'WARN') { $colour = 'Yellow'; $script:Warn++ }
    Write-Host ("  {0,-4} " -f $State) -ForegroundColor $colour -NoNewline
    Write-Host ("{0,-42} {1}" -f $Name, $Detail)
}

function Test-Port {
    param([string] $ComputerName, [int] $Port, [int] $TimeoutMs = 3000)
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($ComputerName, $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs)) { return $false }
        $client.EndConnect($async)
        return $true
    }
    catch { return $false }
    finally { $client.Close() }
}

Write-Host "`nDSRFQ preflight - $env:COMPUTERNAME - $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Cyan

# ── 1. the box itself ──────────────────────────────────────────────────────
Write-Host "`n1. Machine"

$os = Get-CimInstance Win32_OperatingSystem
Report 'Windows x64' $(if ([Environment]::Is64BitOperatingSystem) { 'PASS' } else { 'FAIL' }) $os.Caption

# The payload alone is ~24 GB, and both SQL Server and the decrypted Bubble
# models want room on top. 60 GB free is the point below which this gets tight.
$drive = Get-PSDrive -Name ($InstallRoot.Substring(0, 1)) -ErrorAction SilentlyContinue
if ($drive) {
    $freeGb = [math]::Round($drive.Free / 1GB, 1)
    $state = 'PASS'
    if ($freeGb -lt 60) { $state = 'WARN' }
    if ($freeGb -lt 30) { $state = 'FAIL' }
    Report 'Free disk space' $state "$freeGb GB on $($InstallRoot.Substring(0,2)) (payload ~24 GB)"
}
else {
    Report 'Free disk space' 'FAIL' "drive $($InstallRoot.Substring(0,2)) not found"
}

# GPU. table-recognize and REPLACE-api-v2 both set device = "gpu"; without a
# working driver they do not fall back, they fail to start.
$smi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
if ($smi) {
    $gpu = (& nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>$null | Select-Object -First 1)
    Report 'NVIDIA GPU + driver' 'PASS' $gpu
}
else {
    Report 'NVIDIA GPU + driver' 'FAIL' 'nvidia-smi not found - the 3500/3600 services need CUDA'
}

# ── 2. runtimes ────────────────────────────────────────────────────────────
Write-Host "`n2. Runtimes"

# DSRFQ.Web targets net8.0. Either the 8.x runtime is present, or a higher one
# is and DOTNET_ROLL_FORWARD=Major carries it - which is what this dev box does.
$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
if ($dotnet) {
    $runtimes = & dotnet --list-runtimes 2>$null | Where-Object { $_ -match 'Microsoft\.AspNetCore\.App' }
    $versions = $runtimes | ForEach-Object { ($_ -split ' ')[1] }
    $has8 = $versions | Where-Object { $_ -like '8.*' }
    $higher = $versions | Where-Object { [int]($_ -split '\.')[0] -gt 8 }
    if ($has8) { Report 'ASP.NET Core 8 runtime' 'PASS' ($has8 -join ', ') }
    elseif ($higher) { Report 'ASP.NET Core 8 runtime' 'WARN' "only $($versions -join ', ') - needs DOTNET_ROLL_FORWARD=Major" }
    else { Report 'ASP.NET Core 8 runtime' 'FAIL' "found: $($versions -join ', ')" }
}
else {
    Report 'ASP.NET Core 8 runtime' 'FAIL' 'dotnet not on PATH'
}

# The venv carries site-packages ONLY - no stdlib, no DLLs. Its python.exe is a
# 0.26 MB shim, so a base CPython 3.12 must exist for it to run at all. 3.12.x
# any patch is fine (cp312 wheels are ABI-stable across them); 3.11 or 3.13 is
# not - every compiled wheel in that 9 GB tree is cp312.
$py312 = $null
foreach ($candidate in @('C:\Python312\python.exe',
                         "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
                         'C:\Program Files\Python312\python.exe')) {
    if (Test-Path $candidate) { $py312 = $candidate; break }
}
if ($py312) {
    $ver = (& $py312 -c "import sys;print('.'.join(map(str,sys.version_info[:3])))" 2>$null)
    $state = 'PASS'
    if ($ver -notlike '3.12.*') { $state = 'FAIL' }
    Report 'CPython 3.12 (base for the venv)' $state "$ver at $py312"
}
else {
    Report 'CPython 3.12 (base for the venv)' 'FAIL' 'not found - install 3.12.x for all users at C:\Python312'
}

# ── 3. native prerequisites ────────────────────────────────────────────────
Write-Host "`n3. Native prerequisites"

# pyodbc opens this driver by exact name, from RFQ\config.yaml.
$odbc = Get-OdbcDriver -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq 'ODBC Driver 17 for SQL Server' }
Report 'ODBC Driver 17 for SQL Server' $(if ($odbc) { 'PASS' } else { 'FAIL' }) $(if ($odbc) { '' } else { 'pyodbc will not connect' })

# handlers.py sets TESSDATA_PREFIX to this path in code, not config.
$tess = 'C:\Program Files\Tesseract-OCR\tesseract.exe'
Report 'Tesseract-OCR' $(if (Test-Path $tess) { 'PASS' } else { 'FAIL' }) $(if (Test-Path $tess) { $tess } else { 'expected at ' + $tess })

$nssm = Join-Path $PSScriptRoot 'tools\nssm.exe'
if (-not (Test-Path $nssm)) { $nssm = "$InstallRoot\RPA\table-recognize-3parts\tools\nssm.exe" }
Report 'NSSM (service wrapper)' $(if (Test-Path $nssm) { 'PASS' } else { 'WARN' }) $(if (Test-Path $nssm) { $nssm } else { 'ships with table-recognize-3parts\tools' })

# ── 4. data stores ─────────────────────────────────────────────────────────
Write-Host "`n4. Data stores"

# Two databases, not one. SQL Server holds RFQ (the web app and the consumer);
# MySQL holds tsh_new (new_tsh's costing engine and the consumer's
# CostingDatabase). Deploying only the first leaves costing dead.
$sqlHost = $SqlServer
$sqlPort = 1433
if ($SqlServer -match '^(.+),(\d+)$') { $sqlHost = $Matches[1]; $sqlPort = [int]$Matches[2] }
Report 'SQL Server (RFQ database)' $(if (Test-Port $sqlHost $sqlPort) { 'PASS' } else { 'FAIL' }) "$sqlHost`:$sqlPort"
Report 'MySQL (tsh_new database)' $(if (Test-Port $MySqlHost $MySqlPort) { 'PASS' } else { 'FAIL' }) "$MySqlHost`:$MySqlPort"

# RabbitMQ carries every job between the web app and the consumer, and the
# browser subscribes to 15675 for live progress.
Report 'RabbitMQ AMQP 5672' $(if (Test-Port 'localhost' 5672) { 'PASS' } else { 'FAIL' }) ''
Report 'RabbitMQ web-mqtt 15675' $(if (Test-Port 'localhost' 15675) { 'PASS' } else { 'WARN' }) 'live progress bar only'

# ── 5. model services ──────────────────────────────────────────────────────
Write-Host "`n5. Model services"

if (Test-Port 'localhost' 11434) {
    $models = ''
    try {
        $tags = Invoke-RestMethod 'http://localhost:11434/api/tags' -TimeoutSec 5
        $models = ($tags.models | ForEach-Object { $_.name }) -join ', '
    }
    catch { }
    $hasQwen = $models -match 'qwen2\.5vl'
    Report 'Ollama + qwen2.5vl:7b' $(if ($hasQwen) { 'PASS' } else { 'WARN' }) $(if ($models) { $models } else { 'reachable, model list unavailable' })
}
else {
    Report 'Ollama + qwen2.5vl:7b' 'FAIL' 'localhost:11434 - BOM extraction needs it'
}

# Licensed, console-bound, copied by hand. Checked rather than installed.
Report 'Bubble-V6 present' $(if (Test-Path "$InstallRoot\Bubble\Bubble-V6\Bubble.exe") { 'PASS' } else { 'WARN' }) 'copy by hand - see README'

Write-Host ""
if ($script:Fail -gt 0) {
    Write-Host "$($script:Fail) blocking, $($script:Warn) warning(s). Fix the blocking ones before staging." -ForegroundColor Red
    exit 1
}
Write-Host "Ready. $($script:Warn) warning(s)." -ForegroundColor Green
exit 0
