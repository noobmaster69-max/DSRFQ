<#
    The third-party software DSRFQ needs, fetched from its own publisher.

    None of this is redistributed. That is the point of the bootstrapper: these
    nine downloads are ~7.6 GB, they are somebody else's software, and several
    of them (SQL Server, MySQL) carry redistribution terms that a
    "wrap-everything-into-one-exe" installer would be quietly ignoring. Pulling
    them from the vendor at install time removes that question entirely and
    takes the artefact you host from ~20 GB to ~13 GB.

    Sha256 is left empty where the publisher serves a moving "latest" URL. An
    empty hash is accepted with a warning rather than refused - see
    Fetch.psm1's Test-Sha256 - because pinning a hash to a URL that changes
    weekly would break the kit every week. Fill one in whenever you pin a
    version, and prefer pinned versions for anything a customer will run.

    Detect is a scriptblock returning $true when the thing is ALREADY installed.
    It is checked first, so a second run of the bootstrapper installs nothing it
    does not have to, and a machine that already had Python keeps the one it had.
#>
@{
    # Where downloads are cached on the target. Kept out of the install root so
    # wiping C:\Aizera to reinstall does not mean downloading 7 GB again.
    CacheDir = 'C:\ProgramData\DSRFQ-Setup\downloads'

    Items = @(
        @{
            Key      = 'python312'
            Name     = 'CPython 3.12.10 (all users, C:\Python312)'
            Uri      = 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe'
            File     = 'python-3.12.10-amd64.exe'
            Sha256   = ''
            SizeMB   = 25
            # InstallAllUsers and a path with no username in it: the venv's
            # python.exe is a shim that resolves the real interpreter through an
            # absolute path, and a per-user install bakes a username into it -
            # which is the exact problem 20-install.ps1 exists to repair.
            Args     = '/quiet InstallAllUsers=1 TargetDir=C:\Python312 PrependPath=1 Include_test=0'
            Detect   = { Test-Path 'C:\Python312\python.exe' }
            Required = $true
            Why      = 'The shared venv carries site-packages only. Without a base 3.12 it cannot start at all, and 3.11 or 3.13 will not load its cp312 wheels.'
        }
        @{
            Key      = 'dotnet8'
            Name     = 'ASP.NET Core Runtime 8 (hosting bundle)'
            Uri      = 'https://builds.dotnet.microsoft.com/dotnet/aspnetcore/Runtime/8.0.11/aspnetcore-runtime-8.0.11-win-x64.exe'
            File     = 'aspnetcore-runtime-8.0.11-win-x64.exe'
            Sha256   = ''
            SizeMB   = 10
            Args     = '/install /quiet /norestart'
            Detect   = {
                $r = & dotnet --list-runtimes 2>$null
                [bool]($r | Where-Object { $_ -match 'Microsoft\.AspNetCore\.App 8\.' })
            }
            Required = $true
            Why      = 'DSRFQ.Web targets net8.0. A later major also works, but only because 30-services.ps1 sets DOTNET_ROLL_FORWARD.'
        }
        @{
            Key      = 'odbc17'
            Name     = 'ODBC Driver 17 for SQL Server'
            Uri      = 'https://go.microsoft.com/fwlink/?linkid=2249004'
            File     = 'msodbcsql17.msi'
            Sha256   = ''
            SizeMB   = 5
            Args     = '/quiet IACCEPTMSODBCSQLLICENSETERMS=YES'
            Detect   = {
                [bool](Get-OdbcDriver -ErrorAction SilentlyContinue |
                       Where-Object { $_.Name -eq 'ODBC Driver 17 for SQL Server' })
            }
            Required = $true
            Why      = 'pyodbc opens this driver by exact name, from RFQ\config.yaml. Driver 18 will not do - the name has to match.'
        }
        @{
            Key      = 'tesseract'
            Name     = 'Tesseract-OCR'
            Uri      = 'https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.4.0.20240606.exe'
            File     = 'tesseract-ocr-w64-setup-5.4.0.exe'
            Sha256   = ''
            SizeMB   = 50
            Args     = '/S /D=C:\Program Files\Tesseract-OCR'
            Detect   = { Test-Path 'C:\Program Files\Tesseract-OCR\tesseract.exe' }
            Required = $true
            Why      = 'handlers.py sets TESSDATA_PREFIX to this exact path in code, not config. Installed anywhere else and BOM extraction silently returns nothing.'
        }
        @{
            Key      = 'erlang'
            Name     = 'Erlang/OTP (RabbitMQ depends on it)'
            Uri      = 'https://github.com/erlang/otp/releases/download/OTP-26.2.5/otp_win64_26.2.5.exe'
            File     = 'otp_win64_26.2.5.exe'
            Sha256   = ''
            SizeMB   = 120
            Args     = '/S'
            # Erlang exists here only to run RabbitMQ, so a broker that is
            # already answering means there is nothing to install - it is being
            # hosted some other way (a container, or another machine).
            Detect   = {
                (Test-Path 'C:\Program Files\Erlang OTP\bin\erl.exe') -or
                (Test-NetConnection -ComputerName localhost -Port 5672 `
                    -InformationLevel Quiet -WarningAction SilentlyContinue)
            }
            Required = $true
            Why      = 'Native RabbitMQ rather than Docker Desktop: steadier on a box nobody logs into, and 600 MB smaller.'
        }
        @{
            Key      = 'rabbitmq'
            Name     = 'RabbitMQ Server'
            Uri      = 'https://github.com/rabbitmq/rabbitmq-server/releases/download/v3.13.7/rabbitmq-server-3.13.7.exe'
            File     = 'rabbitmq-server-3.13.7.exe'
            Sha256   = ''
            SizeMB   = 20
            Args     = '/S'
            # The PORT as well as the service. RabbitMQ is very often run in a
            # container - it is on the development box this was built on - and
            # a service-only test would install a second, native broker that
            # then fights the first for 5672 and 15672. Neither starts, and the
            # symptom is every queue silently going nowhere.
            Detect   = {
                [bool](Get-Service -Name 'RabbitMQ' -ErrorAction SilentlyContinue) -or
                (Test-NetConnection -ComputerName localhost -Port 5672 `
                    -InformationLevel Quiet -WarningAction SilentlyContinue)
            }
            # web_mqtt is not optional decoration: the ballooning widget
            # subscribes to ws://localhost:15675 for live progress, and without
            # it a recognition run looks like it did nothing until the drawing
            # is reopened.
            Post     = {
                $sbin = Get-ChildItem 'C:\Program Files\RabbitMQ Server' -Filter 'rabbitmq-plugins.bat' `
                            -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($sbin) { & $sbin.FullName enable rabbitmq_management rabbitmq_web_mqtt 2>&1 | Out-Null }
            }
            Required = $true
            Why      = 'Carries every job between the web app and the consumer, and the browser subscribes to 15675 for live progress.'
        }
        @{
            Key      = 'sqlexpress'
            Name     = 'SQL Server 2022 Express'
            Uri      = 'https://go.microsoft.com/fwlink/p/?linkid=2216019'
            File     = 'SQL2022-SSEI-Expr.exe'
            Sha256   = ''
            SizeMB   = 250
            # The bootstrap downloader, not the engine: it fetches the real
            # media itself. Interactive on purpose - instance name, sa password
            # and mixed-mode auth are decisions, not defaults.
            Args     = ''
            Interactive = $true
            Detect   = { [bool](Get-Service -Name 'MSSQL*' -ErrorAction SilentlyContinue) }
            Required = $false
            Why      = 'Holds the RFQ database. Skip if the target points at a SQL Server elsewhere.'
        }
        @{
            Key      = 'mysql'
            Name     = 'MySQL Community Server 8'
            Uri      = 'https://dev.mysql.com/get/Downloads/MySQLInstaller/mysql-installer-community-8.0.39.0.msi'
            File     = 'mysql-installer-community-8.0.39.0.msi'
            Sha256   = ''
            SizeMB   = 450
            Args     = ''
            Interactive = $true
            Detect   = { [bool](Get-Service -Name 'MySQL*' -ErrorAction SilentlyContinue) }
            Required = $false
            Why      = 'Holds tsh_new - a SECOND database, easy to miss. Without it costing is dead while every status chip still looks healthy.'
        }
        @{
            Key      = 'ollama'
            Name     = 'Ollama'
            Uri      = 'https://ollama.com/download/OllamaSetup.exe'
            File     = 'OllamaSetup.exe'
            Sha256   = ''
            SizeMB   = 700
            Args     = '/SILENT'
            # The model is fetched by the Post step below, so it is not part of
            # SizeMB. Counted separately or the script cheerfully announces a
            # 1.6 GB download and then spends an hour on 6 GB more.
            PostMB   = 6000
            Detect   = { [bool](Get-Command ollama -ErrorAction SilentlyContinue) }
            # 6 GB, pulled from Ollama rather than carried. This is the single
            # biggest reason the all-in-one installer was 20 GB.
            Post     = {
                Write-Host '      pulling qwen2.5vl:7b (~6 GB, once)' -ForegroundColor DarkGray
                & ollama pull qwen2.5vl:7b
            }
            Required = $false
            Why      = 'BOM extraction from drawings with no parts list. Without it that one stage is skipped; everything else runs.'
        }
    )
}
