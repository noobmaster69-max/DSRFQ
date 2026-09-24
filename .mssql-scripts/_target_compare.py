"""Compare deployable code files (top two levels) between this laptop and the deploy target.

    python _target_compare.py

Writes results/target_diff.json: {"differ": [...], "missing": [...]} (local paths).
"""
import hashlib
import io
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tools"))
import paramiko  # noqa: E402

TREES = [r"C:\Aizera\RPA\API", r"C:\Aizera\RPA\RFQ", r"C:\Aizera\RPA\control-panel",
         r"C:\Aizera\RPA\table-recognize-3parts\source", r"C:\Aizera\RPA\new_tsh"]
EXT = (".py", ".yaml", ".yml", ".ps1", ".bat", ".html", ".js", ".css", ".txt")
SKIPD = {"__pycache__", ".idea", ".claude", "logs", "Image", "ConvertedDrawing", "replaced_img",
         ".mamba", "output", "locks"}

loc = {}
for t in TREES:
    for root, dirs, files in os.walk(t):
        depth = root[len(t):].count(os.sep)
        dirs[:] = [] if depth >= 1 else [d for d in dirs if d not in SKIPD]
        for f in files:
            if f.lower().endswith(EXT) and ".bak-" not in f:
                p = os.path.join(root, f)
                loc[p] = hashlib.md5(open(p, "rb").read()).hexdigest().upper()

lines = ["$files = @("] + [f"  '{p}'" for p in loc] + [")",
         "foreach ($f in $files) { if (Test-Path -LiteralPath $f) { (Get-FileHash -LiteralPath $f -Algorithm MD5).Hash + '|' + $f } else { 'MISSING|' + $f } }"]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("10.228.228.143", username="SP_Demo1", password=os.environ.get("TARGET_PASS", "SP_Demo1"),
          timeout=30, look_for_keys=False, allow_agent=False)
sftp = c.open_sftp()
sftp.putfo(io.BytesIO("\r\n".join(lines).encode("utf-8-sig")), "C:/Users/SP_Demo1/hash_compare.ps1")
_, out, err = c.exec_command("powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/SP_Demo1/hash_compare.ps1", timeout=600)
remote = {}
for line in out.read().decode("utf-8", "replace").splitlines():
    if "|" in line:
        h, p = line.strip().split("|", 1)
        remote[p.lower()] = h
e = err.read().decode("utf-8", "replace").strip()
if e:
    print("ERR", e[:800])
sftp.remove("C:/Users/SP_Demo1/hash_compare.ps1")
c.close()

differ = sorted(p for p in loc if remote.get(p.lower()) not in (None, "MISSING") and remote[p.lower()] != loc[p])
missing = sorted(p for p in loc if remote.get(p.lower()) == "MISSING")
os.makedirs("results", exist_ok=True)
json.dump({"differ": differ, "missing": missing}, open("results/target_diff.json", "w"), indent=1)
print(f"checked {len(loc)}; same {len(loc) - len(differ) - len(missing)}; differ {len(differ)}; missing on target {len(missing)}")
for p in differ:
    print("DIFFER ", p)
for p in missing:
    print("MISSING", p)
