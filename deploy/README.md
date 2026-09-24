# Deploying DSRFQ to a new Windows machine

## Two ways in

**`Bootstrap.cmd`** — what an operator runs. A few hundred KB. It fetches the
prerequisites from their own publishers, streams the payload in verified parts,
and asks for the credentials the payload was deliberately published without.
Start here.

**The numbered scripts** — the same steps, individually, for when one fails or
you are copying from a USB stick rather than downloading. `Bootstrap.ps1 -From
<step>` resumes at any of them.

### Why not one big installer

Wrapping everything — RabbitMQ, Python, Tesseract, Ollama and its 6 GB model,
SQL Server, MySQL — into a single archive measures **~37 GB unpacked, ~20 GB to
download**. Compression barely helps: the ratios were measured on this data, and
model weights pack to 89% of original while only native libraries reach 22%.

It also has two problems size alone does not describe. Several of those are
somebody else's software with redistribution terms, and the payload carries live
credentials — an SMTP app password and a Stripe key in `appsettings.json`, the
SQL password in its connection string, and the same plaintext aihubmix key in
six Python files. A share link would publish all of it.

The bootstrapper removes both: nothing third-party is redistributed, and
`11-publish-payload.ps1` strips every credential and **refuses to publish** if
its own probes still find one. What you host is ~13 GB of your own code and
models, in resumable 2 GB parts.

### The steps

| | |
|---|---|
| `00-preflight.ps1` | is this machine capable at all |
| `05-prereqs.ps1` | Python 3.12, ASP.NET 8, ODBC 17, Tesseract, Erlang+RabbitMQ, SQL Express, MySQL, Ollama — each detected first and skipped if present |
| `06-fetch-payload.ps1` | download, verify and extract the parts |
| `15-secrets.ps1` | ask for the credentials, write them in |
| `20-install.ps1` | repoint the venv, rewrite machine-specific config |
| `30-services.ps1` | register the NSSM services |
| `40-verify.ps1` | prove it came up |

`Fetch.psm1` is the shared download core: resumes with Range requests, verifies
every file against a SHA256, and skips anything already correct — so a failure
costs the remainder of one part, not the whole 13 GB. It also carries Drive's
`confirm=t` token, without which every part over 100 MB downloads as Drive's
virus-scan HTML page instead of the file.

On the source box, `11-publish-payload.ps1` turns a staged tree into those parts
plus `Payload.manifest.json` (hashes, sizes, and either a `BaseUri` or a Drive
id per part). Ship the `deploy` folder and that manifest; they are the installer.

Verified by `.mssql-scripts\check_bootstrapper.ps1` — resume, hash rejection,
the scrub, the round-trip, and that an unattended run never blocks on a prompt.

---


Windows services via NSSM, not containers. The reason is Bubble-V6: it is a
licensed PyInstaller bundle whose `vert` module is absent from source, whose
ONNX models ship encrypted, and which refuses to start without a real console.
Ballooning is core to DSRFQ, so the target is a Windows box either way — and
once that is settled, containerising the rest buys little. RabbitMQ stays a
container because that is the one piece containers suit.

## What ends up where

Install root is **`C:\Aizera`**, identical to the source. This is a hard
requirement, not a convention — two absolute paths are compiled into code this
deployment does not rewrite:

- `table-recognize-3parts\api.py:16` pins the CUDA DLL directory to
  `C:\Aizera\RPA\PythonLibrary\.venv\Lib\site-packages\nvidia`
- `RFQ\config.yaml` `UploadRoot` is `C:/Aizera/DSRFQ/DSRFQ.Web/App_Data/upload`,
  which DSRFQ.Web also writes through its own relative `UploadSettings`

Install elsewhere and the first fails with a CUDA load error, the second by
ballooning drawings the web app cannot see.

| Port | Service | Windows service |
|-----:|---------|-----------------|
| 5001 | DSRFQ.Web | `DSRFQ-Web` |
| 8000 | RPA API (middleware) | `DSRFQ-RpaApi` |
| 8888 | new_tsh (costing/CAM) | `DSRFQ-NewTsh` |
| 3600 | Table Recognize (PaddleOCR, **GPU**) | `DSRFQ-TableRecognize` |
| 3500 | REPLACE API v2 (PaddleOCR, **GPU**) | `DSRFQ-ReplaceApi` |
| 3501 | Table to JSON (CPU) | `DSRFQ-TableToJson` |
| — | RFQ consumer (RabbitMQ worker) | `DSRFQ-Consumer` |
| 5999 | Bubble-V6 ballooning | **not a service** — see below |
| 5672 / 15672 / 15675 | RabbitMQ | container |
| 11434 | Ollama | its own installer |

## Prerequisites on the target

Install these **before** copying anything. `00-preflight.ps1` checks every one.

1. **Windows 10/11 x64**, ≥ 60 GB free on `C:` (payload is ~24 GB).
2. **NVIDIA GPU + driver.** 3500 and 3600 both set `device = "gpu"` and do not
   fall back — without CUDA they fail to start.
3. **ASP.NET Core Runtime 8.x.** A later major also works via
   `DOTNET_ROLL_FORWARD=Major`, which `30-services.ps1` sets.
4. **CPython 3.12.x, installed for ALL USERS at `C:\Python312`.** Not 3.11, not
   3.13 — every compiled wheel in the venv is `cp312`. The path must contain no
   username, or the next machine has the same problem this deployment fixes.
