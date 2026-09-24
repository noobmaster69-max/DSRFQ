"""Add narration and burned-in subtitles to the part-12 walkthrough.

Timings come from demo-timeline.json, which the recorder writes from real
wall-clock offsets, so the words land on the beat they describe rather than
being eyeballed against sampled frames.

Voice is Windows SAPI (already on the machine, no install). Each line is
synthesised to its own WAV, delayed to its cue, and mixed onto one track;
subtitles are burned in with libass so the file needs no sidecar.

    python .mssql-scripts/narrate_demo_video.py
"""

import json
import os
import re
import subprocess
import sys
import wave

import imageio_ffmpeg

HERE = r"C:\Aizera\DSRFQ\.mssql-scripts"
SRC = os.path.join(HERE, "dsrfq-demo-part12.mp4")
TIMELINE = os.path.join(HERE, "demo-timeline.json")
VOICE_DIR = os.path.join(HERE, "voice")
SRT = os.path.join(HERE, "dsrfq-demo-part12.srt")
ASS = os.path.join(HERE, "dsrfq-demo-part12.ass")
OUT = os.path.join(HERE, "dsrfq-demo-part12-narrated.mp4")
W, H = 1680, 1050

VOICE = "Microsoft Zira Desktop"     # the clearer of the two en-US voices
RATE = -1                            # SAPI -10..10; a touch under default

# One line per beat, keyed by the beat name the recorder logs. Lengths are
# written to fit each beat's real duration at roughly 2.5 words a second.
# Trimmed to fit. The first pass overran five beats -- worst by 2.4 seconds --
# and the closing line ran past the end of the video, so -shortest cut it off
# mid-sentence. Slack is printed below; keep every line at or under its beat.
LINES = {
    "__intro__":                "D S R F Q — automated quoting for machined parts.",
    "1. Drawing Library":       "A customer sends a drawing and a 3D model. Traditionally an "
                                "estimator reads it and prices it by hand — hours per part.",
    "2. Open the workspace":    "Here the work is already done: conversion, title block reading, "
                                "costing and ballooning.",
    "3. Turn the 3D model":     "The geometry is measured straight from the STEP file.",
    "4. Costing lines":         "Then priced: setup, roughing, finishing. Twelve fifty.",
    "4b. Parts list":           "It reads the parts list off the drawing — nine items, with part "
                                "numbers.",
    "4c. Special processes":    "And the special processes: cleaning and silver plating, each "
                                "with its specification.",
    "5. Original sheet, title block masked":
                                "This is the customer's original sheet. Their title block is "
                                "covered here, because replacing it is what the next step does.",
    "5b. Converted sheet":      "The converted drawing. Same geometry, our title block, notes "
                                "rewritten to our specifications.",
    "6. Balloons":              "It also balloons the drawing for inspection. A hundred and "
                                "seventy-two balloons across five pages, each tied to a dimension "
                                "and its tolerance — the mark-up a quality team would otherwise "
                                "do by hand.",
    "7. File Library search":   "Every file stays searchable by what is inside it — part number, "
                                "material, customer, all read from the drawing itself.",
    "8. Dashboard":             "And across the system: how long each stage takes, and what "
                                "failed. Two files in, a costed quote out.",
}

ff = imageio_ffmpeg.get_ffmpeg_exe()
os.makedirs(VOICE_DIR, exist_ok=True)

if not os.path.exists(SRC) or not os.path.exists(TIMELINE):
    print("need dsrfq-demo-part12.mp4 and demo-timeline.json; run the recorder first")
    sys.exit(1)

with open(TIMELINE, encoding="utf-8") as fh:
    beats = json.load(fh)

# The intro plays over the login screen, before the first beat.
cues = [{"name": "__intro__", "start": 0.6}]
for b in beats:
    if b["name"] in LINES:
        cues.append({"name": b["name"], "start": b["start"] + 0.4})


def synth(text, path):
    """Windows SAPI to WAV, via PowerShell -- no third-party TTS needed."""
    ps = (
        "Add-Type -AssemblyName System.Speech; "
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        f"$s.SelectVoice('{VOICE}'); $s.Rate = {RATE}; "
        f"$s.SetOutputToWaveFile('{path}'); "
        f"$s.Speak(@'\n{text}\n'@); $s.Dispose()"
    )
    r = subprocess.run(["powershell", "-NoProfile", "-Command", ps],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[:300])
    return os.path.exists(path)


def wav_seconds(path):
    with wave.open(path) as w:
        return w.getnframes() / float(w.getframerate())


