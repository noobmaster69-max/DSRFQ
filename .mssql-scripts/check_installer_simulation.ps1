<#
    A full dress rehearsal of the installer, using the real scripts.

    Everything the bootstrapper does that is OURS is exercised end to end:

        publish -> host -> download -> verify -> extract -> credentials

    on a small synthetic payload laid out exactly like the real one, with real
    credentials in it. Small on purpose - a 1 MB part size makes it split into
    several parts, so multi-part joining is tested in seconds rather than hours.

    What this deliberately does NOT do is install Python, SQL Server or
    RabbitMQ. Those are somebody else's installers, this machine already has
    them, and running them here would damage the development environment. Their
    DETECTION is checked instead, which is the part that decides whether the
    bootstrapper does the right thing.

    powershell -ExecutionPolicy Bypass -File .mssql-scripts\check_installer_simulation.ps1
#>
$ErrorActionPreference = 'Stop'
$deploy = 'C:\Aizera\DSRFQ\deploy'
$fails = @()

function Check([string] $name, [bool] $ok, $detail = '') {
    $tag = if ($ok) { 'PASS' } else { 'FAIL' }
    $col = if ($ok) { 'Green' } else { 'Red' }
    Write-Host ("  {0}  {1}{2}" -f $tag, $name, $(if ($detail) { "  $detail" } else { '' })) -ForegroundColor $col
    if (-not $ok) { $script:fails += $name }
}

$tmp = Join-Path $env:TEMP ('installsim-' + [guid]::NewGuid().ToString('N').Substring(0,8))
$stage   = Join-Path $tmp 'stage'
$dist    = Join-Path $tmp 'dist'
$parts   = Join-Path $tmp 'parts'
$install = Join-Path $tmp 'install'
New-Item -ItemType Directory -Force -Path $stage, $dist, $parts, $install | Out-Null

# ── a payload laid out like the real one, with real credentials in it ───────
$web = Join-Path $stage 'DSRFQ\DSRFQ.Web'
$rfq = Join-Path $stage 'RPA\RFQ'
$t2j = Join-Path $stage 'RPA\table-to-json'
New-Item -ItemType Directory -Force -Path $web, $rfq, $t2j | Out-Null

@'
{
  "Data": { "Default": { "ConnectionString": "Server=deskdev,65001;Database=RFQ;User Id=sa;Password=Tsh9989;TrustServerCertificate=true" } },
  "Mail": { "Password": "kcdw hypb kgzi wlby" },
  "Stripe": { "SecretKey": "sk_test_51RxN0WLSIf0mjgrc4M3BthyelXhDLBr7OAIjIbk8SOz0EI" }
}
'@ | Set-Content (Join-Path $web 'appsettings.json') -Encoding UTF8

# Same shape as the real config.yaml: four credentials, two of them both
# spelled "Password:" and told apart only by their block.
@'
Database:
  Driver: ODBC Driver 17 for SQL Server
  Server: deskdev,65001
  Uid: sa
  Pwd: Tsh9989

CostingDatabase:
  Host: deskdev
  User: joe
  Password: Welcome01
  Database: tsh_new

DSRFQ:
  # Both are Serenity apps, so a probe of /Account/Login answers from either.
  Url: "http://localhost:5001"
  Username: "admin"
  Password: "serenity"
  TshUsername: "admin"
  TshPassword: "Tsh9989"
'@ | Set-Content (Join-Path $rfq 'config.yaml') -Encoding UTF8

'API_KEY = "sk-G96EuHlJuj3CcLx55e4b9e7eA11341679d3169Ae2b941d56"' |
    Set-Content (Join-Path $t2j 'main.py') -Encoding UTF8

# Filler so the archive splits into several parts, and something recognisable
# to prove the extract landed intact.
$filler = New-Object byte[] (5MB)
(New-Object Random 7).NextBytes($filler)
[IO.File]::WriteAllBytes((Join-Path $web 'DSRFQ.Web.dll'), $filler)

Write-Host "`n1. publish: scrub, compress, split, hash" -ForegroundColor Cyan
$pubOut = & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $deploy '11-publish-payload.ps1') `
    -Staging $stage -Output $dist -PartSizeMB 1 2>&1 | Out-String
$pubCode = $LASTEXITCODE
Check "the publish succeeded" ($pubCode -eq 0) $(if ($pubCode -ne 0) { ($pubOut -split "`n" | Select-Object -Last 4) -join ' ' })

