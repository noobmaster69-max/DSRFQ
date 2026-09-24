"""Undo a cp1252-read / utf-8-write round trip on a text file.

PowerShell 5.1's Get-Content defaults to the ANSI codepage when a file has no
BOM, and Set-Content -Encoding utf8 writes a BOM. Round-tripping a UTF-8 source
file through them therefore does two things at once: prepends EF BB BF, and
re-encodes every multi-byte character as if its individual bytes had been
cp1252 characters.

The transform is exactly reversible: decode the file as UTF-8, then encode that
string back to cp1252, and the original bytes reappear.

    python .mssql-scripts/fix_mojibake.py <file> [--apply]

Without --apply it only reports what it would change.
"""

import os
import sys

path = sys.argv[1] if len(sys.argv) > 1 else None
apply = "--apply" in sys.argv
if not path or not os.path.isfile(path):
    sys.exit(f"usage: fix_mojibake.py <file> [--apply]   (no such file: {path})")

raw = open(path, "rb").read()
had_bom = raw.startswith(b"\xef\xbb\xbf")
body = raw[3:] if had_bom else raw

try:
    text = body.decode("utf-8")
except UnicodeDecodeError as exc:
    sys.exit(f"not valid UTF-8, so this is not the damage this repairs: {exc}")

# Python's cp1252 codec leaves five slots (81 8D 8F 90 9D) undefined and
# refuses them; .NET's Windows-1252 - which is what PowerShell used on the way
# in - maps them to the matching C1 control characters. Rebuild the full
# 256-entry table so the reverse direction covers every byte the damage could
# have produced.
_ANSI = {}
for _b in range(256):
    try:
        _ANSI[bytes([_b]).decode("cp1252")] = _b
    except UnicodeDecodeError:
        _ANSI[chr(_b)] = _b

try:
    fixed = bytes(_ANSI[c] for c in text)
except KeyError as exc:
    sys.exit(f"character {exc} is not in Windows-1252, so this is not that damage")

# The repaired bytes must themselves be valid UTF-8, or we have guessed wrong.
try:
    fixed.decode("utf-8")
except UnicodeDecodeError as exc:
    sys.exit(f"repaired bytes are not valid UTF-8, refusing to write: {exc}")


def runs(b):
    out = set()
    for line in b.split(b"\n"):
        cur = bytearray()
        for x in line:
            if x > 127:
                cur.append(x)
            elif cur:
                out.add(bytes(cur)); cur = bytearray()
        if cur:
            out.add(bytes(cur))
    return out


print(f"{path}")
print(f"  BOM present      : {had_bom}")
print(f"  size             : {len(raw)} -> {len(fixed)} bytes")
before, after = runs(body), runs(fixed)
print(f"  non-ascii runs   : {len(before)} -> {len(after)}")
for r in sorted(after)[:12]:
    print(f"      {r.hex(' '):<24} {r.decode('utf-8', 'replace')!r}")

if not apply:
    print("\n  dry run - pass --apply to write")
    sys.exit(0)

open(path + ".bak", "wb").write(raw)
open(path, "wb").write(fixed)
print(f"\n  written (backup at {os.path.basename(path)}.bak)")
