"""Flag source files damaged by a cp1252-read / utf-8-write round trip.

PowerShell 5.1's Get-Content assumes the ANSI codepage when a file has no BOM,
so piping a UTF-8 source file through Get-Content | Set-Content silently
double-encodes every non-ASCII character and adds a BOM. The result still
compiles, which is why it goes unnoticed until a glyph reaches a user.

The giveaway is a Latin-1 lead byte (C2/C3) or a smart-quote sequence appearing
where the file should hold a real symbol.

    python .mssql-scripts/check_encoding.py <dir-or-file> [...]
"""

import glob
import os
import sys

# Each of these is what a common UTF-8 character turns into after one bad round
# trip. None of them occurs naturally in source.
MARKERS = ["Ã", "â€", "Â ", "Â°",
           "â", "Ã", "Ã¢"]

targets = sys.argv[1:] or [
    r"DSRFQ.Web\Modules\Common\Widgets\BallooningWidget"]

files = []
for t in targets:
    if os.path.isdir(t):
        for ext in ("ts", "tsx", "cs", "py", "yaml", "json"):
            files += glob.glob(os.path.join(t, "**", f"*.{ext}"), recursive=True)
    elif os.path.isfile(t):
        files.append(t)

print(f"{'file':<34} {'BOM':<6} {'utf8':<6} suspect")
print("-" * 62)
bad_files = []
for p in sorted(files):
    raw = open(p, "rb").read()
    bom = raw[:3] == b"\xef\xbb\xbf"
    try:
        text = raw.decode("utf-8")
        ok = True
    except UnicodeDecodeError:
        text = raw.decode("cp1252", "replace")
        ok = False
    hits = sum(text.count(m) for m in MARKERS)
    # A BOM on its own is not damage here - tsconfig.json sets emitBOM, so the
    # project's own compiler writes them. Only mojibake or a file that no
    # longer decodes as UTF-8 means something was destroyed.
    if hits or not ok:
        bad_files.append(p)
    print(f"{os.path.basename(p):<34} {str(bom):<6} {str(ok):<6} "
          f"{hits if hits else '-'}")

print()
if bad_files:
    print(f"{len(bad_files)} file(s) need attention:")
    for p in bad_files:
        print(f"  {p}")
    print("\nrepair with: python .mssql-scripts/fix_mojibake.py <file> --apply")
else:
    print("all clean")
sys.exit(1 if bad_files else 0)
