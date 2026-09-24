#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Make OneZera / DSRFQ reachable from the Tailscale network - no rebinding, no firewall rules.

.DESCRIPTION
  Run once, as administrator, at this machine's console:

      powershell -ExecutionPolicy Bypass -File 41-tailscale-serve.ps1

  1. Installs Tailscale if it is missing (winget, else the official MSI).
  2. Signs this machine in to your tailnet - a browser opens (or a login URL is
     printed); approve it with your Tailscale account.
  3. Publishes the two ports the app needs with `tailscale serve`, which
     forwards tailnet traffic to localhost:
        5001   the web app              http://<machine>:5001
        15675  RabbitMQ web MQTT        live progress in the grid and ballooning
     The web app keeps listening on localhost only, and no inbound firewall rule
     is opened - only devices signed in to your tailnet can connect.

  `serve --bg` settings are stored by Tailscale and come back after a reboot.
  Safe to run again. To undo:  tailscale serve reset

  (40-tailscale-access.ps1 is the other way: bind the app to 0.0.0.0 and open
  the firewall to 100.64.0.0/10. This script needs neither.)
#>
[CmdletBinding()]
param(
    [int] $WebPort = 5001,
    [int] $MqttPort = 15675
)

$ErrorActionPreference = 'Stop'

function Find-Tailscale {
    foreach ($p in @("$env:ProgramFiles\Tailscale\tailscale.exe", "${env:ProgramFiles(x86)}\Tailscale\tailscale.exe")) {
        if ($p -and (Test-Path $p)) { return $p }
    }
    $cmd = Get-Command tailscale -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

# -- 1. install ----------------------------------------------------------------
$ts = Find-Tailscale
if (-not $ts) {
    Write-Host "Installing Tailscale..." -ForegroundColor Yellow
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        & winget install --id Tailscale.Tailscale -e --silent --accept-package-agreements --accept-source-agreements
    } else {
        $msi = Join-Path $env:TEMP 'tailscale-setup.msi'
        Invoke-WebRequest 'https://pkgs.tailscale.com/stable/tailscale-setup-latest-amd64.msi' -OutFile $msi -UseBasicParsing
        Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /quiet /norestart" -Wait
    }
    Start-Sleep -Seconds 5
    $ts = Find-Tailscale
    if (-not $ts) { throw "Tailscale did not install - install it from https://tailscale.com/download and run this again." }
}
Write-Host "Tailscale: $ts"

# -- 2. sign in ----------------------------------------------------------------
$ip = (& $ts ip -4 2>$null | Select-Object -First 1)
if (-not $ip) {
    Write-Host "`nSigning this machine in to your tailnet - approve it in the browser that opens." -ForegroundColor Yellow
    & $ts up --unattended
    $ip = (& $ts ip -4 2>$null | Select-Object -First 1)
    if (-not $ip) { throw "Not signed in to Tailscale yet. Finish the login, then run this script again." }
}

# --unattended keeps the connection up with nobody logged in, so the app stays
# reachable after a reboot even before anyone signs in to Windows.
& $ts set --unattended=true 2>$null | Out-Null

# -- 3. publish ----------------------------------------------------------------
& $ts serve --bg --http=$WebPort "http://127.0.0.1:$WebPort"
if ($LASTEXITCODE -ne 0) { throw "tailscale serve for $WebPort failed" }
& $ts serve --bg --tcp=$MqttPort "tcp://127.0.0.1:$MqttPort"
if ($LASTEXITCODE -ne 0) { throw "tailscale serve for $MqttPort failed" }

Write-Host "`nPublished on the tailnet:" -ForegroundColor Green
& $ts serve status

$name = $null
try { $name = ((& $ts status --json | ConvertFrom-Json).Self.DNSName).TrimEnd('.') } catch {}
Write-Host ""
Write-Host "Others on the tailnet can open:" -ForegroundColor Green
Write-Host "  http://${ip}:$WebPort"
if ($name) { Write-Host "  http://${name}:$WebPort" }
