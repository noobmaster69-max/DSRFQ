"""Is the consumer stuck on retrieveToken()? Exercise it directly."""
import os
import sys
import time

sys.path.insert(0, r"C:\Aizera\RPA\RFQ")
os.chdir(r"C:\Aizera\RPA\RFQ")

import function  # noqa: E402

print("DSRFQ url:", function.URL)

t0 = time.perf_counter()
try:
    resp = function.retrieveToken()
    took = time.perf_counter() - t0
    status = resp.get("StatusCode")
    print("retrieveToken -> StatusCode=%s in %.1fs" % (status, took))
    if status == 200:
        print("  CsrfToken present:", bool(resp.get("CsrfToken")))
        print("  cookie name      :", resp.get("AntiforgeryCookieName"))
except Exception as exc:
    print("retrieveToken raised after %.1fs: %r" % (time.perf_counter() - t0, exc))

# The converted PDF the thread was about to upload.
path = r"ConvertedDrawing/5/0023-62709_01_Green_Standard.pdf"
print("\nconverted pdf exists:", os.path.exists(path),
      (os.path.getsize(path) if os.path.exists(path) else ""))
