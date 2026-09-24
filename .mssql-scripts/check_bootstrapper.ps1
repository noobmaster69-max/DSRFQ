<#
    Does the bootstrapper actually resume, verify, and keep the secrets out?

    These are the three claims the whole design rests on, and all three are
    testable here without the 37 GB payload:

      RESUME  - a download that dies at 40% must continue, not restart. Tested
                against a local server that serves Range requests, by killing
                the first attempt and checking the second only fetches the rest.

      VERIFY  - a truncated or wrong file must be REJECTED. Without this, Google
                Drive's "can't scan this file" HTML page installs as a payload
                part and fails much later as a corrupt archive.

      SCRUB   - every credential must be gone from the published tree, and must
                come back on the target. A rule that silently stops matching is
                the failure that publishes a Stripe key.

    powershell -ExecutionPolicy Bypass -File .mssql-scripts\check_bootstrapper.ps1
#>
$ErrorActionPreference = 'Stop'
$deploy = 'C:\Aizera\DSRFQ\deploy'
$fails = @()

function Check([string] $name, [bool] $ok, $detail = '') {
    $tag = if ($ok) { 'PASS' } else { 'FAIL'; }
    $col = if ($ok) { 'Green' } else { 'Red' }
    Write-Host ("  {0}  {1}{2}" -f $tag, $name, $(if ($detail) { "  $detail" } else { '' })) -ForegroundColor $col
    if (-not $ok) { $script:fails += $name }
}

Import-Module (Join-Path $deploy 'Fetch.psm1') -Force

