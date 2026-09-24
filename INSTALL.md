# Installing DSRFQ on a new Windows machine

One document, start to finish. Read **Before you start** first — gathering the
credentials and checking the disk takes five minutes and saves an hour.

---

## 1. Before you start

### The machine

| | Needs | Why |
|---|---|---|
| Windows | 10 or 11, **64-bit** | |
| Free disk on `C:` | **60 GB** | ~8 GB download, 17 GB extracted, plus SQL Server and MySQL data |
| GPU | **NVIDIA, with driver installed** | Two services set `device = "gpu"` and do **not** fall back to CPU — without it they refuse to start |
| Network | Able to reach python.org, microsoft.com, github.com, ollama.com | The prerequisites are fetched from their publishers, not bundled |
| Rights | **Administrator** | Installs services and writes to Program Files |

Check the GPU before anything else — open a command prompt and run `nvidia-smi`.
If that is not found, stop: ballooning and drawing replacement will not run on
this machine.

### The install location is fixed

Everything installs to **`C:\Aizera`**. This is not a preference. Two absolute
paths are compiled into code this installer does not rewrite:

- `table-recognize-3parts\api.py` pins the CUDA library folder to
  `C:\Aizera\RPA\PythonLibrary\.venv\Lib\site-packages\nvidia`
- `RFQ\config.yaml` writes uploads to `C:/Aizera/DSRFQ/DSRFQ.Web/App_Data/upload`

Install anywhere else and the first fails with a CUDA load error, the second by
ballooning drawings the web application cannot find.

### Credentials to have ready

The installer asks for these. Nothing is shipped in the download — they were
deliberately removed before it was published — so have them to hand:

| Asked for | Required? | Notes |
|---|---|---|
| **SQL Server password** | Yes | The `sa` password you set when installing SQL Server, or the one for your existing server |
| **MySQL password** | Yes | For the `tsh_new` database. Miss this and costing silently fails while every status chip still reads healthy |
| **DSRFQ web login password** | Yes | The account the background consumer signs in as |
| **aihubmix API key** | No | CAM analysis and drawing replacement. Without it those two features fail; everything else runs |
| **TSH portal password** | No | Leave blank if unused |
| **SMTP app password** | No | Blank disables outgoing mail |
| **Stripe secret key** | No | Blank if billing is unused |

Anything left blank stays a visible placeholder, so the feature that needs it
fails with a recognisable name in the error rather than a puzzling login failure.

### Decide first: where do the databases live?

- **On this machine** — let the installer install SQL Server Express and MySQL.
- **On another server** — skip both and point at it:

  ```
  Bootstrap.ps1 -SkipPrereqs sqlexpress,mysql -SqlServer sqlbox,1433 -MySqlHost sqlbox
  ```

---

## 2. Get the files

You need two things:

1. **The installer folder** — this folder. A few hundred KB.
2. **The payload parts** — `dsrfq-payload.7z.001`, `.002`, … plus
   `Payload.manifest.json`.

Put `Payload.manifest.json` **beside these scripts**. The parts themselves can
either be downloaded by the installer, or copied here by hand if you already
have them on a USB drive.