$manifestPath = Join-Path $dist 'Payload.manifest.json'
Check "a manifest was written" (Test-Path $manifestPath)
if (-not (Test-Path $manifestPath)) {
    Write-Host "`nCannot continue without a manifest." -ForegroundColor Red
    Write-Host $pubOut
    exit 1
}
$m = Get-Content $manifestPath -Raw | ConvertFrom-Json
Check "it split into several parts" ($m.Parts.Count -ge 2) "$($m.Parts.Count) parts"
Check "every part has a hash" (@($m.Parts | Where-Object { -not $_.Sha256 }).Count -eq 0)
Check "it recorded what it scrubbed" ($m.Scrubbed.Count -ge 4) "$($m.Scrubbed.Count) entries"

Write-Host "`n2. the published parts carry no credentials" -ForegroundColor Cyan
# The staging tree is what got packed, so it is the thing to inspect.
$body = @()
foreach ($f in Get-ChildItem $stage -Recurse -File) { $body += (Get-Content $f.FullName -Raw) }
$all = $body -join "`n"
foreach ($v in @('Tsh9989','Welcome01','kcdw hypb','sk_test_51','sk-G96Eu')) {
    Check "'$v' is gone" (-not ($all -match [regex]::Escape($v)))
}
Check "the web login is gone" (-not ($all -match 'Password:\s*"serenity"'))
Check "placeholders are in their place" (
    ($all -match '__SQL_PASSWORD__') -and ($all -match '__MYSQL_PASSWORD__') -and
    ($all -match '__DSRFQ_PASSWORD__') -and ($all -match '__AIHUBMIX_API_KEY__'))

# ── serve the parts over HTTP, like a web host or Drive would ───────────────
$probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$probe.Start(); $port = $probe.LocalEndpoint.Port; $probe.Stop()

$server = Start-Job -ScriptBlock {
    param($port, $dir)
    $l = [System.Net.HttpListener]::new()
    $l.Prefixes.Add("http://localhost:$port/")
    $l.Start()
    while ($l.IsListening) {
        try {
            $ctx = $l.GetContext(); $req = $ctx.Request; $res = $ctx.Response
            $name = [IO.Path]::GetFileName($req.Url.AbsolutePath)
            $path = Join-Path $dir $name
            if (-not (Test-Path $path)) { $res.StatusCode = 404; $res.OutputStream.Close(); continue }
            $data = [IO.File]::ReadAllBytes($path)
            $from = 0
            if ($req.Headers['Range'] -and $req.Headers['Range'] -match 'bytes=(\d+)-') {
                $from = [int]$Matches[1]
                $res.StatusCode = 206
                $res.AddHeader('Content-Range', "bytes $from-$($data.Length-1)/$($data.Length)")
            }
            $slice = $data[$from..($data.Length-1)]
            $res.ContentLength64 = $slice.Length
            $res.OutputStream.Write($slice, 0, $slice.Length)
            $res.OutputStream.Close()
        } catch { break }
    }
} -ArgumentList $port, $dist

$ready = $false
foreach ($i in 1..40) {
    Start-Sleep -Milliseconds 250
    if ((Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue).TcpTestSucceeded) { $ready = $true; break }
}

