<#
.SYNOPSIS
    Puts the credentials back, after the payload arrived without them.

.DESCRIPTION
    Run on the TARGET, after 06-fetch-payload.ps1.

    11-publish-payload.ps1 replaced every credential with a placeholder so the
    hosted artefact carries none. This asks for them and writes them into the
    installed files. Nothing is stored anywhere else and nothing is echoed.

    Blank is a valid answer for anything not marked required: the placeholder
    stays, and the feature that needs it fails with a recognisable token in the
    error rather than with a puzzling authentication failure.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File 15-secrets.ps1

.EXAMPLE
    # Unattended, from a secret store. Must be called IN-PROCESS: a hashtable
    # cannot survive `powershell -File`, where every argument is a string.
    & .\15-secrets.ps1 -Answers @{ '__SQL_PASSWORD__' = $pw }

.EXAMPLE
    # What is still unset, for a health check after an unattended install.
    powershell -ExecutionPolicy Bypass -File 15-secrets.ps1 -CheckOnly
#>
[CmdletBinding()]
param(
    [string]    $InstallRoot = 'C:\Aizera',
    # Token -> value, for unattended runs. Anything absent is prompted for,
    # unless -NonInteractive.
    [hashtable] $Answers = @{},
    # Never prompt. Anything not in -Answers is left as a placeholder, and a
    # REQUIRED one is an error.
    #
    # Not a convenience: without it an unattended caller that forgets one token
    # blocks on Read-Host forever, with no output to say why. A deployment
    # script that hangs silently is worse than one that fails.
    [switch]    $NonInteractive,
    # List what is still a placeholder and change nothing.
    [switch]    $CheckOnly
)

$ErrorActionPreference = 'Stop'
$secrets = Import-PowerShellDataFile (Join-Path $PSScriptRoot 'Secrets.psd1')

Write-Host "`nDSRFQ credentials" -ForegroundColor Cyan

if ($CheckOnly) {
    $outstanding = @()
    foreach ($p in $secrets.Prompts) {
        foreach ($rel in $p.Files) {
            $path = Join-Path $InstallRoot $rel
            if (-not (Test-Path $path)) { continue }
            if ((Get-Content $path -Raw) -match [regex]::Escape($p.Token)) {
                $outstanding += "$($p.Token) in $rel"
            }
        }
    }
    if ($outstanding.Count) {
        Write-Host "`nStill unset:" -ForegroundColor Yellow
        $outstanding | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        exit 1
    }
    Write-Host "`nEvery placeholder has been filled in." -ForegroundColor Green
    exit 0
}

Write-Host "These were removed before this payload was published. Nothing you type"
Write-Host "is echoed or written anywhere but the files listed.`n" -ForegroundColor DarkGray

$written = 0
foreach ($p in $secrets.Prompts) {
    # Only ask about tokens that are actually still present - a re-run after a
    # partial install should not ask again for what is already set.
    $present = @($p.Files | Where-Object {
        $path = Join-Path $InstallRoot $_
        (Test-Path $path) -and ((Get-Content $path -Raw) -match [regex]::Escape($p.Token))
    })
    if (-not $present.Count) {
        Write-Host "  $($p.Label)" -ForegroundColor DarkGray
        Write-Host "      already set - not asking again" -ForegroundColor DarkGray
        continue
    }

    $value = $null
    if ($Answers.ContainsKey($p.Token)) {
        $value = [string]$Answers[$p.Token]
    }
    elseif ($NonInteractive) {
        if ($p.Required) {
            Write-Host "  $($p.Label)" -ForegroundColor Red
            Write-Host "      required, and -NonInteractive was given with no answer for $($p.Token)" -ForegroundColor Red
            exit 1
        }
        Write-Host "  $($p.Label)" -ForegroundColor DarkGray
        Write-Host "      no answer supplied - left as a placeholder" -ForegroundColor Yellow
        continue
    }
    else {
        Write-Host "  $($p.Label)" -ForegroundColor White
        Write-Host "      used by: $($present -join ', ')" -ForegroundColor DarkGray
        $secure = Read-Host "      value" -AsSecureString
        $value = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
    }

    if ([string]::IsNullOrEmpty($value)) {
        if ($p.Required) {
            Write-Host "      required - cannot be left blank" -ForegroundColor Red
            exit 1
        }
        Write-Host "      left unset" -ForegroundColor Yellow
        continue
    }

    foreach ($rel in $present) {
        $path = Join-Path $InstallRoot $rel
        $text = Get-Content $path -Raw
        # Literal replace, not regex: a password containing $ or \ would
        # otherwise be mangled into something that neither matches nor errors.
        Set-Content -Path $path -Value $text.Replace($p.Token, $value) `
                    -Encoding UTF8 -NoNewline
        $written++
    }
    Write-Host "      written to $($present.Count) file(s)" -ForegroundColor Green
}

Write-Host "`n$written file(s) updated." -ForegroundColor Green
Write-Host "Check with:  powershell -File 15-secrets.ps1 -CheckOnly" -ForegroundColor DarkGray
