<#
.SYNOPSIS
    Makes a copied payload runnable on the target: repoints the venv, rewrites
    the machine-specific config, and creates the folders the services expect.

.DESCRIPTION
    Run on the TARGET, after copying the staging folder to C:\Aizera.

    The venv is the reason this script exists. It carries site-packages only -
    no stdlib, no DLLs - and its python.exe is a 0.26 MB shim that resolves the
    real interpreter through pyvenv.cfg. That file records an absolute path
    containing the SOURCE machine's username, so on any other box every import
    fails until it is rewritten. Nothing else in the payload has that problem.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File 20-install.ps1 `
        -PythonHome C:\Python312 -SqlServer localhost -SqlPassword 'xxx'
#>
[CmdletBinding()]
param(
    [string] $InstallRoot = 'C:\Aizera',

    # The base CPython 3.12 the venv will resolve against.
    #
    # Empty means "find it": C:\Python312 first, then the standard all-users
    # locations. A path under \Users\ is never chosen automatically - the venv
    # records it absolutely, so a per-user interpreter breaks the machine after
    # this one, which is the whole problem this script exists to fix. Pass it
    # explicitly to override, including to a per-user path if you really mean it.
    [string] $PythonHome = '',

    # SQL Server holding RFQ. "host" or "host,port".
    [Parameter(Mandatory)] [string] $SqlServer,
    [string] $SqlUser = 'sa',
    [Parameter(Mandatory)] [string] $SqlPassword,

    # MySQL holding tsh_new.
    [string] $MySqlHost = 'localhost',
    [int]    $MySqlPort = 3307,
    [string] $MySqlUser = 'joe',
    [string] $MySqlPassword = 'Welcome01',

    # Show what would change without writing anything.
    [switch] $WhatIfOnly
)

$ErrorActionPreference = 'Stop'
$changed = @()

function Set-FileText {
    param([string] $Path, [string] $Text, [string] $What)
    if ($WhatIfOnly) {
        Write-Host "  would write $What -> $Path" -ForegroundColor Yellow
        return
    }
    # UTF-8 WITHOUT a BOM. Non-negotiable: a BOM on config.yaml makes PyYAML
    # read the first key as "\ufeffRabbitMq", and the consumer then fails on a
    # missing section rather than on anything that names the real cause. This
    # repository has lost a day to exactly that.
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $utf8NoBom)
    Write-Host "  wrote $What" -ForegroundColor Green
    $script:changed += $Path
}

Write-Host "`nDSRFQ install - $env:COMPUTERNAME" -ForegroundColor Cyan

# ── 1. repoint the venv ────────────────────────────────────────────────────
Write-Host "`n1. Python venv"

$venv = Join-Path $InstallRoot 'RPA\PythonLibrary\.venv'
$cfg = Join-Path $venv 'pyvenv.cfg'
if (-not (Test-Path $cfg)) { throw "venv not found at $venv - copy the payload first" }

if (-not $PythonHome) {
    # Ordered by preference, all username-free. The first that exists and is a
    # 3.12 wins; anything under \Users\ is deliberately not a candidate.
    foreach ($candidate in @('C:\Python312',
                             'C:\Program Files\Python312',
                             'C:\Program Files (x86)\Python312')) {
        $exe = Join-Path $candidate 'python.exe'
        if (-not (Test-Path $exe)) { continue }
        $v = & $exe -c "import sys;print('.'.join(map(str,sys.version_info[:3])))" 2>$null
        if ($v -like '3.12.*') { $PythonHome = $candidate; break }
    }
    if ($PythonHome) { Write-Host "  found base Python at $PythonHome" -ForegroundColor DarkGray }
    else { $PythonHome = 'C:\Python312' }   # for the error message below
}

