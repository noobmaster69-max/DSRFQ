<#
  Put a staged DSRFQ.Web build in place WITHOUT admin rights (runs as SP_Demo1).

  OneZera-Web cannot be stopped by SP_Demo1 and the running app locks
  DSRFQ.Web.dll against overwrite - but Windows still allows the locked file to
  be renamed. So: back up, rename the live DLL/PDB aside, copy the new ones in,
  mirror wwwroot\esm, add the Ballooning appsettings section. The running
  process keeps the old code in memory; the new build loads on the next
  restart of OneZera-Web.

  Usage: powershell -ExecutionPolicy Bypass -File swap-web.ps1 -Stage C:\Aizera\Staging\web-<stamp>
#>
param([Parameter(Mandatory)][string] $Stage)
$ErrorActionPreference = 'Stop'
$web    = 'C:\Aizera\DSRFQ\DSRFQ.Web'
$stamp  = Split-Path $Stage -Leaf
$backup = "C:\Aizera\Backup\$stamp"
$files  = (Get-Content (Join-Path $Stage 'manifest.json') -Raw | ConvertFrom-Json).files
New-Item -ItemType Directory -Force $backup | Out-Null

foreach ($rel in $files) {
    $target = Join-Path $web $rel
    $src    = Join-Path (Join-Path $Stage 'files') $rel
    if (Test-Path -LiteralPath $target) {
        $b = Join-Path $backup $rel
        New-Item -ItemType Directory -Force (Split-Path $b) | Out-Null
        Copy-Item -LiteralPath $target $b -Force
        try {
            Copy-Item -LiteralPath $src $target -Force -ErrorAction Stop
        } catch {
            # In use: move it aside under a unique name, then copy the new file in.
            $aside = "$target.old-$stamp"
            if (Test-Path -LiteralPath $aside) { Remove-Item -LiteralPath $aside -Force -ErrorAction SilentlyContinue }
            Rename-Item -LiteralPath $target (Split-Path $aside -Leaf)
            Copy-Item -LiteralPath $src $target -Force
            Write-Host "  $rel was in use - renamed aside to $(Split-Path $aside -Leaf)"
        }
    } else {
        New-Item -ItemType Directory -Force (Split-Path $target) | Out-Null
        Copy-Item -LiteralPath $src $target -Force
    }
    Write-Host "  updated $rel"
}

$esm = Join-Path $web 'wwwroot\esm'
if (Test-Path $esm) {
    New-Item -ItemType Directory -Force (Join-Path $backup 'wwwroot') | Out-Null
    Copy-Item $esm (Join-Path $backup 'wwwroot\esm') -Recurse -Force
}
& robocopy (Join-Path $Stage 'esm') $esm /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy of wwwroot\esm failed ($LASTEXITCODE)" }
Write-Host "  wwwroot\esm mirrored: $((Get-ChildItem $esm -Recurse -File).Count) file(s)"

$settings = Join-Path $web 'appsettings.json'
$json = Get-Content $settings -Raw | ConvertFrom-Json
if (-not $json.PSObject.Properties['Ballooning']) {
    Copy-Item $settings (Join-Path $backup 'appsettings.json') -Force
    $key = ''
    $line = Select-String -Path 'C:\Aizera\RPA\API\.env' -Pattern '^ERP_API_KEY=(.*)$' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($line) { $key = $line.Matches[0].Groups[1].Value.Trim() }
    $json | Add-Member -NotePropertyName Ballooning -NotePropertyValue ([ordered]@{
        EngineUrl = 'http://localhost:5999'; ApiUrl = 'http://localhost:8000'; ApiKey = $key })
    $json | ConvertTo-Json -Depth 20 | Set-Content $settings -Encoding UTF8
    Write-Host "  added the Ballooning section to appsettings.json"
}
Write-Host "done - backup in $backup. Restart OneZera-Web to load the new build."
