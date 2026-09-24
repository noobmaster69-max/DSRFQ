"""Point each costing part at a seeded material, by name.

CostingParts.MaterialID is normally set by the global-ocr stage's zero-shot
classifier, which is switched off, so it is null on every part and the costing
skips the Material Cost line entirely. This does the same job with a plain name
match, which is enough for the seeded example data.

Reports what it could not match rather than guessing, since pricing a part
against the wrong alloy is worse than pricing it against none.
"""
import io
import json
import re
import sys

import pyodbc

APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"
raw = json.load(io.open(APPSETTINGS, encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")), timeout=90)
cur = conn.cursor()

materials = cur.execute(
    "SELECT ID, Code, Name FROM dbo.Materials WHERE IsActive = 1").fetchall()
conn.commit()


def normalise(s):
    """Strip everything that varies between how a drawing and a catalogue spell
    the same alloy: case, spaces, hyphens and the ASTM/AMS spec suffix."""
    s = (s or "").upper()
    s = re.split(r",|\bASTM\b|\bAMS\b|\bQQ\b", s)[0]
    return re.sub(r"[^A-Z0-9]", "", s)


index = {}
for m in materials:
    index.setdefault(normalise(m[2]), m)
    index.setdefault(normalise(m[1]), m)


def match(text):
    key = normalise(text)
    if not key:
        return None
    if key in index:
        return index[key]
    # A drawing writes "ALUMINUM 6061-T651" where the catalogue has
    # "AL 6061-T651"; compare on the alloy designation alone.
    digits = re.search(r"\d{3,4}[A-Z]?\d*(T\d+|H\d+)?", key)
    if digits:
        for k, m in index.items():
            if digits.group(0) and digits.group(0) in k:
                return m
    return None


print("%-5s %-24s %s" % ("part", "material on the part", "matched to"))
unmatched = []
for r in cur.execute("""
        SELECT ID, PartNumber, Material, MaterialID, GrossWeight
        FROM dbo.CostingParts WHERE IsActive = 1 ORDER BY ID""").fetchall():
    conn.commit()
    hit = match(r[2])
    if hit is None:
        unmatched.append((r[0], r[2]))
        print("  %-3s %-24s -- no match" % (r[0], (r[2] or "(none)")[:24]))
        continue
    cur.execute("UPDATE dbo.CostingParts SET MaterialID = ? WHERE ID = ?", hit[0], r[0])
    conn.commit()
    print("  %-3s %-24s -> %s (ID %s), gross %s"
          % (r[0], (r[2] or "")[:24], hit[2], hit[0], r[4]))

if unmatched:
    print("\nnot linked (left alone rather than guessed):")
    for pid, text in unmatched:
        print("  part %s: material reads %r" % (pid, text))

conn.close()
