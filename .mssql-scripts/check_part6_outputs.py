"""What part 6 actually produced: converted page images, and whether the MBD
attribute extraction finds material/UOM in its PDF.

Split out from the status check because "Completed" only means no stage
raised -- it says nothing about whether the fields the costing needs got
filled in. Converted pages live in CostingPartDocumentImages, not in
CostingPartDocuments.
"""
import io
import json
import os
import re
import sys

import pyodbc

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 6
APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"
raw = json.load(io.open(APPSETTINGS, encoding="utf-8-sig"))["Data"]["Default"]["ConnectionString"]
g = lambda p: re.search(p, raw, re.I).group(1)
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;"
    "TrustServerCertificate=yes" % (
        g(r"Server=([^;]*)"), g(r"(?:Initial Catalog|Database)=([^;]*)"),
        g(r"(?:User ID|Uid)=([^;]*)"), g(r"(?:Password|Pwd)=([^;]*)")), timeout=90)
cur = conn.cursor()

print("documents for part %d:" % PART)
docs = cur.execute("""SELECT ID, Type, FileName, FileDirectory, ConvertedFileDirectory
                      FROM dbo.CostingPartDocuments
                      WHERE CostingPartID = ? AND IsActive = 1 ORDER BY ID""", PART).fetchall()
for d in docs:
    print("  id=%-4s type=%-3s %s" % (d[0], d[1], d[2]))
    print("        dir       : %s" % d[3])
    print("        converted : %s" % (d[4] or "(none)"))

ids = tuple(d[0] for d in docs) or (0,)
imgs = cur.execute("""SELECT CostingPartDocumentID, Page, Original, FileName, FileDirectory
                      FROM dbo.CostingPartDocumentImages
                      WHERE CostingPartDocumentID IN (%s) AND IsActive = 1
                      ORDER BY CostingPartDocumentID, Original, Page"""
                   % ",".join("?" * len(ids)), *ids).fetchall()
print("\nconverted page images: %d" % len(imgs))
for i in imgs[:20]:
    print("  doc=%-4s page=%-3s original=%-3s %s" % (i[0], i[1], i[2], i[3]))

# Locate the source PDF. FileDirectory is stored as an absolute path in some
# rows and relative to UploadRoot in others, so try both.
UPLOAD_ROOT = "C:/Aizera/DSRFQ/DSRFQ.Web/App_Data/upload"


def resolve(rec):
    if rec is None:
        return None
    d = (rec[3] or "").replace("/", os.sep)
    for cand in (d,
                 os.path.join(d, rec[2] or ""),
                 os.path.join(UPLOAD_ROOT.replace("/", os.sep), d.lstrip("\\")),
                 os.path.join(UPLOAD_ROOT.replace("/", os.sep), d.lstrip("\\"), rec[2] or "")):
        if cand and os.path.isfile(cand):
            return cand
    return None


pdf = next((d for d in docs if (d[2] or "").lower().endswith(".pdf")), None)
pdf_path = resolve(pdf)
print("\npdf on disk: %s" % (pdf_path or "NOT FOUND"))

if pdf_path:
    from function import extract_mbd_attributes
    with open(pdf_path, "rb") as f:
        data = f.read()
    attrs = extract_mbd_attributes(data)
    print("MBD attributes found: %d" % len(attrs or {}))
    for k, v in sorted((attrs or {}).items()):
        print("   %-28s %s" % (k, v))

conn.close()