print("synthesising narration:")
for i, c in enumerate(cues):
    c["wav"] = os.path.join(VOICE_DIR, f"line{i:02d}.wav")
    if not synth(LINES[c["name"]], c["wav"]):
        print(f"  FAILED {c['name']}")
        sys.exit(1)
    c["dur"] = wav_seconds(c["wav"])
    print(f"  {c['start']:>6.1f}s +{c['dur']:>5.1f}s  {c['name']}")

# Warn where a line runs past the beat it belongs to. Overlap is not fatal --
# the next line simply starts while this one finishes -- but it is worth
# knowing which lines are too long for their slot.
print("\nfit:")
for a, b in zip(cues, cues[1:]):
    slack = b["start"] - (a["start"] + a["dur"])
    flag = "" if slack >= -0.2 else f"  OVERRUNS by {-slack:.1f}s"
    print(f"  {a['name'][:38]:<38} slack {slack:>6.1f}s{flag}")
last = cues[-1]
print(f"  {last['name'][:38]:<38} ends at {last['start'] + last['dur']:.1f}s")


def srt_time(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def wrap(text, width=64):
    """Two short lines read better on screen than one long one."""
    words, lines, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > width:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return "\n".join(lines[:3])


with open(SRT, "w", encoding="utf-8") as fh:
    for i, c in enumerate(cues, 1):
        end = c["start"] + c["dur"] + 0.3
        fh.write(f"{i}\n{srt_time(c['start'])} --> {srt_time(end)}\n"
                 f"{wrap(LINES[c['name']])}\n\n")
print(f"\nsubtitles -> {SRT}  (sidecar, for players that want it)")


def ass_time(t):
    cs = int(round(t * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h:d}:{m:02d}:{s:02d}.{cs:02d}"


# Burn from ASS rather than SRT. Given an SRT, libass lays out against a
# default 288-line canvas, so a FontSize of 17 came out around 62 real pixels
# and the captions covered the tray. Declaring PlayResX/Y as the actual frame
# makes every size below a true pixel value.
with open(ASS, "w", encoding="utf-8") as fh:
    fh.write(
        "[Script Info]\n"
        "ScriptType: v4.00+\n"
        f"PlayResX: {W}\nPlayResY: {H}\n"
        "WrapStyle: 2\nScaledBorderAndShadow: yes\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        # BorderStyle 3 = filled box behind the text, so it stays readable over
        # a white drawing. &H<AA><BB><GG><RR>; AA is inverted alpha.
        "Style: Default,Segoe UI,26,&H00FFFFFF,&H000000FF,&HA0101010,"
        "&H00000000,0,0,0,0,100,100,0,0,3,6,0,2,60,60,34,1\n\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, Effect, Text\n")
    for c in cues:
        end = c["start"] + c["dur"] + 0.3
        text = wrap(LINES[c["name"]], width=78).replace("\n", "\\N")
        # Exactly 8 commas before the text: Layer, Start, End, Style, Name,
        # MarginL, MarginR, Effect. One extra put a stray comma on screen at
        # the head of every caption.
        fh.write(f"Dialogue: 0,{ass_time(c['start'])},{ass_time(end)},"
                 f"Default,,0,0,,{text}\n")
print(f"burn-in style -> {ASS}")

# --- mux: delay each line to its cue, mix, and burn the subtitles ----------
inputs = ["-i", SRC]
for c in cues:
    inputs += ["-i", c["wav"]]

delays = []
for i, c in enumerate(cues, start=1):
    ms = int(c["start"] * 1000)
    delays.append(f"[{i}:a]adelay={ms}|{ms},apad[a{i}]")
mix = "".join(f"[a{i}]" for i in range(1, len(cues) + 1))
# dropout_transition=0 stops amix ducking the mix as lines start and stop.
afilter = ";".join(delays) + \
    f";{mix}amix=inputs={len(cues)}:normalize=0:dropout_transition=0[aout]"

# libass needs the drive colon escaped inside the filter argument. Styling
# lives in the ASS file itself, so no force_style override is needed.
ass_arg = ASS.replace("\\", "/").replace(":", "\\:")
vfilter = f"ass='{ass_arg}'"

cmd = [ff, "-y"] + inputs + [
    "-filter_complex", afilter,
    "-vf", vfilter,
    "-map", "0:v", "-map", "[aout]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "20",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-c:a", "aac", "-b:a", "128k",
    "-shortest", OUT,
]
print("\nencoding narrated cut...")
r = subprocess.run(cmd, capture_output=True, text=True)
if r.returncode != 0:
    print(r.stderr[-2000:])
    sys.exit(1)

info = subprocess.run([ff, "-i", OUT], capture_output=True, text=True).stderr
print(f"\nwrote {OUT}  ({os.path.getsize(OUT) / 1024 / 1024:.1f} MB)")
for line in info.splitlines():
    if "Duration:" in line or "Stream #" in line:
        print("  " + line.strip())
