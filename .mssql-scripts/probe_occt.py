"""Why does new_tsh's 3D processing fail?

api.py shells out with bare 'python' to run minimal_occt_test.py. If that
resolves to the system interpreter rather than the shared venv, the OCCT
bindings are missing and the render step fails, leaving png_path empty and
status_id = -1.
"""
import os
import shutil
import subprocess
import sys

BASE = r"C:\Aizera\RPA\new_tsh"
SCRIPT = os.path.join(BASE, "minimal_occt_test.py")
VENV = r"C:\Aizera\RPA\PythonLibrary\.venv\Scripts\python.exe"
STEP = r"C:\Aizera\RPA\new_tsh\output\zJr6Kghni9\0023-62709_01_Green_Standard.stp"

print("script exists      :", os.path.exists(SCRIPT))
print("sample STEP exists :", os.path.exists(STEP))

resolved = shutil.which("python")
print("\nbare 'python' resolves to:\n  %s" % resolved)
print("venv interpreter:\n  %s" % VENV)
print("same interpreter :", os.path.normcase(resolved or "") == os.path.normcase(VENV))


def has_occ(exe):
    try:
        r = subprocess.run([exe, "-c", "import OCC; print(OCC.__file__)"],
                           capture_output=True, text=True, timeout=120)
        return r.returncode == 0, (r.stdout or r.stderr).strip().splitlines()[-1][:90]
    except Exception as exc:
        return False, repr(exc)


for label, exe in (("bare python", resolved), ("venv python", VENV)):
    if not exe:
        print("\n%-12s not found" % label)
        continue
    ok, detail = has_occ(exe)
    print("\n%-12s OCC importable: %s\n  %s" % (label, ok, detail))

if os.path.exists(SCRIPT) and os.path.exists(STEP):
    out_dir = os.path.join(os.path.dirname(STEP), "probe_out")
    os.makedirs(out_dir, exist_ok=True)
    for label, exe in (("bare python", resolved), ("venv python", VENV)):
        if not exe:
            continue
        print("\n=== running minimal_occt_test.py with %s ===" % label)
        r = subprocess.run([exe, SCRIPT, STEP, out_dir],
                           capture_output=True, text=True, timeout=900)
        print("  returncode: %s" % r.returncode)
        tail = (r.stdout or "").strip().splitlines()[-4:]
        for line in tail:
            print("  out: %s" % line[:100])
        err = (r.stderr or "").strip().splitlines()[-4:]
        for line in err:
            print("  err: %s" % line[:100])
        pngs = [f for f in os.listdir(out_dir) if f.lower().endswith(".png")]
        print("  pngs produced: %d %s" % (len(pngs), pngs[:3]))
        for f in pngs:
            os.remove(os.path.join(out_dir, f))
