#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Let other machines on the Tailscale network open OneZera / DSRFQ.

.DESCRIPTION
  Two inbound ports, both limited to Tailscale's address range (100.64.0.0/10)
  so the app is not exposed to the café Wi-Fi or the office LAN:

    5001   the web app
    15675  RabbitMQ web MQTT - the live progress bars in the costing grid and
           the ballooning widget connect to it straight from the browser

  The web app itself must listen on 0.0.0.0:5001 (the control panel and the
  installed service both do). Safe to run again: existing rules are replaced.
#>

$ErrorActionPreference = 'Stop'
$range = '100.64.0.0/10'

$rules = @(
    @{ Name = 'OneZera-Web-Tailscale';     Port = 5001;  What = 'DSRFQ web app' },
    @{ Name = 'OneZera-WebMqtt-Tailscale'; Port = 15675; What = 'RabbitMQ web MQTT (progress bars)' }
)

foreach ($r in $rules) {
    Get-NetFirewallRule -Name $r.Name -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    New-NetFirewallRule -Name $r.Name -DisplayName $r.Name `
        -Description "Inbound $($r.What) from Tailscale peers only." `
        -Direction Inbound -Action Allow -Protocol TCP -LocalPort $r.Port `
        -RemoteAddress $range -Profile Any | Out-Null
    Write-Host "  allowed TCP $($r.Port) from $range  ($($r.What))"
}

$ip = (& tailscale ip -4 2>$null | Select-Object -First 1)
if ($ip) { Write-Host "`nOthers on the tailnet can now open  http://${ip}:5001" }
