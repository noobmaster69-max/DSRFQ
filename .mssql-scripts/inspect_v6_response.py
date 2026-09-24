r"""What shape does the 5999 engine actually return?

One Supply saves every API response to ~/.yilian_app/api_responses. Reading a
real one beats reasoning about the schema: the client rejects the payload for
"missing OCR fields", and the question is precisely which fields are where.

    python .mssql-scripts/inspect_v6_response.py
"""

import glob
import json
import os

folder = os.path.join(os.path.expanduser("~"), ".yilian_app", "api_responses")
files = sorted(glob.glob(os.path.join(folder, "*.json")), key=os.path.getmtime)
if not files:
    raise SystemExit(f"no saved responses in {folder}")

path = files[-1]
print(f"{os.path.basename(path)}  {os.path.getsize(path) / 1024:,.0f} KB\n")
with open(path, encoding="utf-8") as fh:
    d = json.load(fh)


def describe(value):
    if isinstance(value, list):
        return f"list[{len(value)}]"
    if isinstance(value, dict):
        return f"dict{{{len(value)}}}"
    return type(value).__name__


print("root keys:")
for k, v in d.items():
    print(f"   {k:<14} {describe(v)}")

views = d.get("views") or []
print(f"\nviews: {len(views)}")
if views:
    print("   view keys:", list(views[0].keys()))
    ocr = views[0].get("ocr_results") or {}
    print("   ocr_results:")
    for k, v in ocr.items():
        print(f"      {k:<14} {describe(v)}")
    # The client wants rec_text/rec_texts + rec_scores at the ROOT. Show a
    # sample so the adapter maps the right thing to the right name.
    for k in ("rec_text", "rec_texts", "rec_polys", "rec_scores", "belong"):
        if k in ocr and ocr[k]:
            print(f"   sample {k}: {json.dumps(ocr[k][0], ensure_ascii=False)[:90]}")

print("\ntotals across every view:")
for k in ("rec_text", "rec_texts", "rec_polys", "rec_scores", "belong"):
    total = sum(len((v.get("ocr_results") or {}).get(k) or []) for v in views)
    if total:
        print(f"   {k:<14} {total}")

print("\nwhat the client checks for at root:")
for k in ("status", "data", "rec_text", "rec_texts", "rec_scores"):
    print(f"   {k:<14} {'present' if k in d else 'ABSENT'}")
