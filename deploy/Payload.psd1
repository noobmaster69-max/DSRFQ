<#
    What gets shipped to a new machine, and what deliberately does not.

    Measured, not guessed: a naive copy of these eight trees is 45 GB, of which
    21 GB is training data, build output and processed drawings that the running
    system never reads. The excludes below are what takes it to ~24 GB.

    Install root is C:\Aizera on the target, identical to the source. That is a
    hard requirement rather than a convention - these paths are compiled into
    code that this deployment does not change:
      * table-recognize-3parts\api.py:16 pins the CUDA DLL directory to
        C:\Aizera\RPA\PythonLibrary\.venv\Lib\site-packages\nvidia
      * RFQ\config.yaml UploadRoot is C:/Aizera/DSRFQ/DSRFQ.Web/App_Data/upload,
        which the web app also writes through its own relative UploadSettings
    Install anywhere else and both break silently - the first with a CUDA load
    failure, the second by ballooning drawings the web app cannot see.
#>
@{
    InstallRoot = 'C:\Aizera'

    # Source tree -> destination, relative to InstallRoot on both sides.
    Items = @(
        @{
            Name    = 'Shared Python venv'
            Source  = 'RPA\PythonLibrary\.venv'
            Size    = '9.0 GB'
            # Shipped whole, and it has to be: this venv cannot be rebuilt on
            # the target. REPLACE-api-v2 has no requirements.txt at all, and
            # table-recognize pins paddlepaddle-gpu to a dated nightly off a
            # non-PyPI index that does not keep old builds. The installed set
            # exists nowhere else.
            Exclude = @('**\__pycache__')
        }
        @{
            Name    = 'DSRFQ.Web (published)'
            # DSRFQ\DSRFQ.Web, not DSRFQ.Web: Source is relative to SourceRoot
            # (C:\Aizera), and the repository sits one level down. This was
            # wrong, and because a missing tree only warned, the whole payload
            # was built and packed with no web application in it.
            Source  = 'DSRFQ\DSRFQ.Web\bin\Release\net8.0\publish'
            Dest    = 'DSRFQ\DSRFQ.Web'
            Size    = '~0.2 GB'
            # Published output, not the source tree: no obj\, no node_modules,
            # no .ts. 10-stage.ps1 runs dotnet publish to produce it.
            Staged  = $true
        }
        @{
            Name    = 'RPA API (8000)'
            Source  = 'RPA\API'
            Size    = '0.15 GB'
            Exclude = @('**\__pycache__', '**\.idea', '**\.claude')
        }
        @{
            Name    = 'new_tsh (8888)'
            Source  = 'RPA\new_tsh'
            Size    = '7.2 GB'
            # .mamba is 7.08 GB of it and is NOT optional - pythonocc-core /
            # OCCT 7.9.0 is conda-only, there is no pip wheel, and the geometry
            # subprocess runs on that 3.11 interpreter rather than the 3.12 venv.
            # output\ is generated quotes and rebuilds itself.
            Exclude = @('**\__pycache__', 'output', 'locks', '**\.idea')
        }
        @{
            Name    = 'RFQ consumer'
            Size    = '~0.05 GB'
            Source  = 'RPA\RFQ'
            # ConvertedDrawing and replaced_img are working output of past runs.
            Exclude = @('**\__pycache__', 'ConvertedDrawing', 'replaced_img',
                        '**\.idea', '**\.claude')
            # Measured: these three are 1.09 GB of the 1.07 GB this tree came
            # out at - a log, a customer archive and a spreadsheet, none of
            # which the consumer reads. Named rather than globbed for the last
            # two, so a template that happens to be .xlsx still ships.
            ExcludeFiles = @('*.log', 'LamResearch.zip',
                             'Previous RFQ Masterlist (1).xlsx')
        }
        @{
            Name    = 'Table Recognize (3600)'
            Source  = 'RPA\table-recognize-3parts'
            Size    = '~0.25 GB of 25.2 GB'
            # The big one. training\ is 16.9 GB of labelled datasets, and
            # build\ dist\ installer_output\ are PyInstaller artefacts from the
            # exe packaging - none of it is read at runtime. models\ (0.16 GB)
            # is what the service actually loads.
            Exclude = @('training', 'build', 'dist', 'installer_output',
                        'offline_bundle', 'UPLOAD', 'archive', 'output',
                        '**\__pycache__', '**\.idea')
        }
        @{
            Name    = 'REPLACE API v2 (3500)'
            Source  = 'RPA\REPLACE-api-v2'
            Size    = '0.62 GB'
            Exclude = @('**\__pycache__', '**\.idea')
        }
        @{
            Name    = 'Table to JSON (3501)'
            Source  = 'RPA\table-to-json'
            Size    = '0.01 GB'
            Exclude = @('**\__pycache__')
        }
        @{
            Name    = 'Control panel'
            Source  = 'RPA\control-panel'
            Size    = 'tiny'
            # Not required to run anything, but it is how you start, stop and
            # read the logs of all of the above without a terminal. Worth the
            # few hundred KB on a machine somebody has to operate.
            Exclude = @('**\__pycache__')
        }
    )

    # Copied by hand, deliberately not automated here.
    Manual = @(
        @{
            Name   = 'Bubble-V6 (5999)'
            Source = 'C:\Aizera\Bubble\Bubble-V6'
            Size   = '4.7 GB'
            Why    = @'
Licensed. config\license.dat is validated by the proprietary `vert` module,
which is absent from the source checkout, and the ONNX models ship encrypted.
It also refuses to start without a real console - so it cannot be an NSSM
service either. See README, "Bubble-V6 is not a service".
'@
        }
        @{
            Name   = 'Ollama model qwen2.5vl:7b'
            Source = 'ollama pull qwen2.5vl:7b'
            Size   = '6.0 GB'
            Why    = @'
Pulled on the target rather than copied - Ollama manages its own blob store.
Needed by the RFQ consumer for BOM extraction and by REPLACE-api-v2.
'@
        }
        @{
            Name   = 'HuggingFace cache'
            Source = '%USERPROFILE%\.cache\huggingface'
            Size   = '0.9 GB'
            Why    = @'
handlers.py loads three sentence-transformer models at import. Copy the cache
or the consumer downloads them on first start - which works, but only if the
target has internet, and it fails silently into a slow first run if not.
'@
        }
    )
}
