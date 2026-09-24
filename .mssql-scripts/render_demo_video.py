"""Render the recorded walkthrough into a shareable MP4.

Playwright writes VP8 .webm, which plays in a browser but not in PowerPoint,
Keynote or most Windows players. This transcodes to H.264/yuv420p MP4 -- the
combination those all accept -- using the ffmpeg bundled with imageio-ffmpeg,
so nothing has to be installed system-wide.

    python .mssql-scripts/render_demo_video.py
"""

import os
import subprocess
import sys

import imageio_ffmpeg

SRC = r"C:\Aizera\DSRFQ\.mssql-scripts\dsrfq-demo-part12.webm"
MP4 = r"C:\Aizera\DSRFQ\.mssql-scripts\dsrfq-demo-part12.mp4"

if not os.path.exists(SRC):
    print(f"no source video at {SRC}")
    sys.exit(1)

ff = imageio_ffmpeg.get_ffmpeg_exe()
print(f"ffmpeg: {ff}")
print(f"source: {os.path.getsize(SRC) / 1024 / 1024:.1f} MB")


def probe(path):
    """Duration and stream summary, straight off ffmpeg's stderr."""
    out = subprocess.run([ff, "-i", path], capture_output=True, text=True).stderr
    dur = next((l.strip() for l in out.splitlines() if "Duration:" in l), "")
    vid = next((l.strip() for l in out.splitlines() if "Stream #" in l), "")
    return dur, vid


dur, vid = probe(SRC)
print(f"  {dur}")
print(f"  {vid}")

cmd = [
    ff, "-y", "-i", SRC,
    # yuv420p and the even-dimension scale are what make it play in
    # PowerPoint and QuickTime; without them H.264 can come out 4:2:0-incompatible.
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "20",              # visually lossless enough for screen text
    "-pix_fmt", "yuv420p",
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-movflags", "+faststart",  # so it starts playing before it is fully loaded
    "-an",                      # the capture has no audio
    MP4,
]
print("\nencoding...")
r = subprocess.run(cmd, capture_output=True, text=True)
if r.returncode != 0:
    print(r.stderr[-1500:])
    sys.exit(1)

dur2, vid2 = probe(MP4)
print(f"\nwrote {MP4}")
print(f"  {os.path.getsize(MP4) / 1024 / 1024:.1f} MB")
print(f"  {dur2}")
print(f"  {vid2}")
