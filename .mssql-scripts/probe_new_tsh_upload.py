"""Reproduce the costing file upload against new_tsh directly.

The RFQ consumer reported 500 from /file_upload_local_tsh for both the 3D and
2D files. Posting straight to the service removes the consumer and DSRFQ file
retrieval from the picture, so the service's own error is visible.
"""
import os
import sys

import requests

URL = "http://localhost:8888/file_upload_local_tsh"
UPLOAD = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\5"

CASES = [
    ("3d", os.path.join(UPLOAD, "0023-62709_01_Green_Standard.stp")),
    ("2d", os.path.join(UPLOAD, "0023-62709_01_Green_Standard.pdf")),
]

for file_type, path in CASES:
    print("=" * 74)
    print("%s  %s" % (file_type.upper(), path))
    if not os.path.exists(path):
        print("  file not found\n")
        continue
    print("  size: %.1f KB" % (os.path.getsize(path) / 1024))

    with open(path, "rb") as f:
        try:
            r = requests.post(URL,
                              files={"file": (os.path.basename(path), f)},
                              data={"file_type": file_type},
                              timeout=600)
        except Exception as exc:
            print("  request failed: %r\n" % exc)
            continue

    print("  HTTP %s" % r.status_code)
    body = r.text
    print("  body: %s" % (body[:900] if body.strip() else "(empty)"))
    print()
