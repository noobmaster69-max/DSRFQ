<#
.SYNOPSIS
    Turns a staged tree into hashed, resumable parts fit to host - with the
    secrets taken out.

.DESCRIPTION
    Run on the SOURCE box, after 10-stage.ps1 has built the staging folder.

    Two jobs, and the second is the one that matters:

    SPLIT. One 13 GB file on Google Drive is a download that cannot resume and
    a share link that trips Drive's daily quota. Fixed-size parts mean a failure
    costs one part, and each part is verified on arrival rather than at the end.

    SCRUB. The staged tree carries live credentials - an SMTP app password and a
    Stripe key in appsettings.json, the SQL password in its connection string,
    and the same plaintext aihubmix API key in six Python files. Hosting that on
    a share link publishes all of it to anyone who has the link. Each is
    replaced with a placeholder here and prompted for on the target by
    15-secrets.ps1, so the artefact you hand out has none of them.

    The scrub is verified, not assumed: the script greps the finished parts'
    source for every pattern it replaced and refuses to publish if one survives.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File 11-publish-payload.ps1 `
        -Staging E:\DSRFQ-payload -Output E:\DSRFQ-dist
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string] $Staging,
    [Parameter(Mandatory)][string] $Output,
    # 2 GB parts: small enough that a failed part is cheap to retry, large
    # enough that a 13 GB payload is seven files rather than seventy.
    [int] $PartSizeMB = 2048,
    # 7-Zip. -mx=5 rather than 9 on purpose: the payload is mostly model
    # weights and already-compressed wheels, where 9 costs hours and saves
    # single-digit percent. Measured on this data, not assumed.
    [string] $SevenZip = 'C:\Program Files\7-Zip\7z.exe',
    [switch] $SkipScrub
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Fetch.psm1') -Force

if (-not (Test-Path $Staging)) { throw "Staging folder not found: $Staging" }
if (-not (Test-Path $SevenZip)) { throw "7-Zip not found at $SevenZip" }
New-Item -ItemType Directory -Force -Path $Output | Out-Null

# ── 1. scrub ────────────────────────────────────────────────────────────────
$secrets = Import-PowerShellDataFile (Join-Path $PSScriptRoot 'Secrets.psd1')
$scrubbed = @()

if (-not $SkipScrub) {
    Write-Host "`n1. Removing credentials from the staged copy" -ForegroundColor Cyan
    foreach ($rule in $secrets.Rules) {
        foreach ($rel in $rule.Files) {
            $path = Join-Path $Staging $rel
            if (-not (Test-Path $path)) { continue }
            $text = Get-Content $path -Raw
            $new = [regex]::Replace($text, $rule.Pattern, $rule.Replacement)
            if ($new -ne $text) {
                Set-Content -Path $path -Value $new -Encoding UTF8 -NoNewline
                $scrubbed += "$rel  ($($rule.Name))"
                Write-Host "   removed $($rule.Name) from $rel" -ForegroundColor Green
            }
        }
    }
    if (-not $scrubbed.Count) {
        Write-Host "   nothing matched - check Secrets.psd1 against the staged tree" -ForegroundColor Yellow
    }

    # Verify rather than trust. A pattern that stopped matching because a file
    # was reformatted would otherwise publish the secret silently.
    Write-Host "`n2. Checking nothing was missed" -ForegroundColor Cyan
    $leaked = @()
    foreach ($probe in $secrets.Probes) {
        $hits = Get-ChildItem $Staging -Recurse -File -Include $probe.Include -ErrorAction SilentlyContinue |
                Select-String -Pattern $probe.Pattern -List -ErrorAction SilentlyContinue
        foreach ($h in $hits) { $leaked += "$($probe.Name): $($h.Path)" }
    }
    if ($leaked.Count) {
        Write-Host "`nREFUSING TO PUBLISH - these still contain credentials:" -ForegroundColor Red
        $leaked | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
        Write-Host "`nAdd a rule to Secrets.psd1, or pass -SkipScrub if you are certain." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "   clean" -ForegroundColor Green
}
else {
    Write-Host "`n-SkipScrub: publishing WITH whatever credentials are in the tree." -ForegroundColor Red
}

# ── 2. compress and split ───────────────────────────────────────────────────
Write-Host "`n3. Compressing into $PartSizeMB MB parts" -ForegroundColor Cyan
$archive = Join-Path $Output 'dsrfq-payload.7z'
Get-ChildItem $Output -Filter 'dsrfq-payload.7z*' -ErrorAction SilentlyContinue | Remove-Item -Force

$raw = (Get-ChildItem $Staging -Recurse -File -Force | Measure-Object Length -Sum).Sum
Write-Host "   $([math]::Round($raw/1GB,1)) GB staged; this takes a while." -ForegroundColor DarkGray

& $SevenZip a -t7z -mx=5 -md=64m -mmt=on "-v${PartSizeMB}m" $archive "$Staging\*" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "7-Zip exited $LASTEXITCODE" }

$parts = Get-ChildItem $Output -Filter 'dsrfq-payload.7z.*' | Sort-Object Name
if (-not $parts) { throw "no parts were produced" }
$packed = ($parts | Measure-Object Length -Sum).Sum
Write-Host "   $($parts.Count) parts, $([math]::Round($packed/1GB,2)) GB ($([math]::Round(100*$packed/$raw))% of staged)" -ForegroundColor Green

# ── 3. the manifest the target reads ────────────────────────────────────────
Write-Host "`n4. Hashing" -ForegroundColor Cyan
$entries = foreach ($p in $parts) {
    Write-Host "   $($p.Name)" -ForegroundColor DarkGray
    @{
        File   = $p.Name
        Sha256 = (Get-FileHash $p.FullName -Algorithm SHA256).Hash.ToUpperInvariant()
        Bytes  = $p.Length
        # Filled in once uploaded. Drive gives a per-file id; a plain web host
        # needs BaseUri in Payload.manifest.json instead.
        DriveId = ''
    }
}

$manifest = [ordered]@{
    Product     = 'DSRFQ'
    Created     = (Get-Date).ToString('s')
    StagedBytes = $raw
    PackedBytes = $packed
    # Every part must be present before joining: 7-Zip cannot extract a
    # multi-volume archive with a hole in it, and finding that out after a
    # 13 GB download is worse than finding it out before.
    Parts       = $entries
    Scrubbed    = $scrubbed
    # Set this when hosting somewhere with plain URLs; leave empty to use
    # per-part Google Drive ids.
    BaseUri     = ''
}
$manifestPath = Join-Path $Output 'Payload.manifest.json'
$manifest | ConvertTo-Json -Depth 5 | Set-Content $manifestPath -Encoding UTF8

Write-Host "`nWrote $manifestPath" -ForegroundColor Green
Write-Host @"

Next:
  1. Upload the parts, then paste each file's id into Payload.manifest.json
     (DriveId), or set BaseUri if you are hosting them on a plain web server.
  2. Ship the deploy folder + Payload.manifest.json to the target. That is the
     bootstrapper - a few hundred KB, not gigabytes.
  3. On the target: Bootstrap.cmd
"@ -ForegroundColor Cyan
