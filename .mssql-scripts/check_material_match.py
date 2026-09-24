"""Checks how the material matcher scores the text the OCR actually produced.

The threshold is the whole design decision here: too low and "SEE BOM" gets
priced as some aluminium alloy, too high and a legitimate
"ALUMINUM 6061-T651, ASTM B209" is rejected and the quote silently loses its
material line. This prints the real scores so the number is chosen from
evidence rather than taste.

Needs the sentence-transformers environment the consumer runs in:

    python .mssql-scripts/check_material_match.py
"""

from sentence_transformers import SentenceTransformer, util

MIN_SCORE = 0.45

# dbo.Materials, company 1.
MASTER = [
    "AL 6061-T6", "ALUMINUM 6061-T651", "AL 5052-H32", "AL 7075-T651",
    "SS 304", "SS 316L", "Ti 6Al-4V", "C11000 Copper", "Brass C36000",
    "Nickel 200", "PEEK", "POM (Delrin)",
]

# Every distinct CostingParts.Material value in the database, plus a couple of
# obvious should-match cases.
SAMPLES = [
    ("SEE BOM", "reject"),
    ("4.", "reject"),
    ("AL, ALLY 6061-T6 PER LAM SPECIFICATION 202-000800-007", "match AL 6061-T6"),
    ("ALUMINUM 6061-T651, ASTM B209", "match ALUMINUM 6061-T651"),
    ("AL 6061-T6", "match AL 6061-T6"),
    ("STAINLESS STEEL 316L", "match SS 316L"),
    ("TITANIUM 6AL-4V", "match Ti 6Al-4V"),
]

model = SentenceTransformer("all-MiniLM-L6-v2")
master_emb = model.encode(MASTER, convert_to_tensor=True)

print(f"threshold = {MIN_SCORE}\n")
print(f"{'drawing text':<56} {'best match':<22} {'score':>6}  {'verdict':<10} expected")
print("-" * 118)
for text, expected in SAMPLES:
    scores = util.cos_sim(model.encode(text, convert_to_tensor=True), master_emb)[0]
    best = int(scores.argmax())
    score = float(scores[best])
    verdict = "MATCH" if score >= MIN_SCORE else "reject"
    name = MASTER[best] if score >= MIN_SCORE else "-"
    print(f"{text[:55]:<56} {name:<22} {score:>6.3f}  {verdict:<10} {expected}")
