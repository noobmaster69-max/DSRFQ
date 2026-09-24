# Copy the staged DSRFQ.Web publish straight into C:\Aizera\DSRFQ\DSRFQ.Web WITHOUT
# stopping OneZera-Web (SP_Demo1 cannot). Same file set and backup as apply-web.ps1.
# A file the running app holds open (DSRFQ.Web.dll and friends) cannot be
# overwritten, but Windows lets it be renamed - so it is moved aside to
# <name>.old-web-20260924-0830 and the new one copied in. The app keeps running
# the old code from memory until OneZera-Web restarts.
$ErrorActionPreference = 'Stop'
$stage  = 'C:\Aizera\Staging\web-20260924-0830'
$web    = 'C:\Aizera\DSRFQ\DSRFQ.Web'
$backup = 'C:\Aizera\Backup\web-20260924-0830'
$files  = (Get-Content (Join-Path $stage 'manifest.json') -Raw | ConvertFrom-Json).files

$renamed = 0; $copied = 0
foreach ($rel in $files) {
    $target = Join-Path $web $rel
    $src    = Join-Path (Join-Path $stage 'files') $rel
    if (Test-Path -LiteralPath $target) {
        $b = Join-Path $backup $rel
        New-Item -ItemType Directory -Force (Split-Path $b) | Out-Null
        Copy-Item -LiteralPath $target $b -Force
    }
    New-Item -ItemType Directory -Force (Split-Path $target) | Out-Null
    try {
        Copy-Item -LiteralPath $src $target -Force
    } catch {
        $aside = "$target.old-web-20260924-0830"
        if (Test-Path -LiteralPath $aside) { Remove-Item -LiteralPath $aside -Force }
        Rename-Item -LiteralPath $target (Split-Path $aside -Leaf)
        Copy-Item -LiteralPath $src $target -Force
        $renamed++
        Write-Host "  in use, renamed aside: $rel"
    }
    $copied++
}
Write-Host "$copied file(s) copied ($renamed were in use and renamed aside)."

$esm = Join-Path $web 'wwwroot\esm'
if (Test-Path $esm) {
    New-Item -ItemType Directory -Force (Join-Path $backup 'wwwroot') | Out-Null
    Copy-Item $esm (Join-Path $backup 'wwwroot\esm') -Recurse -Force
}
& robocopy (Join-Path $stage 'esm') $esm /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy of wwwroot\esm failed ($LASTEXITCODE)" }
Write-Host "wwwroot\esm: $((Get-ChildItem $esm -Recurse -File).Count) file(s)"

$settings = Join-Path $web 'appsettings.json'
$json = Get-Content $settings -Raw | ConvertFrom-Json
if ($json.PSObject.Properties['Ballooning']) { Write-Host 'appsettings.json already has Ballooning.' }
else { Write-Warning 'appsettings.json has no Ballooning section - run apply-web.ps1 as admin to add it.' }
Write-Host "Backup: $backup"