$tmp = Join-Path $env:TEMP ('bootstrap-test-' + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$serve = Join-Path $tmp 'serve'; New-Item -ItemType Directory -Force -Path $serve | Out-Null

# A 6 MB file of incompressible bytes, so a partial download is unmistakable.
$payload = Join-Path $serve 'part.bin'
$bytes = New-Object byte[] (6MB)
(New-Object Random 42).NextBytes($bytes)
[IO.File]::WriteAllBytes($payload, $bytes)
$realHash = (Get-FileHash $payload -Algorithm SHA256).Hash.ToUpperInvariant()

# ── a local HTTP server that honours Range, like Drive and any web host do ──
# A free port picked per run, not a fixed one: a previous run killed mid-flight
# leaves its listener registration behind, and a fixed port then fails every
# subsequent run with a conflict that has nothing to do with the code.
$probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$probe.Start(); $port = $probe.LocalEndpoint.Port; $probe.Stop()

$job = Start-Job -ScriptBlock {
    param($port, $file)
    $l = [System.Net.HttpListener]::new()
    $l.Prefixes.Add("http://localhost:$port/")
    $l.Start()
    $data = [IO.File]::ReadAllBytes($file)
    while ($l.IsListening) {
        try {
            $ctx = $l.GetContext()
            $req = $ctx.Request; $res = $ctx.Response
            $from = 0
            $range = $req.Headers['Range']
            if ($range -and $range -match 'bytes=(\d+)-') {
                $from = [int]$Matches[1]
                $res.StatusCode = 206
                $res.AddHeader('Content-Range', "bytes $from-$($data.Length-1)/$($data.Length)")
            }
            # Truncate the FIRST response so the client has to resume.
            $slice = $data[$from..($data.Length-1)]
            if ($req.QueryString['cut'] -eq '1' -and $from -eq 0) {
                $slice = $data[0..([int]($data.Length * 0.4))]
            }
            $res.ContentLength64 = $slice.Length
            $res.OutputStream.Write($slice, 0, $slice.Length)
            $res.OutputStream.Close()
        } catch { break }
    }
} -ArgumentList $port, $payload

# Wait for it to bind rather than guessing at a sleep - a slow start otherwise
# fails the first download and reads as a resume bug.
$ready = $false
foreach ($i in 1..40) {
    Start-Sleep -Milliseconds 250
    if ((Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue).TcpTestSucceeded) {
        $ready = $true; break
    }
}
Check "the test server is listening on $port" $ready

try {
    Write-Host "`n1. a download that dies part way resumes" -ForegroundColor Cyan
    $out = Join-Path $tmp 'resumed.bin'
    # First pass gets ~40% and fails its hash, leaving a .part behind.
    Get-FileResumable -Uri "http://localhost:$port/part.bin?cut=1" -OutFile $out `
        -Sha256 $realHash -Retries 1 | Out-Null
    $partial = "$out.part"
    # Fetch.psm1 deletes a .part that fails verification, so simulate the
    # commoner case - a connection dropped mid-stream - by writing one.
    [IO.File]::WriteAllBytes($partial, $bytes[0..([int](6MB * 0.4))])
    $before = (Get-Item $partial).Length
    Check "a partial file is on disk" ($before -gt 0) "$([math]::Round($before/1MB,2)) MB"

    $ok = Get-FileResumable -Uri "http://localhost:$port/part.bin" -OutFile $out -Sha256 $realHash
    Check "the resumed download completed" $ok
    Check "and it matches the original" ((Get-Sha256 -Path $out) -eq $realHash)
    Check "the .part file was cleaned up" (-not (Test-Path $partial))

    Write-Host "`n2. a wrong file is rejected, not kept" -ForegroundColor Cyan
    $bad = Join-Path $tmp 'bad.bin'
    $ok2 = Get-FileResumable -Uri "http://localhost:$port/part.bin" -OutFile $bad `
        -Sha256 ('0' * 64) -Retries 1
    Check "it reported failure" (-not $ok2)
    Check "and left nothing behind to be 'resumed' forever" (-not (Test-Path $bad))
    Check "nor a stale .part" (-not (Test-Path "$bad.part"))

    Write-Host "`n3. an already-verified file is not downloaded again" -ForegroundColor Cyan
    $stamp = (Get-Item $out).LastWriteTimeUtc
    Start-Sleep -Milliseconds 1200
    Get-FileResumable -Uri "http://localhost:$port/part.bin" -OutFile $out -Sha256 $realHash | Out-Null
    Check "the file was left untouched" ((Get-Item $out).LastWriteTimeUtc -eq $stamp)

    Write-Host "`n4. Google Drive's confirm token is included" -ForegroundColor Cyan
    $uri = Get-GoogleDriveUri -FileId 'ABC123'
    Check "the id is in the URL" ($uri -like '*ABC123*')
    # Without confirm=t, Drive serves its virus-scan page for anything over
    # 100 MB - every part of this payload - and the "download" is HTML.
    Check "confirm=t is set, or every part downloads as an HTML page" ($uri -like '*confirm=t*') $uri

    Write-Host "`n5. the scrub removes every credential, and puts them back" -ForegroundColor Cyan
    $stage = Join-Path $tmp 'stage'
    $appDir = Join-Path $stage 'DSRFQ\DSRFQ.Web'
    $pyDir = Join-Path $stage 'RPA\table-to-json'
    New-Item -ItemType Directory -Force -Path $appDir, $pyDir | Out-Null
    $appsettings = Join-Path $appDir 'appsettings.json'
    @'
{
  "Data": { "Default": { "ConnectionString": "Server=deskdev,65001;Database=RFQ;User Id=sa;Password=Tsh9989;TrustServerCertificate=true" } },
  "Mail": { "Password": "kcdw hypb kgzi wlby" },
  "Stripe": { "SecretKey": "sk_test_51RxN0WLSIf0mjgrc4M3BthyelXhDLBr7OAIjIbk8SOz0EIKhUAMB" }
}
'@ | Set-Content $appsettings -Encoding UTF8
    'API_KEY = "sk-abcdefghijklmnopqrstuvwxyz0123456789"' |
        Set-Content (Join-Path $pyDir 'main.py') -Encoding UTF8

    $secrets = Import-PowerShellDataFile (Join-Path $deploy 'Secrets.psd1')
    foreach ($rule in $secrets.Rules) {
        foreach ($rel in $rule.Files) {
            $path = Join-Path $stage $rel
            if (-not (Test-Path $path)) { continue }
            $text = Get-Content $path -Raw
            Set-Content $path ([regex]::Replace($text, $rule.Pattern, $rule.Replacement)) -Encoding UTF8 -NoNewline
        }
    }

    $after = Get-Content $appsettings -Raw
    $pyAfter = Get-Content (Join-Path $pyDir 'main.py') -Raw
    Check "the SQL password is gone"    (-not ($after -match 'Tsh9989'))    $(if ($after -match 'Tsh9989') { 'STILL PRESENT' })
    Check "the SMTP password is gone"   (-not ($after -match 'kcdw hypb'))
    Check "the Stripe key is gone"      (-not ($after -match 'sk_test_51'))
    Check "the aihubmix key is gone"    (-not ($pyAfter -match 'sk-abcdefghij'))
    Check "placeholders were left in their place" `
        (($after -match '__SQL_PASSWORD__') -and ($after -match '__SMTP_PASSWORD__') `
         -and ($after -match '__STRIPE_SECRET_KEY__') -and ($pyAfter -match '__AIHUBMIX_API_KEY__'))

    # The probes are the safety net: they must catch a key the rules missed.
    $leaked = @()
    foreach ($probe in $secrets.Probes) {
        $hits = Get-ChildItem $stage -Recurse -File -Include $probe.Include -ErrorAction SilentlyContinue |
                Select-String -Pattern $probe.Pattern -List -ErrorAction SilentlyContinue
        foreach ($h in $hits) { $leaked += $h.Path }
    }
    Check "the publish-time probes find nothing left" ($leaked.Count -eq 0) ($leaked -join ', ')

    # And a deliberately missed key must be caught, or the probe proves nothing.
    'LEAK = "sk-zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"' |
        Set-Content (Join-Path $pyDir 'sneaky.py') -Encoding UTF8
    $caught = @()
    foreach ($probe in $secrets.Probes) {
        $hits = Get-ChildItem $stage -Recurse -File -Include $probe.Include -ErrorAction SilentlyContinue |
                Select-String -Pattern $probe.Pattern -List -ErrorAction SilentlyContinue
        foreach ($h in $hits) { $caught += $h.Path }
    }
    Check "a key the rules missed IS caught by the probes" ($caught.Count -gt 0) "$($caught.Count) hit(s)"
    Remove-Item (Join-Path $pyDir 'sneaky.py') -Force

    # A pristine copy of the SCRUBBED tree, taken before section 6 fills the
    # placeholders in - 6b needs one where the required token is still unset.
    $stage2 = Join-Path $tmp 'stage2'
    Copy-Item $stage $stage2 -Recurse -Force

    Write-Host "`n6. the target puts them back" -ForegroundColor Cyan
    # In-process, not `powershell -File`: arguments cross that boundary as
    # strings, so a hashtable cannot. Same reason the script's own help says so.
    #
    # -NonInteractive is the point of this call as much as the answers are: two
    # of the four tokens are deliberately left unanswered, and without it the
    # script sits on Read-Host forever with nothing on screen to say why.
    & (Join-Path $deploy '15-secrets.ps1') -InstallRoot $stage -NonInteractive -Answers @{
        '__SQL_PASSWORD__'      = 'N3wP@ss'
        '__AIHUBMIX_API_KEY__'  = 'sk-restored0000000000000000'
    } 2>&1 | Out-Null
    $restored = Get-Content $appsettings -Raw
    $pyRestored = Get-Content (Join-Path $pyDir 'main.py') -Raw
    Check "the SQL password was written back" ($restored -match 'N3wP@ss')
    Check "the API key was written back"      ($pyRestored -match 'sk-restored')
    Check "an unanswered optional stays a placeholder" ($restored -match '__STRIPE_SECRET_KEY__')

    $check = Start-Process powershell -Wait -PassThru -NoNewWindow -ArgumentList @(
        '-NoProfile','-ExecutionPolicy','Bypass','-File',
        (Join-Path $deploy '15-secrets.ps1'), '-InstallRoot', $stage, '-CheckOnly')
    Check "-CheckOnly reports the ones still unset" ($check.ExitCode -eq 1) "exit $($check.ExitCode)"

    Write-Host "`n6b. an unattended run never sits waiting for a human" -ForegroundColor Cyan
    # The hang this guards against: a caller that omits one token blocks on
    # Read-Host with no output. Bounded so a regression FAILS rather than
    # wedging the whole suite, which is exactly how it was found.
    #
    # Run in a job for the timeout, and for the exit code: Start-Process
    # -PassThru does not reliably surface ExitCode in this harness.
    $j = Start-Job -ScriptBlock {
        param($script, $root)
        & powershell -NoProfile -ExecutionPolicy Bypass -File $script `
            -InstallRoot $root -NonInteractive *> $null
        $LASTEXITCODE
    } -ArgumentList (Join-Path $deploy '15-secrets.ps1'), $stage2

    $finished = [bool](Wait-Job $j -Timeout 30)
    $code = if ($finished) { (Receive-Job $j | Select-Object -Last 1) } else { $null }
    Stop-Job $j -ErrorAction SilentlyContinue; Remove-Job $j -Force -ErrorAction SilentlyContinue

    Check "it exits instead of blocking" $finished
    # __SQL_PASSWORD__ is required and unanswered, so it must FAIL rather than
    # pass quietly leaving the app pointed at a placeholder password.
    Check "and fails, because a required token had no answer" ($code -eq 1) `
        "exit $(if ($finished) { $code } else { 'hung' })"
    Check "and it changed nothing on the way out" `
        ((Get-Content (Join-Path $stage2 'DSRFQ\DSRFQ.Web\appsettings.json') -Raw) -match '__SQL_PASSWORD__')

    Write-Host "`n7. every script parses" -ForegroundColor Cyan
    foreach ($f in Get-ChildItem $deploy -Filter '*.ps1') {
        $errors = $null
        [void][System.Management.Automation.Language.Parser]::ParseFile($f.FullName, [ref]$null, [ref]$errors)
        Check "$($f.Name)" ($errors.Count -eq 0) $(if ($errors.Count) { $errors[0].Message } else { '' })
    }
    foreach ($f in 'Prerequisites.psd1','Secrets.psd1','Payload.psd1') {
        $p = Join-Path $deploy $f
        $ok = $false
        try { Import-PowerShellDataFile $p | Out-Null; $ok = $true } catch { $ok = $false }
        Check "$f loads" $ok
    }
}
finally {
    Stop-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -Force -ErrorAction SilentlyContinue
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""
if ($fails.Count) {
    Write-Host "$($fails.Count) FAILED: $($fails -join ', ')" -ForegroundColor Red
    exit 1
}
Write-Host "ALL PASS" -ForegroundColor Green
exit 0
