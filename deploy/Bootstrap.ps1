<#
.SYNOPSIS
    Installs DSRFQ on a clean Windows machine, start to finish.

.DESCRIPTION
    The one thing an operator runs. It is a few hundred KB, not gigabytes: the
    prerequisites come from their own publishers and the payload streams in
    parts, both resumable and both verified.

    Order matters, and each step is a script you can run on its own if one fails:

      00-preflight     is this machine capable at all
      05-prereqs       Python, .NET, ODBC, Tesseract, RabbitMQ, databases, Ollama
      06-fetch-payload download, verify and extract ~13 GB of code and models
      15-secrets       ask for the credentials the payload was published without
      20-install       repoint the venv, rewrite machine-specific config
      30-services      register the NSSM services
      40-verify        prove it actually came up

    Safe to re-run. Every step detects what is already done - installed
    prerequisites are skipped, verified payload parts are not re-downloaded, and
    credentials already written are not asked for again - so a failure at step 5
    costs step 5, not the whole install.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File Bootstrap.ps1

.EXAMPLE
    # Databases live on another server.
    powershell -ExecutionPolicy Bypass -File Bootstrap.ps1 `
        -SkipPrereqs sqlexpress,mysql -SqlServer sqlbox,1433
#>
[CmdletBinding()]
param(
    [string]   $InstallRoot = 'C:\Aizera',
    # The base CPython 3.12 the venv resolves against. Empty means "find it" -
    # 20-install.ps1 probes the username-free locations. Passed through here
    # because the machine that needs to override it is the machine running the
    # bootstrapper, and having to drop down to 20-install.ps1 by hand for one
    # argument makes the orchestration pointless.
    [string]   $PythonHome  = '',
    [string]   $SqlServer   = 'localhost',
    [string]   $MySqlHost   = 'localhost',
    [int]      $MySqlPort   = 3307,
    [string[]] $SkipPrereqs = @(),
    # The payload is already at $InstallRoot - copied from a USB drive rather
    # than downloaded. Skips the fetch and extract, and nothing else: the
    # credentials, the venv repointing and the services are all still needed,
    # because a copied tree is a scrubbed tree that has never been installed.
    [switch]   $SkipPayload,
    # Begin at a later step, after fixing something by hand.
    [ValidateSet('preflight','prereqs','payload','secrets','install','services','verify')]
    [string]   $From = 'preflight',
    [switch]   $WhatIfOnly
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$order = @('preflight','prereqs','payload','secrets','install','services','verify')
$startAt = $order.IndexOf($From)

function Should([string] $step) { return $order.IndexOf($step) -ge $startAt }

function Step {
    param([string] $Name, [string] $Title, [scriptblock] $Body)
    if (-not (Should $Name)) {
        Write-Host "`n--- $Title  (skipped, -From $From)" -ForegroundColor DarkGray
        return
    }
    Write-Host "`n=====================================================================" -ForegroundColor Cyan
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host "=====================================================================" -ForegroundColor Cyan
    & $Body
    if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
        Write-Host "`n'$Title' failed (exit $LASTEXITCODE)." -ForegroundColor Red
        Write-Host "Fix it, then continue with:  Bootstrap.ps1 -From $Name" -ForegroundColor Yellow
        exit $LASTEXITCODE
    }
}

# Elevation is needed by almost every step - service registration, installs
# into Program Files, writing to ProgramData. Better to say so now than to
# fail three steps in with an access-denied nobody reads.
$admin = ([Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin -and -not $WhatIfOnly) {
    Write-Host "`nRun this from an elevated PowerShell - it installs services." -ForegroundColor Red
    Write-Host "To see what it WOULD do without elevation:  Bootstrap.ps1 -WhatIfOnly" -ForegroundColor Yellow
    exit 1
}
if (-not $admin) {
    # -WhatIfOnly writes nothing, so refusing to run it unelevated only meant
    # nobody could rehearse the install before committing to it.
    Write-Host "`nNot elevated - this is a dry run and will change nothing." -ForegroundColor Yellow
}

Write-Host @"

  DSRFQ bootstrap
  ---------------
  Install root : $InstallRoot
  SQL Server   : $SqlServer
  MySQL        : ${MySqlHost}:$MySqlPort

  Nothing here is redistributed software. Prerequisites are fetched from their
  own publishers; the payload is your code and models, published without
  credentials, which step 4 asks for.
"@ -ForegroundColor White

Step 'preflight' '1/7  Preflight - is this machine capable' {
    & powershell -ExecutionPolicy Bypass -File (Join-Path $here '00-preflight.ps1') `
        -InstallRoot $InstallRoot -SqlServer $SqlServer -MySqlHost $MySqlHost -MySqlPort $MySqlPort
    # Preflight fails on things this bootstrapper is about to install, so a
    # non-zero here is information rather than a stop.
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`nPreflight reported blockers. Most are installed by the next step;" -ForegroundColor Yellow
        Write-Host "a missing GPU or too little disk is not - read the list above." -ForegroundColor Yellow
        if (-not $WhatIfOnly) {
            $go = Read-Host "`nContinue? (y/N)"
            if ($go -ne 'y') { exit 1 }
        }
    }
    $global:LASTEXITCODE = 0
}

