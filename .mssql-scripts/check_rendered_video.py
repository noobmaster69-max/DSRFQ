"""Scan the rendered MP4 for the title-block mask, second by second.

Earlier versions of this check measured via ffmpeg filters and silently returned
nothing, so they "passed" while the logo was on screen. This crops the frame
with Pillow and measures pixel variance directly -- a flat grey mask has almost
none, drawing line work has plenty.

Reports, per second:
  MASKED   the corner is a flat panel
  visible  the corner has detail (correct on the Converted beat, wrong elsewhere)

    python .mssql-scripts/check_rendered_video.py
"""

import os
import re
import subprocess
import sys

import imageio_ffmpeg
from PIL import Image, ImageStat

MP4 = r"C:\Aizera\DSRFQ\.mssql-scripts\dsrfq-demo-part12.mp4"
OUT = r"C:\Aizera\DSRFQ\.mssql-scripts\frames"
# The drawing stage's bottom-right, in the 1680x1050 layout. Deliberately
# inside the title block rather than spanning its edges.
CROP = (1120, 545, 1330, 645)
FLAT = 6.0          # stddev below this is a flat panel

os.makedirs(OUT, exist_ok=True)
ff = imageio_ffmpeg.get_ffmpeg_exe()

if not os.path.exists(MP4):
    print(f"no {MP4}")
    sys.exit(1)

out = subprocess.run([ff, "-i", MP4], capture_output=True, text=True).stderr
m = re.search(r"Duration: (\d+):(\d+):(\d+)", out)
total = int(m.group(2)) * 60 + int(m.group(3)) if m else 0
print(f"video {total}s\n")

print(f"  {'t':>4}  {'detail':>7}   state")
states = {}
for ts in range(40, min(total, 90) + 1):
    png = os.path.join(OUT, f"t{ts:03d}.png")
    subprocess.run([ff, "-y", "-ss", str(ts), "-i", MP4, "-frames:v", "1",
                    "-q:v", "2", png], capture_output=True)
    if not os.path.exists(png):
        continue
    crop = Image.open(png).convert("L").crop(CROP)
    sd = ImageStat.Stat(crop).stddev[0]
    state = "MASKED" if sd < FLAT else "visible"
    states[ts] = state
    print(f"  {ts:>4}  {sd:>7.2f}   {state}")

print()
runs = []
for ts in sorted(states):
    if runs and runs[-1][2] == states[ts] and ts == runs[-1][1] + 1:
        runs[-1][1] = ts
    else:
        runs.append([ts, ts, states[ts]])
print("runs:")
for a, b, s in runs:
    print(f"  t={a:>3}-{b:<3}s  {s}")
