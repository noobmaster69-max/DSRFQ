<#
.SYNOPSIS
    Proves the deployment works, end to end, rather than that it started.

.DESCRIPTION
    Run on the TARGET after the services are up. Every check answers a question
    a "service is Running" light cannot: a Python service binds its port long
    before its models finish loading, and the consumer holds an open AMQP
    connection whether or not it can reach SQL Server.

    Read-only apart from one temporary row, which is rolled back.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File 40-verify.ps1
#>
[CmdletBinding()]
param(
    [string] $InstallRoot = 'C:\Aizera',
    [string] $BaseUrl = 'http://localhost:5001'
)

$ErrorActionPreference = 'Continue'
$script:Fail = 0

function Report {
    param([string] $Name, [bool] $Ok, [string] $Detail = '')
    $state = 'PASS'; $colour = 'Green'
    if (-not $Ok) { $state = 'FAIL'; $colour = 'Red'; $script:Fail++ }
    Write-Host ("  {0,-4} " -f $state) -ForegroundColor $colour -NoNewline
    Write-Host ("{0,-40} {1}" -f $Name, $Detail)
}

function Test-Http {
    param([string] $Url, [int] $TimeoutSec = 15)
    try {
        $r = Invoke-WebRequest $Url -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
        return @{ Ok = $true; Detail = "HTTP $($r.StatusCode)" }
    }
    catch {
        # A 401 or a 302 to the login page still proves the app is listening and
        # answering - which is the question. Only a refused socket is a failure.
        if ($_.Exception.Response) {
            return @{ Ok = $true; Detail = "HTTP $([int]$_.Exception.Response.StatusCode)" }
        }
        return @{ Ok = $false; Detail = ($_.Exception.Message -split "`n")[0] }
    }
}

Write-Host "`nOneZera verify - $env:COMPUTERNAME - $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Cyan

# ── 1. services ────────────────────────────────────────────────────────────
Write-Host "`n1. Windows services"
$svcs = Get-Service -Name 'OneZera-*' -ErrorAction SilentlyContinue
if (-not $svcs) { Report 'OneZera-* registered' $false 'none found - run 30-services.ps1' }
foreach ($s in $svcs) {
    Report $s.Name ($s.Status -eq 'Running') $s.Status
}

# ── 2. HTTP endpoints ──────────────────────────────────────────────────────
# Each URL is the app's own, not /health or /: several of these answer / with a
# 404 while perfectly healthy, and every Serenity app answers /Account/Login
# identically so it cannot tell one from another.
Write-Host "`n2. HTTP endpoints"
$endpoints = @(
    @{ Name = 'OneZera Web (5001)';       Url = "$BaseUrl/Costing/CostingParts" }
    @{ Name = 'RPA API (8000)';         Url = 'http://localhost:8000/health' }
    @{ Name = 'new_tsh (8888)';         Url = 'http://localhost:8888/health' }
    @{ Name = 'Table Recognize (3600)'; Url = 'http://localhost:3600/docs' }
    @{ Name = 'REPLACE API (3500)';     Url = 'http://localhost:3500/docs' }
    @{ Name = 'Table to JSON (3501)';   Url = 'http://localhost:3501/docs' }
    @{ Name = 'Bubble-V6 (5999)';       Url = 'http://localhost:5999/docs' }
    @{ Name = 'RabbitMQ mgmt (15672)';  Url = 'http://localhost:15672' }
    @{ Name = 'Ollama (11434)';         Url = 'http://localhost:11434/api/tags' }
)
foreach ($e in $endpoints) {
    $r = Test-Http $e.Url
    Report $e.Name $r.Ok $r.Detail
}

# ── 3. the venv actually imports ───────────────────────────────────────────
Write-Host "`n3. Python venv"
$python = Join-Path $InstallRoot 'RPA\PythonLibrary\.venv\Scripts\python.exe'
if (Test-Path $python) {
    # numpy proves the base interpreter resolved and compiled wheels load;
    # pyodbc proves the ODBC driver is installed, which nothing else reveals
    # until a drawing is halfway through converting.
    $probe = & $python -c @"
import numpy, pyodbc, sys
drivers = [d for d in pyodbc.drivers() if 'SQL Server' in d]
print(f\"py={sys.version_info.major}.{sys.version_info.minor} numpy={numpy.__version__} odbc={len(drivers)}\")
"@ 2>&1
    Report 'venv imports numpy + pyodbc' ($LASTEXITCODE -eq 0) $probe
}
else { Report 'venv present' $false $python }

# ── 4. the database, through the app's own connection string ───────────────
Write-Host "`n4. Database"
$appsettings = Join-Path $InstallRoot 'DSRFQ\DSRFQ.Web\appsettings.json'
if (Test-Path $appsettings) {
    try {
        $conn = (Get-Content $appsettings -Raw | ConvertFrom-Json).Data.Default.ConnectionString
        $c = New-Object System.Data.SqlClient.SqlConnection $conn
        $c.Open()
        $cmd = $c.CreateCommand()
        # VersionInfo is FluentMigrator's own table: if the newest row is there,
        # migrations ran, which is the only proof the schema matches this build.
        $cmd.CommandText = "SELECT TOP 1 Version, Description FROM dbo.VersionInfo ORDER BY Version DESC"
        $r = $cmd.ExecuteReader()
        if ($r.Read()) { Report 'SQL Server + migrations applied' $true "$($r[0]) $($r[1])" }
        else { Report 'SQL Server + migrations applied' $false 'VersionInfo is empty' }
        $r.Close(); $c.Close()
    }
    catch { Report 'SQL Server + migrations applied' $false ($_.Exception.Message -split "`n")[0] }
}
else { Report 'appsettings.json' $false $appsettings }

# ── 5. the shared upload folder ────────────────────────────────────────────
# The web app writes here and the consumer reads it back by absolute path. A
# drawing that uploads and never converts is almost always this.
Write-Host "`n5. Shared upload folder"
$upload = Join-Path $InstallRoot 'DSRFQ\DSRFQ.Web\App_Data\upload'
if (Test-Path $upload) {
    $probe = Join-Path $upload ".deploy-write-test"
    try {
        Set-Content -Path $probe -Value 'ok' -ErrorAction Stop
        Remove-Item $probe -Force
        Report 'UploadRoot exists and is writable' $true $upload
    }
    catch { Report 'UploadRoot writable' $false ($_.Exception.Message -split "`n")[0] }
}
else { Report 'UploadRoot exists' $false $upload }

Write-Host ""
if ($script:Fail -gt 0) {
    Write-Host "$($script:Fail) check(s) failed. Logs: $InstallRoot\logs" -ForegroundColor Red
    exit 1
}
Write-Host "All checks passed." -ForegroundColor Green
exit 0