Step 'prereqs' '2/7  Prerequisites' {
    $a = @('-ExecutionPolicy','Bypass','-File',(Join-Path $here '05-prereqs.ps1'))
    if ($SkipPrereqs.Count) { $a += @('-Skip', ($SkipPrereqs -join ',')) }
    if ($WhatIfOnly)        { $a += '-WhatIfOnly' }
    & powershell @a
}

Step 'payload' '3/7  Payload' {
    if ($WhatIfOnly) { Write-Host 'WhatIf: would download and extract the payload.'; $global:LASTEXITCODE = 0; return }
    if ($SkipPayload) {
        # Checked rather than taken on trust: "-SkipPayload with nothing there"
        # would otherwise fail three steps later, repointing a venv that does
        # not exist, and read as a broken installer rather than a missed copy.
        $marker = Join-Path $InstallRoot 'DSRFQ\DSRFQ.Web\DSRFQ.Web.dll'
        if (-not (Test-Path $marker)) {
            Write-Host "-SkipPayload was given, but the payload is not at $InstallRoot." -ForegroundColor Red
            Write-Host "Expected to find: $marker" -ForegroundColor Red
            $global:LASTEXITCODE = 1
            return
        }
        Write-Host "Payload already present at $InstallRoot - not downloading." -ForegroundColor Green
        $global:LASTEXITCODE = 0
        return
    }
    & powershell -ExecutionPolicy Bypass -File (Join-Path $here '06-fetch-payload.ps1') `
        -InstallRoot $InstallRoot
}

Step 'secrets' '4/7  Credentials' {
    if ($WhatIfOnly) { Write-Host 'WhatIf: would prompt for credentials.'; $global:LASTEXITCODE = 0; return }
    & powershell -ExecutionPolicy Bypass -File (Join-Path $here '15-secrets.ps1') `
        -InstallRoot $InstallRoot
}

Step 'install' '5/7  Repoint the venv and rewrite config' {
    if ($WhatIfOnly) { Write-Host 'WhatIf: would run 20-install.ps1.'; $global:LASTEXITCODE = 0; return }
    # 20-install.ps1 wants the SQL password on the command line. It has already
    # been written into the config by step 4, so it is read back rather than
    # asked for a second time.
    $appsettings = Join-Path $InstallRoot 'DSRFQ\DSRFQ.Web\appsettings.json'
    $sqlPw = ''
    if (Test-Path $appsettings) {
        $m = [regex]::Match((Get-Content $appsettings -Raw), 'Password=([^";]*)')
        if ($m.Success) { $sqlPw = $m.Groups[1].Value }
    }
    if (-not $sqlPw -or $sqlPw -eq '__SQL_PASSWORD__') {
        Write-Host 'The SQL password is still unset - run step 4 first.' -ForegroundColor Red
        $global:LASTEXITCODE = 1; return
    }
    $installArgs = @(
        '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $here '20-install.ps1'),
        '-InstallRoot', $InstallRoot, '-SqlServer', $SqlServer,
        '-SqlPassword', $sqlPw, '-MySqlHost', $MySqlHost, '-MySqlPort', $MySqlPort
    )
    # Only when set: passing -PythonHome '' would override the auto-detection
    # with an empty string and put us straight back at "not found".
    if ($PythonHome) { $installArgs += @('-PythonHome', $PythonHome) }
    & powershell @installArgs
}

Step 'services' '6/7  Windows services' {
    if ($WhatIfOnly) { Write-Host 'WhatIf: would register the NSSM services.'; $global:LASTEXITCODE = 0; return }
    & powershell -ExecutionPolicy Bypass -File (Join-Path $here '30-services.ps1')
    Get-Service DSRFQ-* -ErrorAction SilentlyContinue | Start-Service -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 20   # the model services load weights before they bind
}

Step 'verify' '7/7  Verify' {
    if ($WhatIfOnly) { Write-Host 'WhatIf: would run 40-verify.ps1.'; $global:LASTEXITCODE = 0; return }
    & powershell -ExecutionPolicy Bypass -File (Join-Path $here '40-verify.ps1')
}

Write-Host @"

=====================================================================
 Done.
=====================================================================

  DSRFQ           http://localhost:5001
  RabbitMQ        http://localhost:15672
  Control panel   $InstallRoot\RPA\control-panel

  Still by hand, and deliberately so:
    * Bubble-V6 (4.7 GB, licensed) - copy it and its config\license.dat, then
      start it from a Startup shortcut. It cannot run as a service.
    * Reference data - FluentMigrator builds the RFQ schema on first run, but
      materials, machines and currencies need restoring. tsh_new has no
      migrations at all: dump and restore it.

  See README.md.
"@ -ForegroundColor Green
