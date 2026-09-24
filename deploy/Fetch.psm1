<#
    Downloading large files onto a machine you are not sitting at.

    Everything the bootstrapper pulls is big - the smallest prerequisite is
    25 MB and the payload runs to gigabytes - so a download that cannot resume
    is a download that will eventually fail and start again from zero. This
    module is the one place that is handled, and both 05-prereqs.ps1 and
    06-fetch-payload.ps1 go through it.

    Three things it does that Invoke-WebRequest does not:

      * RESUMES. A partial file is continued with a Range request rather than
        overwritten, so a dropped connection at 90% of 2 GB costs the last 10%.

      * VERIFIES. Every file is checked against a SHA256 from the manifest.
        A truncated or tampered download is caught here rather than three steps
        later as an unexplained install failure.

      * SKIPS work already done. A file that is present and hashes correctly is
        left alone, so re-running the bootstrapper after a failure is cheap and
        safe rather than a full re-download.
#>

Set-StrictMode -Version Latest

function Get-Sha256 {
    param([Parameter(Mandatory)][string] $Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToUpperInvariant()
}

function Test-Sha256 {
    <#
      .SYNOPSIS
        Does the file on disk match the expected hash?

      .DESCRIPTION
        An empty or absent expectation returns $true. That is deliberate: a
        manifest entry whose hash has not been filled in yet should not stop an
        install, and the caller warns about it separately. Silently failing
        closed here would make the kit unusable the first time somebody adds a
        prerequisite.
    #>
    param(
        [Parameter(Mandatory)][string] $Path,
        [string] $Sha256
    )
    if ([string]::IsNullOrWhiteSpace($Sha256)) { return $true }
    $actual = Get-Sha256 -Path $Path
    return $actual -eq $Sha256.ToUpperInvariant()
}

function Get-FileResumable {
    <#
      .SYNOPSIS
        Download a URL to a path, resuming and verifying.

      .PARAMETER Sha256
        Expected hash. When supplied, a file already present and matching is
        left untouched, and a completed download that does NOT match is deleted
        rather than kept - a bad file that stays on disk would be "resumed"
        forever on the next run.

      .PARAMETER Retries
        Attempts per file. Each retry resumes from what arrived, so three
        retries on a flaky line is three chances at the remainder, not three
        chances at the whole thing.
    #>
    param(
        [Parameter(Mandatory)][string] $Uri,
        [Parameter(Mandatory)][string] $OutFile,
        [string] $Sha256,
        [int]    $Retries = 4,
        [int]    $TimeoutSec = 900
    )

    $dir = Split-Path -Parent $OutFile
    if ($dir -and -not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    if ((Test-Path -LiteralPath $OutFile) -and (Test-Sha256 -Path $OutFile -Sha256 $Sha256)) {
        if ($Sha256) {
            Write-Host "      already present and verified" -ForegroundColor DarkGray
            return $true
        }
        # No hash to check against: size is the only evidence there is, so an
        # existing non-empty file is taken as done. Manifests should carry
        # hashes precisely so this branch is not the one that runs.
        if ((Get-Item -LiteralPath $OutFile).Length -gt 0) {
            Write-Host "      already present (no hash to verify against)" -ForegroundColor Yellow
            return $true
        }
    }

    $part = "$OutFile.part"
    for ($attempt = 1; $attempt -le $Retries; $attempt++) {
        try {
            $have = 0L
            if (Test-Path -LiteralPath $part) { $have = (Get-Item -LiteralPath $part).Length }

            $request = [System.Net.HttpWebRequest]::Create($Uri)
            $request.Timeout = $TimeoutSec * 1000
            $request.ReadWriteTimeout = $TimeoutSec * 1000
            $request.UserAgent = 'DSRFQ-Bootstrap/1.0'
            $request.AllowAutoRedirect = $true
            if ($have -gt 0) {
                $request.AddRange([long]$have)
                Write-Host "      resuming at $([math]::Round($have/1MB,1)) MB" -ForegroundColor DarkGray
            }

            $response = $request.GetResponse()
            # 206 means the server honoured the range. A 200 to a ranged request
            # means it did not, and the body starts from zero - appending it
            # would silently corrupt the file, so the partial is discarded.
            $append = $have -gt 0 -and $response.StatusCode -eq [System.Net.HttpStatusCode]::PartialContent
            if ($have -gt 0 -and -not $append) {
                Write-Host "      server ignored the range; starting again" -ForegroundColor Yellow
            }

            $total = $response.ContentLength + $(if ($append) { $have } else { 0 })
            $mode = if ($append) { [System.IO.FileMode]::Append } else { [System.IO.FileMode]::Create }
            $in = $response.GetResponseStream()
            $out = New-Object System.IO.FileStream($part, $mode, [System.IO.FileAccess]::Write)
            try {
                $buffer = New-Object byte[] (1MB)
                $done = if ($append) { $have } else { 0L }
                $lastReport = [DateTime]::UtcNow
                while (($read = $in.Read($buffer, 0, $buffer.Length)) -gt 0) {
                    $out.Write($buffer, 0, $read)
                    $done += $read
                    if (([DateTime]::UtcNow - $lastReport).TotalSeconds -ge 3) {
                        $pct = if ($total -gt 0) { [math]::Round(100 * $done / $total) } else { 0 }
                        Write-Host ("`r      {0,6:N0} MB of {1,6:N0} MB  {2,3}%" -f `
                            ($done/1MB), ($total/1MB), $pct) -NoNewline
                        $lastReport = [DateTime]::UtcNow
                    }
                }
            }
            finally {
                $out.Dispose(); $in.Dispose(); $response.Dispose()
            }
            Write-Host ""

            if (-not (Test-Sha256 -Path $part -Sha256 $Sha256)) {
                Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue
                throw "hash mismatch (expected $Sha256)"
            }

            Move-Item -LiteralPath $part -Destination $OutFile -Force
            return $true
        }
        catch {
            Write-Host ""
            Write-Host "      attempt $attempt/$Retries failed: $($_.Exception.Message)" -ForegroundColor Yellow
            if ($attempt -eq $Retries) { return $false }
            Start-Sleep -Seconds ([math]::Min(30, 3 * $attempt))
        }
    }
    return $false
}

function Get-GoogleDriveUri {
    <#
      .SYNOPSIS
        A direct-download URL for a Google Drive file id.

      .DESCRIPTION
        Drive cannot virus-scan anything over 100 MB, and serves an HTML
        interstitial instead of the file until a confirm token comes back. Every
        part of this payload is over that limit, so without this a "download"
        succeeds and writes a few KB of HTML that then fails its hash check.

        Uses the confirm=t shortcut rather than scraping the token out of the
        page: it has been stable for years and needs no cookie jar. If Drive
        changes it, the hash check is what catches it - the download will fail
        verification rather than install a page of HTML.
      #>
    param([Parameter(Mandatory)][string] $FileId)
    return "https://drive.usercontent.google.com/download?id=$FileId&export=download&confirm=t"
}

Export-ModuleMember -Function Get-Sha256, Test-Sha256, Get-FileResumable, Get-GoogleDriveUri
