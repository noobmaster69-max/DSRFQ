<#
.SYNOPSIS
    Builds the deployable payload on THIS machine, ready to copy to the target.

.DESCRIPTION
    Run on the source box. Publishes DSRFQ.Web, then mirrors each tree named in
    Payload.psd1 into a staging folder, dropping the parts the running system
    never reads. That is not a tidiness exercise: a naive copy is 45 GB and
    16.9 GB of it is table-recognize's training datasets.

    Robocopy, not Copy-Item: it restarts, it handles long paths, and it is the
    only thing on Windows that copies a 9 GB tree of small files at a sane rate.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File 10-stage.ps1 -Staging E:\DSRFQ-payload
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $Staging,
    [string] $SourceRoot = 'C:\Aizera',
    # Skip the publish step when you have already built and only want to re-copy.
    [switch] $SkipPublish
)

$ErrorActionPreference = 'Stop'
$manifest = Import-PowerShellDataFile (Join-Path $PSScriptRoot 'Payload.psd1')

Write-Host "`nStaging DSRFQ payload" -ForegroundColor Cyan
Write-Host "  from : $SourceRoot"
Write-Host "  to   : $Staging`n"

# ── DSRFQ.Web: publish rather than copy ────────────────────────────────────
# The source tree is 0.88 GB of obj\, node_modules\ and .ts that the target has
# no use for. `dotnet publish` produces the ~0.2 GB the runtime actually loads,
# and it is also what forces a Release build - a Debug DLL on a production box
# is a slow, chatty surprise nobody looks for.
if (-not $SkipPublish) {
    $proj = Join-Path $SourceRoot 'DSRFQ\DSRFQ.Web\DSRFQ.Web.csproj'
    Write-Host "Publishing DSRFQ.Web (Release)..." -ForegroundColor Yellow

    # Assets first. Serenity's NodeScriptRunner starts tsbuild:watch in
    # Development only, so on the target nothing rebuilds wwwroot\esm - it has
    # to be correct in the payload or every page loads stale script.
    Push-Location (Split-Path $proj)
    try {
        & node tsbuild.js
        if ($LASTEXITCODE -ne 0) { throw "tsbuild.js failed ($LASTEXITCODE)" }
    }
    finally { Pop-Location }

    & dotnet publish $proj -c Release -o (Join-Path $SourceRoot 'DSRFQ\DSRFQ.Web\bin\Release\net8.0\publish') --nologo
    if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed ($LASTEXITCODE)" }
    Write-Host "  published`n" -ForegroundColor Green
}

# ── mirror each item ───────────────────────────────────────────────────────
$total = 0
foreach ($item in $manifest.Items) {
    $src = Join-Path $SourceRoot $item.Source
    $rel = $item.Source
    if ($item.Dest) { $rel = $item.Dest }
    $dst = Join-Path $Staging $rel

    if (-not (Test-Path $src)) {
        # A Staged item is one THIS script just produced, so its absence is a
        # bug in the manifest or a failed build - never a tree that happens not
        # to be on this machine. Warning and carrying on is how a payload got
        # packed with no web application in it, behind one yellow line among
        # nine green ones.
        if ($item.Staged) {
            Write-Host ("  MISSING  {0,-24} {1}" -f $item.Name, $src) -ForegroundColor Red
            throw "$($item.Name) should have been produced by this script but is not at $src"
        }
        Write-Host ("  SKIP  {0,-26} {1}" -f $item.Name, "not found: $src") -ForegroundColor Yellow
        continue
    }

    # /XD takes directory names; robocopy matches them at any depth, which is
    # what the '**\' prefixes in the manifest mean.
    $xd = @()
    foreach ($pattern in @($item.Exclude)) {
        if ($pattern) { $xd += ($pattern -replace '^\*\*\\', '') }
    }

    # /XF takes file names or wildcards, as opposed to /XD's directories. The
    # two cannot be merged: robocopy matches /XD against directory names only,
    # so a "*.log" listed there is silently ignored - which is how 785 MB of
    # log file rode along inside a tree annotated "~0.05 GB".
    $xf = @()
    foreach ($pattern in @($item.ExcludeFiles)) {
        if ($pattern) { $xf += $pattern }
    }

    $args = @($src, $dst, '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/NP',
              '/R:2', '/W:2', '/MT:16')
    if ($xd.Count) { $args += '/XD'; $args += $xd }
    if ($xf.Count) { $args += '/XF'; $args += $xf }

    Write-Host ("  copy  {0,-26} {1}" -f $item.Name, $item.Size) -NoNewline
    & robocopy @args | Out-Null
    # Robocopy exit codes below 8 are success; 8+ is a real failure. Anything
    # non-zero from a plain program would normally read as an error, which is
    # why this is spelled out rather than left to $LASTEXITCODE.
    if ($LASTEXITCODE -ge 8) {
        Write-Host "  FAILED (robocopy $LASTEXITCODE)" -ForegroundColor Red
        throw "robocopy failed for $($item.Name)"
    }
    $size = (Get-ChildItem $dst -Recurse -File -ErrorAction SilentlyContinue |
             Measure-Object Length -Sum).Sum
    $total += $size
    Write-Host ("  -> {0:N2} GB" -f ($size / 1GB)) -ForegroundColor Green
}

# The deploy kit itself travels with the payload, or the target has no scripts.
#
# The destination is created first: Copy-Item with a wildcard source will not
# create it, and with -ErrorAction SilentlyContinue that failure was invisible -
# the payload simply had no deploy folder in it, which is exactly the case where
# nobody is around to notice until the target needs the scripts.
$kit = Join-Path $Staging 'deploy'
New-Item -ItemType Directory -Force -Path $kit | Out-Null
Copy-Item -Path (Join-Path $PSScriptRoot '*') -Destination $kit -Recurse -Force
if (-not (Test-Path (Join-Path $kit 'Bootstrap.cmd'))) {
    throw "the deploy kit did not copy into $kit"
}
Write-Host ("  copy  {0,-26} {1}" -f 'Deploy kit', 'tiny  -> ok') -ForegroundColor Green

Write-Host ("`nStaged {0:N1} GB to {1}" -f ($total / 1GB), $Staging) -ForegroundColor Cyan
Write-Host "`nStill to carry by hand:" -ForegroundColor Yellow
foreach ($m in $manifest.Manual) {
    Write-Host ("  - {0,-24} {1,-9} {2}" -f $m.Name, $m.Size, ($m.Why -split "`n")[0])
}
