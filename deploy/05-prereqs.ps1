<#
.SYNOPSIS
    Downloads and installs the third-party software DSRFQ needs.

.DESCRIPTION
    Run on the TARGET, elevated, before the payload arrives.

    Everything here comes from its own publisher rather than from an archive you
    hand out - see Prerequisites.psd1 for why that matters. Anything already
    installed is detected and skipped, so this is safe to re-run after a failure
    and will not replace a Python or a SQL Server the machine already had.

    Downloads are cached in C:\ProgramData\DSRFQ-Setup\downloads and resume, so
    a dropped connection costs the remainder of one file rather than all 7 GB.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File 05-prereqs.ps1

.EXAMPLE
    # Databases live elsewhere; do not install engines on this box.
    powershell -ExecutionPolicy Bypass -File 05-prereqs.ps1 -Skip sqlexpress,mysql
#>
[CmdletBinding()]
param(
    # Keys from Prerequisites.psd1 to leave out.
    [string[]] $Skip = @(),
    # Only these keys. Handy for repairing one item.
    [string[]] $Only = @(),
    # Report what would happen and download nothing.
    [switch]   $WhatIfOnly
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Fetch.psm1') -Force

$manifest = Import-PowerShellDataFile (Join-Path $PSScriptRoot 'Prerequisites.psd1')
# Import-PowerShellDataFile refuses scriptblocks, so Detect/Post arrive as
# strings. Re-created here rather than being invoked as text, so a manifest
# entry cannot smuggle in arbitrary code from anywhere but this folder.
$raw = Get-Content (Join-Path $PSScriptRoot 'Prerequisites.psd1') -Raw
$manifest = Invoke-Expression $raw

$cache = $manifest.CacheDir
New-Item -ItemType Directory -Force -Path $cache | Out-Null

Write-Host "`nDSRFQ prerequisites - $env:COMPUTERNAME" -ForegroundColor Cyan
Write-Host "Cache: $cache`n"

$items = $manifest.Items
if ($Only.Count) { $items = $items | Where-Object { $Only -contains $_.Key } }
if ($Skip.Count) { $items = $items | Where-Object { $Skip -notcontains $_.Key } }

$installed = 0; $skipped = 0; $failed = @()
# NOT `Measure-Object SizeMB`: -Property reads PSObject properties, and these
# are Hashtables, whose keys are not properties. $item.SizeMB works, so the sum
# has to be taken through member access. Measure-Object throws
# "The property SizeMB cannot be found in the input for any objects" otherwise -
# on the very first thing this script prints.
$totalMB = ($items | ForEach-Object { $_.SizeMB } | Measure-Object -Sum).Sum
# Post-install downloads count too. Ollama's installer is 700 MB and then pulls
# a 6 GB model, so an installer-only total tells the operator to expect 1.6 GB
# and leaves them wondering why it is still going an hour later.
$postMB = ($items | ForEach-Object { if ($_.ContainsKey('PostMB')) { $_.PostMB } } |
           Measure-Object -Sum).Sum
Write-Host "$($items.Count) item(s), about $([math]::Round(($totalMB + $postMB)/1024,1)) GB if none are present yet."
if ($postMB) {
    Write-Host "  (includes $([math]::Round($postMB/1024,1)) GB of models pulled after install)`n" -ForegroundColor DarkGray
} else { Write-Host "" }

foreach ($item in $items) {
    Write-Host "  $($item.Name)" -ForegroundColor White

    $already = $false
    try { $already = [bool](& $item.Detect) } catch { $already = $false }
    if ($already) {
        Write-Host "      already installed - left alone" -ForegroundColor Green
        $skipped++
        continue
    }
    Write-Host "      $($item.Why)" -ForegroundColor DarkGray

    if ($WhatIfOnly) {
        Write-Host "      WOULD download $($item.SizeMB) MB and install" -ForegroundColor Yellow
        continue
    }

    $target = Join-Path $cache $item.File
    if (-not $item.Sha256) {
        Write-Host "      no hash pinned for this URL - cannot verify the download" -ForegroundColor Yellow
    }

    if (-not (Get-FileResumable -Uri $item.Uri -OutFile $target -Sha256 $item.Sha256)) {
        Write-Host "      DOWNLOAD FAILED" -ForegroundColor Red
        $failed += $item.Name
        continue
    }

    try {
        $interactive = $item.ContainsKey('Interactive') -and $item.Interactive
        if ($interactive) {
            Write-Host "      launching the installer - it asks questions this script must not answer" -ForegroundColor Yellow
            Write-Host "      (instance name, sa password, mixed-mode auth)" -ForegroundColor DarkGray
        }

        if ($target.ToLower().EndsWith('.msi')) {
            $msiArgs = "/i `"$target`" $($item.Args)"
            $p = Start-Process msiexec.exe -ArgumentList $msiArgs -Wait -PassThru
        }
        elseif ($item.Args) {
            $p = Start-Process $target -ArgumentList $item.Args -Wait -PassThru
        }
        else {
            $p = Start-Process $target -Wait -PassThru
        }

        # 3010 is "installed, wants a reboot" and is a success, not a failure.
        if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) {
            throw "installer exited $($p.ExitCode)"
        }

        if ($item.ContainsKey('Post') -and $item.Post) {
            try { & $item.Post }
            catch { Write-Host "      post-install step failed: $($_.Exception.Message)" -ForegroundColor Yellow }
        }

        Write-Host "      installed" -ForegroundColor Green
        $installed++
    }
    catch {
        Write-Host "      INSTALL FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $failed += $item.Name
    }
}

Write-Host ""
Write-Host "$installed installed, $skipped already present, $($failed.Count) failed." `
    -ForegroundColor $(if ($failed.Count) { 'Red' } else { 'Green' })
if ($failed.Count) {
    $failed | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host "`nRe-run this script: anything that succeeded is detected and skipped." -ForegroundColor Yellow
    exit 1
}
exit 0