$pythonExe = Join-Path $PythonHome 'python.exe'
if (-not (Test-Path $pythonExe)) {
    # Say what to do, not just what is missing. This is the commonest way to
    # arrive here: the prerequisites step was skipped, or it failed and its one
    # red line scrolled past. Point at the fix rather than leaving someone to
    # guess which Python and where.
    $lines = @("base Python not found at $pythonExe", '')

    # Sorted into usable and not. A path under \Users\ is per-user and carries
    # a username the venv would record absolutely; anything else is fine to
    # point at. Lumping the two together told people to ignore an interpreter
    # that was perfectly good.
    $usable = @(); $perUser = @()
    foreach ($c in @("$env:LOCALAPPDATA\Programs\Python\Python312",
                     'C:\Program Files\Python312',
                     'C:\Program Files (x86)\Python312',
                     'C:\Python312')) {
        if (-not (Test-Path (Join-Path $c 'python.exe'))) { continue }
        if ($c -match '\\Users\\') { $perUser += $c } else { $usable += $c }
    }

    if ($usable) {
        $lines += 'There is a usable Python 3.12 on this machine - no username'
        $lines += 'in the path, so it is safe to point at:'
        $usable | ForEach-Object { $lines += "  $_" }
        $lines += ''
        $lines += 'Re-run with:'
        $lines += ("  Bootstrap.ps1 -From install -PythonHome `"{0}`"" -f $usable[0])
        $lines += 'or, for this script alone:'
        $lines += ("  20-install.ps1 -PythonHome `"{0}`" -SqlServer ... -SqlPassword ..." -f $usable[0])
    }
    elseif ($perUser) {
        $lines += 'The only Python 3.12 here is a PER-USER install:'
        $perUser | ForEach-Object { $lines += "  $_" }
        $lines += ''
        $lines += 'Do not point -PythonHome at it. The venv records that path'
        $lines += 'absolutely, so the next machine - with a different username -'
        $lines += 'breaks in exactly this way. Install it for all users instead:'
        $lines += '  powershell -ExecutionPolicy Bypass -File 05-prereqs.ps1 -Only python312'
    }
    else {
        $lines += 'No Python 3.12 found anywhere. Install it for all users:'
        $lines += '  powershell -ExecutionPolicy Bypass -File 05-prereqs.ps1 -Only python312'
        $lines += ''
        $lines += 'It must be 3.12 - not 3.11, not 3.13. Every compiled package'
        $lines += 'in the shipped venv is built for 3.12 and will not load on'
        $lines += 'anything else.'
    }
    throw ($lines -join [Environment]::NewLine)
}

$ver = & $pythonExe -c "import sys;print('.'.join(map(str,sys.version_info[:3])))"
if ($ver -notlike '3.12.*') {
    # Every compiled wheel in that 9 GB tree is cp312. 3.11 or 3.13 will import
    # pure-Python modules happily and then die on the first numpy import.
    throw "base Python is $ver - must be 3.12.x (the venv's wheels are all cp312)"
}
Write-Host "  base interpreter $ver at $pythonExe"

$new = @(
    "home = $PythonHome"
    'implementation = CPython'
    "version_info = $ver.final.0"
    "version = $ver"
    "executable = $pythonExe"
    "command = $pythonExe -m virtualenv $venv"
    'include-system-site-packages = false'
    "base-prefix = $PythonHome"
    "base-exec-prefix = $PythonHome"
    "base-executable = $pythonExe"
) -join "`r`n"
Set-FileText -Path $cfg -Text ($new + "`r`n") -What 'pyvenv.cfg'

if (-not $WhatIfOnly) {
    # Prove it before anything else depends on it. numpy is the right canary:
    # it is compiled, it is what every other package here pulls in, and a
    # mis-pointed venv fails on it immediately rather than three services later.
    $probe = & (Join-Path $venv 'Scripts\python.exe') -c "import numpy, sys; print(numpy.__version__, sys.version_info[:2])" 2>&1
    if ($LASTEXITCODE -ne 0) { throw "venv still broken after repointing: $probe" }
    Write-Host "  venv imports numpy $probe" -ForegroundColor Green
}

# ── 2. the folders services write into ─────────────────────────────────────
Write-Host "`n2. Working folders"

# UploadRoot is shared: DSRFQ.Web writes uploads through its own relative
# UploadSettings, and the consumer reads them back by absolute path. If this
# folder does not exist the web app creates it and the consumer silently finds
# nothing - a drawing that uploads fine and never converts.
foreach ($dir in @(
    "$InstallRoot\DSRFQ\DSRFQ.Web\App_Data\upload"
    "$InstallRoot\RPA\RFQ\ConvertedDrawing"
    "$InstallRoot\RPA\RFQ\replaced_img"
    "$InstallRoot\RPA\new_tsh\output"
    "$InstallRoot\logs"
)) {
    if (-not (Test-Path $dir)) {
        if ($WhatIfOnly) { Write-Host "  would create $dir" -ForegroundColor Yellow }
        else { New-Item -ItemType Directory -Path $dir -Force | Out-Null; Write-Host "  created $dir" -ForegroundColor Green }
    }
    else { Write-Host "  exists  $dir" }
}

# ── 3. connection strings ──────────────────────────────────────────────────
Write-Host "`n3. Databases"

# 3a. DSRFQ.Web
$appsettings = Join-Path $InstallRoot 'DSRFQ\DSRFQ.Web\appsettings.json'
if (Test-Path $appsettings) {
    $text = Get-Content $appsettings -Raw
    $conn = "Server=$SqlServer;Database=RFQ;User Id=$SqlUser;Password=$SqlPassword;TrustServerCertificate=true"
    $text = [regex]::Replace($text,
        '("Default"\s*:\s*\{\s*"ConnectionString"\s*:\s*")[^"]*(")',
        { param($m) $m.Groups[1].Value + $conn.Replace('\', '\\') + $m.Groups[2].Value })
    Set-FileText -Path $appsettings -Text $text -What 'appsettings.json connection string'
}
else { Write-Host "  MISSING $appsettings" -ForegroundColor Red }

# 3b. the consumer - both databases live in this one file
$configYaml = Join-Path $InstallRoot 'RPA\RFQ\config.yaml'
if (Test-Path $configYaml) {
    $text = Get-Content $configYaml -Raw
    $text = [regex]::Replace($text, '(?m)^(\s*Server:\s*).*$', "`${1}$SqlServer")
    $text = [regex]::Replace($text, '(?m)^(\s*Pwd:\s*).*$', "`${1}$SqlPassword")
    $text = [regex]::Replace($text, '(?m)^(\s*Host:\s*)deskdev\s*$', "`${1}$MySqlHost")
    Set-FileText -Path $configYaml -Text $text -What 'RFQ config.yaml (SQL + MySQL hosts)'
}
else { Write-Host "  MISSING $configYaml" -ForegroundColor Red }

# 3c. new_tsh
$tshEnv = Join-Path $InstallRoot 'RPA\new_tsh\.env'
if (Test-Path $tshEnv) {
    $text = Get-Content $tshEnv -Raw
    $text = [regex]::Replace($text, '(?m)^(DB_(?:LOCAL|REMOTE)_HOST=).*$', "`${1}$MySqlHost")
    $text = [regex]::Replace($text, '(?m)^(DB_(?:LOCAL|REMOTE)_PORT=).*$', "`${1}$MySqlPort")
    $text = [regex]::Replace($text, '(?m)^(DB_(?:LOCAL|REMOTE)_USER=).*$', "`${1}$MySqlUser")
    $text = [regex]::Replace($text, '(?m)^(DB_(?:LOCAL|REMOTE)_PASSWORD=).*$', "`${1}$MySqlPassword")
    Set-FileText -Path $tshEnv -Text $text -What 'new_tsh .env (MySQL)'
}
else { Write-Host "  MISSING $tshEnv" -ForegroundColor Red }

# ── 4. the one hardcoded path that is not config ───────────────────────────
Write-Host "`n4. Machine-specific paths"

# new_tsh runs its geometry on a SECOND interpreter - the 3.11 mamba env that
# carries pythonocc-core/OCCT, which has no pip wheel and cannot live in the
# 3.12 venv. Unset, api.py falls back to sys.executable and every quote fails
# with MissingGeometryError; setting it here is cheaper than debugging that.
$geometry = Join-Path $InstallRoot 'RPA\new_tsh\.mamba\envs\baojia\python.exe'
if (Test-Path $geometry) {
    if ($WhatIfOnly) { Write-Host "  would set NEW_TSH_GEOMETRY_PYTHON=$geometry" -ForegroundColor Yellow }
    else {
        [Environment]::SetEnvironmentVariable('NEW_TSH_GEOMETRY_PYTHON', $geometry, 'Machine')
        Write-Host "  set NEW_TSH_GEOMETRY_PYTHON (machine scope)" -ForegroundColor Green
    }
}
else { Write-Host "  MISSING $geometry - new_tsh geometry will fail" -ForegroundColor Red }

Write-Host "`nNext: 30-services.ps1, then 40-verify.ps1" -ForegroundColor Cyan
if ($changed.Count) {
    Write-Host "`nFiles changed:"
    $changed | ForEach-Object { Write-Host "  $_" }
}