try {
    Write-Host "`n3. hosting the parts and pointing the manifest at them" -ForegroundColor Cyan
    Check "the host is serving on $port" $ready
    $m.BaseUri = "http://localhost:$port"
    $m | ConvertTo-Json -Depth 5 | Set-Content $manifestPath -Encoding UTF8

    Write-Host "`n4. a corrupt part is caught, not installed" -ForegroundColor Cyan
    # The failure that matters most: Drive serves its virus-scan HTML page for
    # anything over 100 MB, and without verification that installs as a payload
    # and surfaces much later as a corrupt archive.
    $victim = Join-Path $dist $m.Parts[0].File
    $good = [IO.File]::ReadAllBytes($victim)
    [IO.File]::WriteAllText($victim, '<html>Google Drive can''t scan this file for viruses.</html>')
    $badOut = & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $deploy '06-fetch-payload.ps1') `
        -Manifest $manifestPath -PartsDir $parts -InstallRoot $install 2>&1 | Out-String
    $badCode = $LASTEXITCODE
    Check "the fetch refused to continue" ($badCode -ne 0) "exit $badCode"
    Check "and said which part" ($badOut -match [regex]::Escape($m.Parts[0].File))
    Check "nothing was extracted" (-not (Test-Path (Join-Path $install 'DSRFQ')))
    [IO.File]::WriteAllBytes($victim, $good)

    Write-Host "`n5. the real download, verify and extract" -ForegroundColor Cyan
    $fetchOut = & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $deploy '06-fetch-payload.ps1') `
        -Manifest $manifestPath -PartsDir $parts -InstallRoot $install 2>&1 | Out-String
    $fetchCode = $LASTEXITCODE
    Check "the fetch succeeded" ($fetchCode -eq 0) $(if ($fetchCode -ne 0) { ($fetchOut -split "`n" | Select-Object -Last 5) -join ' ' })
    Check "appsettings.json extracted" (Test-Path (Join-Path $install 'DSRFQ\DSRFQ.Web\appsettings.json'))
    Check "config.yaml extracted"      (Test-Path (Join-Path $install 'RPA\RFQ\config.yaml'))
    Check "main.py extracted"          (Test-Path (Join-Path $install 'RPA\table-to-json\main.py'))
    $dll = Join-Path $install 'DSRFQ\DSRFQ.Web\DSRFQ.Web.dll'
    Check "the multi-part binary rejoined byte for byte" (
        (Test-Path $dll) -and
        ((Get-FileHash $dll -Algorithm SHA256).Hash -eq
         (Get-FileHash (Join-Path $web 'DSRFQ.Web.dll') -Algorithm SHA256).Hash))

    Write-Host "`n6. re-running the fetch costs nothing" -ForegroundColor Cyan
    $again = & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $deploy '06-fetch-payload.ps1') `
        -Manifest $manifestPath -PartsDir $parts -InstallRoot $install -VerifyOnly 2>&1 | Out-String
    Check "every part verifies from cache" ($LASTEXITCODE -eq 0)
    Check "and it says so rather than re-downloading" ($again -match 'verified, already here')

    Write-Host "`n7. credentials go back in on the target" -ForegroundColor Cyan
    & (Join-Path $deploy '15-secrets.ps1') -InstallRoot $install -NonInteractive -Answers @{
        '__SQL_PASSWORD__'     = 'Install#1'
        '__MYSQL_PASSWORD__'   = 'My$ql2'
        '__DSRFQ_PASSWORD__'   = 'webpass'
        '__AIHUBMIX_API_KEY__' = 'sk-newkey000000000000000000'
    } 2>&1 | Out-Null

    $app = Get-Content (Join-Path $install 'DSRFQ\DSRFQ.Web\appsettings.json') -Raw
    $cfg = Get-Content (Join-Path $install 'RPA\RFQ\config.yaml') -Raw
    $py  = Get-Content (Join-Path $install 'RPA\table-to-json\main.py') -Raw
    # A password with a $ and a # in it: literal replacement, not regex, or
    # these get mangled into something that neither matches nor errors.
    Check "SQL password written to appsettings" ($app -match 'Password=Install#1')
    Check "SQL password written to config.yaml" ($cfg -match 'Pwd:\s*Install#1')
    Check "MySQL password written"              ($cfg -match 'Password:\s*My\$ql2')
    Check "web login written"                   ($cfg -match 'Password:\s*"webpass"')
    Check "API key written"                     ($py  -match 'sk-newkey')
    Check "unanswered optional left as a placeholder" ($cfg -match '__TSH_PASSWORD__')
    Check "no placeholder left where an answer was given" (
        -not ($app -match '__SQL_PASSWORD__') -and -not ($cfg -match '__MYSQL_PASSWORD__'))

    Write-Host "`n8. the prerequisites script actually runs" -ForegroundColor Cyan
    # -WhatIfOnly downloads and installs nothing, so this is safe here - and it
    # is the step that matters, because calling the Detect blocks directly (as
    # section 8b does) exercises the manifest but never the SCRIPT. That gap let
    # a crash through on the first line it prints: Measure-Object -Property does
    # not see Hashtable keys, so summing SizeMB threw before anything happened.
    $preOut = & powershell -NoProfile -ExecutionPolicy Bypass `
        -File (Join-Path $deploy '05-prereqs.ps1') -WhatIfOnly 2>&1 | Out-String
    $preCode = $LASTEXITCODE
    Check "05-prereqs -WhatIfOnly exits cleanly" ($preCode -eq 0) "exit $preCode"
    Check "it did not throw a property error" (-not ($preOut -match 'cannot be found in the input')) `
        $(if ($preOut -match 'cannot be found in the input') { 'Measure-Object on a Hashtable' })
    Check "it listed all nine items" ($preOut -match '9 item\(s\)')
    Check "it reported a plausible total, models included" (
        $preOut -match 'about 7\.\d GB|about 8\.\d GB') `
        (($preOut -split "`n" | Where-Object { $_ -match 'item\(s\), about' }) -join '')
    Check "it changed nothing" ($preOut -match 'WOULD download')

    Write-Host "`n8b. prerequisite detection tells the truth about this machine" -ForegroundColor Cyan
    # Not installed here - detection is what decides whether the bootstrapper
    # skips or downloads, and getting it wrong means reinstalling Python over
    # a working one.
    $raw = Get-Content (Join-Path $deploy 'Prerequisites.psd1') -Raw
    $pre = Invoke-Expression $raw
    foreach ($item in $pre.Items) {
        $got = $false
        try { $got = [bool](& $item.Detect) } catch { $got = $false }
        Write-Host ("      {0,-42} {1}" -f $item.Key, $(if ($got) { 'present' } else { 'would install' })) -ForegroundColor DarkGray
    }
    # Three we know the truth about on this box.
    $py312 = ($pre.Items | Where-Object { $_.Key -eq 'python312' })
    $tess  = ($pre.Items | Where-Object { $_.Key -eq 'tesseract' })
    $rmq   = ($pre.Items | Where-Object { $_.Key -eq 'rabbitmq' })
    Check "Tesseract is detected (it is installed here)" ([bool](& $tess.Detect))
    Check "detection is a real test, not a constant" (
        ([bool](& $py312.Detect)) -eq (Test-Path 'C:\Python312\python.exe'))
    # A broker that is already answering must count as present however it is
    # hosted. Detecting only the Windows service would install a second, native
    # RabbitMQ beside a containerised one, and the two would fight for 5672 and
    # 15672 - neither starts, and every queue silently goes nowhere.
    #
    # Tested by BINDING 5672 rather than by hoping a broker happens to be up:
    # on a box where it is down, the assertion would otherwise pass vacuously
    # and prove nothing. If something is genuinely listening, that is used
    # instead and the bind is skipped.
    $erl = ($pre.Items | Where-Object { $_.Key -eq 'erlang' })
    $already = (Test-NetConnection -ComputerName localhost -Port 5672 `
                    -InformationLevel Quiet -WarningAction SilentlyContinue)
    $fake = $null
    if (-not $already) {
        try {
            $fake = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 5672)
            $fake.Start()
        } catch { $fake = $null }
    }
    if ($already -or $fake) {
        Check "a broker on 5672 counts as present, service or container" ([bool](& $rmq.Detect)) `
            $(if ($fake) { '(simulated listener)' } else { '(real broker)' })
        Check "and Erlang is not installed for a broker that already exists" ([bool](& $erl.Detect))
    }
    else {
        Check "could not bind 5672 to test broker detection" $false 'port unavailable'
    }
    if ($fake) { $fake.Stop() }

    # And with nothing on 5672, it must say install - or the check above is
    # just reporting true for everything.
    if ($fake) {
        Check "with no broker, it says install" (-not [bool](& $rmq.Detect))
    }
}
finally {
    Stop-Job $server -ErrorAction SilentlyContinue
    Remove-Job $server -Force -ErrorAction SilentlyContinue
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""
if ($fails.Count) {
    Write-Host "$($fails.Count) FAILED: $($fails -join ', ')" -ForegroundColor Red
    exit 1
}
Write-Host "ALL PASS - publish, host, download, verify, extract, credentials" -ForegroundColor Green
exit 0
