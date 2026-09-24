<#
.SYNOPSIS
    Registers every DSRFQ service with NSSM so the box comes back on its own
    after a reboot.

.DESCRIPTION
    Run on the TARGET as Administrator, after 20-install.ps1.

    One service per port, named DSRFQ-*, each with its own log pair under
    C:\Aizera\logs. Deliberately NOT the control panel: that is an operator
    tool you open when something looks wrong, not a supervisor - close it and
    everything it started dies with it.

    Bubble-V6 is absent from this list on purpose. See the note at the bottom.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File 30-services.ps1
    powershell -ExecutionPolicy Bypass -File 30-services.ps1 -Remove
#>
[CmdletBinding()]
param(
    [string] $InstallRoot = 'C:\Aizera',
    [string] $LogRoot = 'C:\Aizera\logs',
    # Empty means "work it out": a copy shipped beside these scripts wins, and
    # the payload's own copy is the fallback. That order matters for the
    # bootstrapper, which registers services from a folder the operator
    # unzipped - possibly before, or without, the payload's tools folder.
    [string] $Nssm = '',
    # Tear them all down again.
    [switch] $Remove
)

$ErrorActionPreference = 'Stop'

if (-not $Nssm) {
    $candidates = @(
        (Join-Path $PSScriptRoot 'tools\nssm.exe')
        (Join-Path $InstallRoot 'RPA\table-recognize-3parts\tools\nssm.exe')
    )
    $Nssm = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $Nssm) {
        throw "nssm.exe not found. Looked in:`n  " + ($candidates -join "`n  ")
    }
}

$admin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
         ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { throw 'Run this elevated - registering a service needs Administrator.' }
if (-not (Test-Path $Nssm)) { throw "nssm.exe not found at $Nssm" }

$python = Join-Path $InstallRoot 'RPA\PythonLibrary\.venv\Scripts\python.exe'
$dotnet = (Get-Command dotnet).Source

# Order matters on boot: the recognition services take 40-120s to load their
# models before they bind, and the consumer starts handing them work the moment
# it is up. NSSM has no dependency graph, so this is expressed as a start delay
# rather than a hope - Delayed sits behind the automatic ones, and the consumer
# is last because it is the only thing that CALLS all the others.
$services = @(
    @{ Id = 'OneZera-Web';            Display = 'OneZera Web (5001)'
       Exe = $dotnet; Args = 'DSRFQ.Web.dll'
       Dir = "$InstallRoot\DSRFQ\DSRFQ.Web"
       Env = @('ASPNETCORE_ENVIRONMENT=Production',
               # 0.0.0.0: every interface, so other machines on the Tailscale
               # network can open it. localhost would refuse them all.
               'ASPNETCORE_URLS=http://0.0.0.0:5001',
               # The app targets net8.0. Harmless when the 8.x runtime is
               # present; the difference between working and not when only a
               # later major is installed.
               'DOTNET_ROLL_FORWARD=Major') }

    @{ Id = 'OneZera-TableRecognize'; Display = 'OneZera Table Recognize (3600)'
       Exe = $python; Args = 'api.py'
       Dir = "$InstallRoot\RPA\table-recognize-3parts"
       Env = @("NVIDIA_DLL_ROOT=$InstallRoot\RPA\PythonLibrary\.venv\Lib\site-packages\nvidia") }

    @{ Id = 'OneZera-ReplaceApi';     Display = 'OneZera REPLACE API (3500)'
       Exe = $python; Args = 'api.py'
       Dir = "$InstallRoot\RPA\REPLACE-api-v2\REPLACE-api-v2" }

    @{ Id = 'OneZera-TableToJson';    Display = 'OneZera Table to JSON (3501)'
       Exe = $python; Args = 'main.py'
       Dir = "$InstallRoot\RPA\table-to-json" }

    @{ Id = 'OneZera-NewTsh';         Display = 'OneZera new_tsh (8888)'
       Exe = $python; Args = 'api.py'
       Dir = "$InstallRoot\RPA\new_tsh"
       Env = @("NEW_TSH_GEOMETRY_PYTHON=$InstallRoot\RPA\new_tsh\.mamba\envs\baojia\python.exe") }

    @{ Id = 'OneZera-RpaApi';         Display = 'OneZera RPA API (8000)'
       Exe = $python; Args = 'api.py'
       Dir = "$InstallRoot\RPA\API" }

    @{ Id = 'OneZera-Consumer';       Display = 'OneZera RFQ Consumer'
       Exe = $python; Args = 'rabbitMQ.py'
       Dir = "$InstallRoot\RPA\RFQ"
       # Every module in RFQ opens config.yaml relative to the working
       # directory. AppDirectory below is what makes that resolve; get it wrong
       # and the service starts, reads nothing, and waits forever on a queue it
       # never connected to.
       Delayed = $true }
)

