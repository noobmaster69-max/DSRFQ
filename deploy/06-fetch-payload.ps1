<#
.SYNOPSIS
    Downloads the payload parts, verifies each, and extracts to the install root.

.DESCRIPTION
    Run on the TARGET. Reads Payload.manifest.json, which 11-publish-payload.ps1
    produced beside the parts.

    Each part is verified against its SHA256 as it lands. That is the difference
    between this and clicking a Drive link: a part that arrives truncated - or
    that is actually Drive's virus-scan HTML page, which is what you get for
    anything over 100 MB without a confirm token - is caught here rather than
    surfacing as a corrupt archive after all 13 GB.

    Downloads resume. Re-running after a failure re-downloads only what is
    missing or bad; parts already verified are left alone.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File 06-fetch-payload.ps1

.EXAMPLE
    # Parts already on a USB stick - verify and extract, download nothing.
    powershell -ExecutionPolicy Bypass -File 06-fetch-payload.ps1 -PartsDir D:\parts
#>
[CmdletBinding()]
param(
    [string] $Manifest    = (Join-Path $PSScriptRoot 'Payload.manifest.json'),
    [string] $PartsDir    = 'C:\ProgramData\DSRFQ-Setup\payload',
    [string] $InstallRoot = 'C:\Aizera',
    [string] $SevenZip    = 'C:\Program Files\7-Zip\7z.exe',
    # Verify what is on disk and stop, extracting nothing.
    [switch] $VerifyOnly
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Fetch.psm1') -Force

if (-not (Test-Path $Manifest)) {
    throw "Payload.manifest.json not found at $Manifest. It ships beside these scripts."
}
$m = Get-Content $Manifest -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path $PartsDir | Out-Null

$need = [int64]$m.PackedBytes + [int64]$m.StagedBytes
$drive = Get-PSDrive -Name $InstallRoot.Substring(0,1) -ErrorAction SilentlyContinue
Write-Host "`nDSRFQ payload" -ForegroundColor Cyan
Write-Host ("  {0} parts, {1:N1} GB to download, {2:N1} GB once extracted" -f `
    $m.Parts.Count, ([int64]$m.PackedBytes/1GB), ([int64]$m.StagedBytes/1GB))
if ($drive) {
    Write-Host ("  {0:N1} GB free on {1}:" -f ($drive.Free/1GB), $drive.Name)
    # Both at once: the parts are not deleted until the extract succeeds, so
    # the peak requirement is the sum, not the larger of the two.
    if ($drive.Free -lt $need) {
        Write-Host ("  NOT ENOUGH SPACE - needs about {0:N0} GB free" -f ($need/1GB)) -ForegroundColor Red
        exit 1
    }
}

if ($m.Scrubbed -and $m.Scrubbed.Count) {
    Write-Host "`n  Credentials were removed from this payload before it was packed:" -ForegroundColor DarkGray
    $m.Scrubbed | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    Write-Host "  15-secrets.ps1 asks for them after extraction." -ForegroundColor DarkGray
}

# ── download ────────────────────────────────────────────────────────────────
Write-Host "`n1. Fetching parts" -ForegroundColor Cyan
$failed = @()
foreach ($part in $m.Parts) {
    Write-Host "  $($part.File)  ($([math]::Round([int64]$part.Bytes/1MB)) MB)" -ForegroundColor White
    $out = Join-Path $PartsDir $part.File

    if (Test-Sha256 -Path $out -Sha256 $part.Sha256) {
        if (Test-Path $out) { Write-Host "      verified, already here" -ForegroundColor Green; continue }
    }

    if ($VerifyOnly) {
        Write-Host "      MISSING or CORRUPT" -ForegroundColor Red
        $failed += $part.File
        continue
    }

    $uri = if ($m.BaseUri) { "$($m.BaseUri.TrimEnd('/'))/$($part.File)" }
           elseif ($part.DriveId) { Get-GoogleDriveUri -FileId $part.DriveId }
           else { $null }
    if (-not $uri) {
        Write-Host "      no BaseUri and no DriveId in the manifest - nowhere to fetch from" -ForegroundColor Red
        $failed += $part.File
        continue
    }

    if (-not (Get-FileResumable -Uri $uri -OutFile $out -Sha256 $part.Sha256)) {
        $failed += $part.File
    }
}

if ($failed.Count) {
    Write-Host "`n$($failed.Count) part(s) could not be fetched:" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host @"

Re-run this script - verified parts are skipped, so it continues where it
stopped. If a part fails repeatedly with a hash mismatch, the download is
probably Google Drive's "can't scan this file" page rather than the file:
open the share link in a browser once and confirm the download.
"@ -ForegroundColor Yellow
    exit 1
}

if ($VerifyOnly) { Write-Host "`nAll parts present and verified." -ForegroundColor Green; exit 0 }

# ── extract ─────────────────────────────────────────────────────────────────
Write-Host "`n2. Extracting to $InstallRoot" -ForegroundColor Cyan
if (-not (Test-Path $SevenZip)) {
    throw "7-Zip not found at $SevenZip. Install it, or pass -SevenZip."
}
New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null

# 7-Zip finds the rest of the volumes from the .001 name, so only the first is
# named here. A missing middle part fails the extract - which is why every one
# is hash-checked above rather than after.
$first = Join-Path $PartsDir ($m.Parts[0].File)
& $SevenZip x $first "-o$InstallRoot" -y | Out-Null
if ($LASTEXITCODE -ne 0) { throw "7-Zip exited $LASTEXITCODE while extracting" }

Write-Host "   done" -ForegroundColor Green
Write-Host @"

The parts are kept in $PartsDir. Delete them once the install is verified -
they are $([math]::Round([int64]$m.PackedBytes/1GB,1)) GB and nothing reads them again.
"@ -ForegroundColor DarkGray
