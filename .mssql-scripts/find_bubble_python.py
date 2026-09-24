r"""Which interpreter on this box can run the One Supply PyQt app?

main.py imports PySide6 and the env file wants python=3.11, but its `prefix:`
points at C:\Users\chenf\...\envs\smart_bubble - another machine's user. So the
question is which of the interpreters actually present here satisfies the
imports, not which one the file names.

    python .mssql-scripts/find_bubble_python.py
"""

import glob
import os
import subprocess
import sys

CANDIDATES = [
    r"C:\Aizera\RPA\PythonLibrary\.venv\Scripts\python.exe",
    r"C:\Aizera\RPA\new_tsh\.mamba\envs\baojia\python.exe",
]
# Any conda/mamba env on the box, in case smart_bubble was recreated locally.
for pattern in (r"C:\Users\*\miniconda3\envs\*\python.exe",
                r"C:\Users\*\anaconda3\envs\*\python.exe",
                r"C:\ProgramData\miniconda3\envs\*\python.exe",
                r"C:\Aizera\**\envs\*\python.exe"):
    CANDIDATES.extend(glob.glob(pattern, recursive=True))

seen = set()
for exe in CANDIDATES:
    if exe in seen or not os.path.exists(exe):
        continue
    seen.add(exe)

    probe = (
        "import sys;"
        "v='.'.join(map(str,sys.version_info[:3]));"
        "mods=[];"
        "\nfor m in ('PySide6','cv2','numpy','fitz','onnxruntime','shapely'):\n"
        "    try:\n"
        "        __import__(m); mods.append(m)\n"
        "    except Exception: pass\n"
        "print(v, '|', ','.join(mods) or 'none')"
    )
    try:
        out = subprocess.run([exe, "-c", probe], capture_output=True,
                             text=True, timeout=120)
        result = (out.stdout or out.stderr).strip().splitlines()
        result = result[-1] if result else "(no output)"
    except Exception as exc:                                    # noqa: BLE001
        result = f"failed: {exc}"
    marker = "  <-- has PySide6" if "PySide6" in result else ""
    print(f"  {exe}\n      {result}{marker}")