5. **ODBC Driver 17 for SQL Server** — `pyodbc` opens it by exact name.
6. **Tesseract-OCR at `C:\Program Files\Tesseract-OCR`** — `handlers.py` sets
   `TESSDATA_PREFIX` to that path in code, not config.
7. **SQL Server** for the `RFQ` database.
8. **MySQL** for the `tsh_new` database. Easy to miss: this is a *second*
   database, used by new_tsh's costing engine and the consumer's
   `CostingDatabase`. Without it costing is dead while everything looks healthy.
9. **RabbitMQ** — Docker Desktop plus `docker-compose.rabbitmq.yml`, or a native
   Erlang + RabbitMQ install (steadier on a box nobody logs into; enable the
   `rabbitmq_web_mqtt` plugin either way).
10. **Ollama** with `qwen2.5vl:7b` (`ollama pull qwen2.5vl:7b`, 6 GB).

## Steps

```powershell
# ── on the TARGET ────────────────────────────────────────────────────────
powershell -ExecutionPolicy Bypass -File 00-preflight.ps1 `
    -SqlServer localhost -MySqlHost localhost
# fix anything it reports blocking, then:

# ── on the SOURCE box ────────────────────────────────────────────────────
powershell -ExecutionPolicy Bypass -File 10-stage.ps1 -Staging E:\DSRFQ-payload
# publishes DSRFQ.Web (Release), mirrors the trees, drops 21 GB of training
# data and build artefacts. Copy E:\DSRFQ-payload to C:\Aizera on the target.

# ── on the TARGET, elevated ──────────────────────────────────────────────
powershell -ExecutionPolicy Bypass -File 20-install.ps1 `
    -SqlServer localhost -SqlPassword '<sa password>' -MySqlHost localhost
powershell -ExecutionPolicy Bypass -File 30-services.ps1
Get-Service DSRFQ-* | Start-Service
powershell -ExecutionPolicy Bypass -File 40-verify.ps1
```

`20-install.ps1` takes `-WhatIfOnly` to show its edits without writing.
`30-services.ps1` takes `-Remove` to tear the services down again.

## Databases

**SQL Server / `RFQ`.** Schema is handled — FluentMigrator applies on app start,
so an empty database becomes a correct one the first time `DSRFQ-Web` runs.
Reference data is not: materials, machines, currencies and the like need a
backup/restore from the source. `40-verify.ps1` reads `dbo.VersionInfo` to
confirm migrations actually ran.

**MySQL / `tsh_new`.** No migration framework. Dump and restore it:

```
mysqldump -h deskdev -P 3307 -u joe -p tsh_new > tsh_new.sql
mysql -h localhost -P 3307 -u joe -p tsh_new < tsh_new.sql
```

Note the grant: MySQL privileges are per client host, so an account that worked
as `joe@deskdev` will not automatically work as `joe@localhost`.

## Bubble-V6 is not a service

Copy `C:\Aizera\Bubble\Bubble-V6` (4.7 GB) by hand, along with
`config\license.dat`.

It **cannot** run under NSSM. Verified: it dies during startup with a cp1252
`UnicodeEncodeError` out of `vert.initialize_license` when redirected, when
pointed at DEVNULL, and with both `PYTHONIOENCODING` and `PYTHONUTF8` set. It
starts every time with a console. A Windows service has no console.

Run it instead from a Startup-folder shortcut, or a Task Scheduler task set to
*Run only when user is logged on*, on a machine with autologon.
`35-bubble-autostart.ps1` registers that task (`OneZera-BallooningModel`):
run it as the user who stays logged on, `-StartNow` to start it straight away,
`-Remove` to take it off. Run it at the console as THAT user - registered by an
administrator it fires only when the administrator logs on, and over SSH a
non-admin account cannot reach Task Scheduler at all ("Cannot connect to CIM
server"). Where neither works, copy `OneZera-BallooningModel.cmd` into that
user's Startup folder (`shell:startup`); it waits a minute, skips if 5999 is
already listening, and starts Bubble.exe in its own console. It also needs
~1.5 GB of `%TEMP%` per run for its decrypted models.

Check the licence permits this machine before you plan around it.

## Sharp edges

- **Secrets are in the payload.** `appsettings.json` carries the SQL password,
  an SMTP app password and a Stripe key; the same plaintext `aihubmix` API key
  is in three Python config files. Rotate them, or at minimum know they travel.
- **localhost is baked in.** `HostName = "localhost"` is compiled into
  `ApiController.cs:240` and `CostingPartsEndpoint.cs:446`, and
  `ws://localhost:15675/ws` into `BallooningWidget.ts:211`. Fine for a
  single-box install. If anyone browses to DSRFQ from *their own* PC, the live
  ballooning progress bar silently will not connect — everything else works.
- **The venv cannot be rebuilt.** REPLACE-api-v2 has no `requirements.txt` at
  all, and table-recognize pins `paddlepaddle-gpu` to a dated nightly off a
  non-PyPI index that does not keep old builds. The installed 9 GB tree exists
  nowhere else — treat it as a build artefact and back it up.
- **`RFQ\requirements.txt` is not the truth.** It lists torch 2.11.0; the venv
  has 2.13.0+cpu. Do not `pip install -r` against it.
- **The control panel is an operator tool, not a supervisor.** Close it and
  anything it started dies. That is what the NSSM services are for; the panel
  is still worth having on the target for logs and one-off restarts.