if ($Remove) {
    foreach ($s in $services) {
        if (Get-Service -Name $s.Id -ErrorAction SilentlyContinue) {
            & $Nssm stop $s.Id confirm | Out-Null
            & $Nssm remove $s.Id confirm | Out-Null
            Write-Host "  removed $($s.Id)" -ForegroundColor Yellow
        }
    }
    Write-Host "`nAll DSRFQ services removed." -ForegroundColor Cyan
    return
}

New-Item -ItemType Directory -Path $LogRoot -Force | Out-Null

foreach ($s in $services) {
    if (-not (Test-Path $s.Dir)) {
        Write-Host ("  SKIP  {0,-22} {1}" -f $s.Id, "missing $($s.Dir)") -ForegroundColor Yellow
        continue
    }
    if (Get-Service -Name $s.Id -ErrorAction SilentlyContinue) {
        & $Nssm stop $s.Id confirm | Out-Null
        & $Nssm remove $s.Id confirm | Out-Null
    }

    & $Nssm install $s.Id $s.Exe $s.Args | Out-Null
    & $Nssm set $s.Id DisplayName $s.Display | Out-Null
    & $Nssm set $s.Id AppDirectory $s.Dir | Out-Null
    & $Nssm set $s.Id Start $(if ($s.Delayed) { 'SERVICE_DELAYED_AUTO_START' } else { 'SERVICE_AUTO_START' }) | Out-Null

    # Both streams to disk, rotated at 16 MB. Without this a service that
    # crash-loops leaves no trace at all - NSSM discards stdout by default.
    & $Nssm set $s.Id AppStdout "$LogRoot\$($s.Id).out.log" | Out-Null
    & $Nssm set $s.Id AppStderr "$LogRoot\$($s.Id).err.log" | Out-Null
    & $Nssm set $s.Id AppRotateFiles 1 | Out-Null
    & $Nssm set $s.Id AppRotateBytes 16777216 | Out-Null

    # UTF-8, or the first non-ASCII character a Python service prints kills it
    # under cp1252 - the same failure that stops Bubble-V6 running headless.
    $env_ = @('PYTHONIOENCODING=utf-8', 'PYTHONUTF8=1')
    if ($s.Env) { $env_ += $s.Env }
    & $Nssm set $s.Id AppEnvironmentExtra $env_ | Out-Null

    # Restart on exit, backing off, but give up after repeated instant failures
    # rather than spinning: a service that dies in under 5s is misconfigured,
    # not unlucky, and a restart loop only buries the reason in the log.
    & $Nssm set $s.Id AppExit Default Restart | Out-Null
    & $Nssm set $s.Id AppRestartDelay 10000 | Out-Null
    & $Nssm set $s.Id AppThrottle 5000 | Out-Null

    Write-Host ("  installed {0,-22} {1}" -f $s.Id, $s.Display) -ForegroundColor Green
}

Write-Host "`nStart them with:  Get-Service OneZera-* | Start-Service" -ForegroundColor Cyan
Write-Host @"

NOT registered, on purpose:

  Bubble-V6 (5999)   It refuses to start without a real console - verified
                     dying when redirected, to DEVNULL, and with both
                     PYTHONIOENCODING and PYTHONUTF8 set. A Windows service has
                     no console, so NSSM cannot host it. Run it from a Startup
                     shortcut or a Task Scheduler task set to "Run only when
                     user is logged on", on a box with autologon.

  RabbitMQ           Ships as a container. Either keep Docker Desktop and
                     `docker compose -f docker-compose.rabbitmq.yml up -d`, or
                     install Erlang + RabbitMQ natively, which is the steadier
                     choice on a machine nobody logs into.

  Ollama             Installs its own service.
"@ -ForegroundColor DarkGray