Also install **7-Zip** (<https://7-zip.org>) — the payload is a 7z archive and
the installer needs it to extract.

### If you are carrying it on a USB drive

You do not need to download anything, and you can carry **less** than you might
expect. There are two forms of the same payload — bring one, not both:

| Folder | Size | Bring it? |
|---|---:|---|
| `DSRFQ-payload` | ~17 GB | **Yes** — this *is* the installed tree, already unpacked |
| `DSRFQ-Installer` | 425 KB | **Yes** — the scripts |
| `DSRFQ-dist` | ~8 GB | **No** — the compressed form of `DSRFQ-payload`. Carrying both doubles the space for nothing |

`DSRFQ-dist` only exists so the payload can be *downloaded*. Over USB it is dead
weight, and using it means extracting 8 GB into 17 GB that you already have.

**Steps:**

1. Copy the **contents** of `DSRFQ-payload` into `C:\Aizera` — so you end up with
   `C:\Aizera\DSRFQ\`, `C:\Aizera\RPA\`, and so on. Not `C:\Aizera\DSRFQ-payload\`.
2. Copy `DSRFQ-Installer` anywhere convenient — the Desktop is fine.
3. From it, run as administrator:

   ```
   Bootstrap.ps1 -SkipPayload
   ```

That skips the download and extract, and does everything else: prerequisites,
credentials, repointing the virtual environment, services, verification. It
checks the payload really is at `C:\Aizera` first and stops if it is not, rather
than failing three steps later while repointing a venv that is not there.

**The prerequisites are still downloaded** (~7.6 GB) unless this machine already
has them. For a genuinely offline install, run `05-prereqs.ps1` on a connected
machine first — it caches everything in
`C:\ProgramData\DSRFQ-Setup\downloads` — then carry that folder across too and
put it in the same place before running the bootstrapper.

> **The payload contains no passwords.** They were removed before it was
> published, so a lost USB drive does not leak your credentials — but it also
> means step 4 still has to ask for them.

---

## 3. Run it

Right-click **`Bootstrap.cmd`** → **Run as administrator**. (Double-clicking
works too; it asks for elevation itself.)

That is the whole installation. It runs seven steps in order and stops at the
first real failure, telling you how to resume.

### What each step does, and roughly how long

| Step | What happens | Time |
|---|---|---|
| **1/7 Preflight** | Checks disk, GPU, runtimes. Reports what is missing — most of which step 2 installs. Answer `y` to continue | seconds |
| **2/7 Prerequisites** | Downloads and installs Python 3.12, ASP.NET Core 8, ODBC 17, Tesseract, Erlang + RabbitMQ, optionally SQL Server and MySQL, then Ollama and its 6 GB model | **~7.6 GB.** 30–90 min on a normal line |
| **3/7 Payload** | Downloads the parts, verifies each against its hash, extracts to `C:\Aizera` | **~8 GB.** 20–60 min |
| **4/7 Credentials** | Asks for the passwords from the table above. Nothing is echoed | 2 min |
| **5/7 Install** | Repoints the Python virtual environment and rewrites machine-specific config | 1 min |
| **6/7 Services** | Registers the Windows services and starts them | 2 min |
| **7/7 Verify** | Checks every port answers | 1 min |

**Two steps are interactive on purpose.** SQL Server and MySQL open their own
installers, because instance name, `sa` password and mixed-mode authentication
are decisions rather than defaults. When SQL Server asks:

- Choose **Basic** installation unless you have a reason not to
- Enable **Mixed Mode** authentication and set an `sa` password — write it down,
  step 4 asks for it
- Default instance is fine

### If a step fails

Fix the cause, then resume from that step rather than starting over:

```
Bootstrap.ps1 -From prereqs      # or: payload, secrets, install, services, verify
```

Every step is safe to re-run. Installed prerequisites are detected and skipped,
verified payload parts are not downloaded again, and credentials already written
are not asked for a second time.

---

## 4. Three things the installer cannot do

These are deliberate, not oversights.

### Bubble-V6 (4.7 GB) — copy by hand

It is licensed third-party software, so it is not in the download.

1. Copy `C:\Aizera\Bubble\Bubble-V6` from the source machine, including
   `config\license.dat`.
2. Check the licence permits this machine.
3. It **cannot run as a Windows service** — it dies during startup without a
   real console. Start it from a Startup-folder shortcut, or a Task Scheduler
   task set to *Run only when user is logged on*, on a machine with autologon.
4. It needs ~1.5 GB of `%TEMP%` per run for its decrypted models.

Without it, ballooning fails; everything else works.

### The databases — restore your data

**SQL Server / `RFQ`** — the schema builds itself. FluentMigrator runs on first
start, so an empty database becomes a correct one the first time the web
application launches. **Reference data does not**: materials, machines and
currencies need restoring from a backup of the source.

**MySQL / `tsh_new`** — no migrations at all. Dump and restore:

```
mysqldump -h <source> -P 3307 -u joe -p tsh_new > tsh_new.sql
mysql     -h localhost -P 3307 -u joe -p tsh_new < tsh_new.sql
```

MySQL privileges are per client host, so an account that worked as `joe@source`
will **not** automatically work as `joe@localhost`. Grant it again.

### HuggingFace cache (0.9 GB) — optional

The consumer loads three sentence-transformer models when it starts. Copy
`%USERPROFILE%\.cache\huggingface` from the source machine, or let it download
them on first run — which works, but only if this machine has internet, and
otherwise fails quietly into a very slow first run.

---

## 5. Check it worked

```
powershell -ExecutionPolicy Bypass -File 40-verify.ps1
```

Or open these:

| | |
|---|---|
| DSRFQ | <http://localhost:5001> |
| RabbitMQ management | <http://localhost:15672> |
| Control panel | `C:\Aizera\RPA\control-panel` |

Services all begin `DSRFQ-`:

```
Get-Service DSRFQ-*
```

| Port | Service |
|---:|---|
| 5001 | DSRFQ.Web |
| 8000 | RPA API (middleware) |
| 8888 | new_tsh (costing / CAM) |
| 3600 | Table Recognize (**GPU**) |
| 3500 | REPLACE API v2 (**GPU**) |
| 3501 | Table to JSON |
| 5999 | Bubble-V6 (started by hand) |
| 5672 / 15672 / 15675 | RabbitMQ |
| 11434 | Ollama |

Confirm no credential was left unset:

```
powershell -ExecutionPolicy Bypass -File 15-secrets.ps1 -CheckOnly
```

---

## 6. When something is wrong

| Symptom | Cause | Fix |
|---|---|---|
| A download fails repeatedly with **hash mismatch** | Google Drive served its "can't scan this file" page instead of the file | Open the share link in a browser once and confirm the download, then re-run |
| **3500 or 3600 will not start** | No NVIDIA driver, or CUDA not loading | Run `nvidia-smi`. These two do not fall back to CPU |
| Python imports fail everywhere | Base Python is not 3.12, or was installed per-user | Must be **3.12.x**, for **all users**, at `C:\Python312`. Not 3.11, not 3.13 — every compiled package is built for 3.12 |
| The consumer dies mid-drawing | ODBC Driver 17 missing | Driver **17** exactly — the code opens it by name, and 18 will not do |
| BOM extraction returns nothing, silently | Tesseract not at its expected path | Must be at `C:\Program Files\Tesseract-OCR` — that path is in code, not config |
| Costing fails, everything looks healthy | MySQL / `tsh_new` missing or wrong password | This is a **second** database, separate from SQL Server |
| Ballooning progress bar never moves | RabbitMQ `web_mqtt` plugin not enabled | The browser subscribes on port 15675 |
| Ballooning does nothing at all | Bubble-V6 not running | It is not a service — see section 4 |
| A page loads but looks stale | Browser cache | Hard-refresh (Ctrl+F5) |

**Logs** are in `C:\Aizera\logs`, one per service. The control panel reads them
without a terminal, and can stop and start individual services.

---

## 7. Reinstalling or removing

Remove the services, keeping the files:

```
powershell -ExecutionPolicy Bypass -File 30-services.ps1 -Remove
```

To reinstall from scratch, delete `C:\Aizera` and run `Bootstrap.cmd` again. The
downloads are cached in `C:\ProgramData\DSRFQ-Setup`, so the ~15 GB is not
fetched twice — delete that folder too if you want a genuinely clean run.

---

## Appendix: what gets installed where

**From the publishers** (~7.6 GB, step 2) — Python 3.12, ASP.NET Core 8 runtime,
ODBC Driver 17, Tesseract-OCR, Erlang + RabbitMQ, SQL Server Express, MySQL,
Ollama plus `qwen2.5vl:7b`.

**From the payload** (~17 GB extracted, step 3) — the shared Python virtual
environment (8.5 GB; it cannot be rebuilt, which is why it ships whole), the
published web application, new_tsh's costing engine and its conda environment
(6.9 GB), the RPA middleware, the RFQ consumer, three model services and the
control panel.

**By hand** — Bubble-V6, the two databases' data, and optionally the HuggingFace
cache.
