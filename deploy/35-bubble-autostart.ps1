<#
.SYNOPSIS
  Start the Ballooning Model (Bubble-V6, port 5999) automatically when the user logs on.

.DESCRIPTION
  Every other service is an NSSM Windows service (30-services.ps1). Bubble-V6
  cannot be one: its licence check writes to a real console and dies with a
  cp1252 UnicodeEncodeError without one, and a Windows service has no console
  (README, "Bubble-V6 is not a service").

  So it is a Task Scheduler task instead:
    * trigger   at logon of this user, after a short delay so the desktop is up
    * runs      only while that user is logged on - which is what gives it a
                console window. Leave the window open; closing it stops the model.
    * restarts  up to 3 times, a minute apart, if it exits with an error
    * no time limit (the default task limit of 3 days would kill it)

  For start at power-on with nobody at the keyboard, also turn on Windows
  autologon for this account (Sysinternals Autologon), since the task needs a
  logged-on session.

  Run as the user who will be logged on - not elevated as someone else. Safe to
  run again: the task is replaced.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File 35-bubble-autostart.ps1

.EXAMPLE
  # Start it now as well, and wait until it answers.
  powershell -ExecutionPolicy Bypass -File 35-bubble-autostart.ps1 -StartNow

.EXAMPLE
  # Remove the task.
  powershell -ExecutionPolicy Bypass -File 35-bubble-autostart.ps1 -Remove
#>
[CmdletBinding()]
param(
    [string] $BubbleDir = 'C:\Aizera\Bubble\Bubble-V6',
    [int]    $DelaySeconds = 60,
    [switch] $StartNow,
    [switch] $Remove
)

$ErrorActionPreference = 'Stop'
$taskName = 'OneZera-BallooningModel'

if ($Remove) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Removed scheduled task $taskName."
    return
}

$exe = Join-Path $BubbleDir 'Bubble.exe'
if (-not (Test-Path $exe)) { throw "Bubble.exe not found at $exe - copy Bubble-V6 there first (it is not in the payload)." }
if (-not (Test-Path (Join-Path $BubbleDir 'config\license.dat'))) {
    Write-Warning "config\license.dat is missing - the model will refuse to start."
}

$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

$action    = New-ScheduledTaskAction -Execute $exe -WorkingDirectory $BubbleDir
$trigger   = New-ScheduledTaskTrigger -AtLogOn -User $user
$trigger.Delay = "PT${DelaySeconds}S"
# Interactive = "run only when user is logged on": the task gets the user's
# desktop, so Bubble.exe opens with the console it needs.
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$settings  = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Force `
    -Description 'OneZera Ballooning Model (Bubble-V6, port 5999). Needs a console, so it runs at logon rather than as a service.' | Out-Null

Write-Host "Registered '$taskName': starts $exe $DelaySeconds s after $user logs on."

if ($StartNow) {
    $up = $false
    try { $up = (Invoke-WebRequest http://localhost:5999/docs -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200 } catch {}
    if ($up) {
        Write-Host "Already answering on 5999 - not starting a second copy."
    } else {
        Start-ScheduledTask -TaskName $taskName
        Write-Host "Started. Waiting for http://localhost:5999/docs (model loading takes a minute or two)..."
        for ($i = 0; $i -lt 60 -and -not $up; $i++) {
            Start-Sleep -Seconds 5
            try { $up = (Invoke-WebRequest http://localhost:5999/docs -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200 } catch {}
        }
        if ($up) { Write-Host "Ballooning Model is up." -ForegroundColor Green }
        else { Write-Warning "Not answering after 5 minutes - look at the Bubble.exe console window." }
    }
}
