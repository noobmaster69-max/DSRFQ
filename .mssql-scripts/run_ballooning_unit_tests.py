"""Run every ballooning unit test and write a results table.

Unit tests only: pure logic, no browser, no database, no running app. Each file
is run the way its header says (stub loader, or plain node from the repo root).

    python .mssql-scripts/run_ballooning_unit_tests.py

Writes .mssql-scripts/results/ballooning-unit-tests.md and exits non-zero if
anything failed.
"""

import datetime
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# (file, how to run, what it covers)
LOADER = ["node", "--experimental-strip-types", "--no-warnings", "--import", "./ts-stub-loader.mjs"]
TESTS = [
    ("check_ballooning_editing.mjs", "loader", "Undo/redo history, delete + close gaps, renumber across pages, list order, crops"),
    ("check_ballooning_move_number.mjs", "loader", "Change a balloon's number: it moves in the sequence, the rest slide along, children follow"),
    ("check_ballooning_fields.mjs", "loader", "Balloon styles, quantity input, tolerance in text, categories, symbol filter, PDF filter, GD&T grouping, audit walk"),
    ("check_ballooning_tolerance.mjs", "loader", "Default tolerance: ISO 2768, decimal/range/geometric schemes, exclusions, update applied, migration"),
    ("check_ballooning_batch.mjs", "loader", "Batch edit: touched fields only, validation, selection rules"),
    ("check_ballooning_batch_fields.mjs", "loader", "Batch edit of feature, category, export mode, arrow, characteristic"),
    ("check_ballooning_regions.mjs", "loader", "Areas: make/resequence/overlap/contain, renumber order, applyNumbering"),
    ("check_ballooning_persistence.mjs", "loader", "Save/load mapping of all columns, tombstones, deletes, grid rotation/frame rows"),
    ("check_dimension_filter.mjs", "loader", "Reference / English-noise / datum structural filters"),
    ("check_grid_geometry.mjs", "loader", "Grid extent, equal profile, cell lookup, line moves"),
    ("check_sub_separator.mjs", "loader", "Sub-number separator validation and parsing"),
    ("check_ballooning_numbering.mjs", "root", "Balloon number format/parse/compare, instances, grid sort"),
    ("check_ballooning_areasort.mjs", "root", "Area sort modes: rows, columns, reading order, clockwise sweeps"),
    ("check_ballooning_keywordfilter.mjs", "root", "Always-filter keywords: matching, persistence, defaults"),
    ("check_balloon_size_shared.mjs", "root", "Balloon size shared by canvas and PDF export"),
    ("check_datum_classifier.py", "python", "Datum feature classifier (TypeScript and consumer agree)"),
]


def run(name, how):
    if how == "loader":
        cmd, cwd = LOADER + [name], HERE
    elif how == "root":
        cmd, cwd = ["node", os.path.join(".mssql-scripts", name)], ROOT
    else:
        cmd, cwd = [sys.executable, os.path.join(".mssql-scripts", name)], ROOT
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    try:
        p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=300, env=env)
        out = p.stdout + p.stderr
        code = p.returncode
    except subprocess.TimeoutExpired:
        out, code = "TIMEOUT", 1
    passed = len(re.findall(r"^\s*PASS\b", out, re.M))
    failed_lines = re.findall(r"^\s*FAIL\s+(.*)$", out, re.M)
    ok = code == 0 and not failed_lines and passed > 0
    return ok, passed, failed_lines, out


def main():
    rows, total_pass, total_fail, bad = [], 0, 0, []
    for name, how, covers in TESTS:
        ok, passed, failed, out = run(name, how)
        total_pass += passed
        total_fail += len(failed) or (0 if ok else 1)
        status = "PASS" if ok else "FAIL"
        print(f"{status:4}  {passed:4} checks  {name}")
        for f in failed[:5]:
            print(f"        FAIL {f}")
        if not ok and not failed:
            print("        " + out.strip().splitlines()[-1][:200] if out.strip() else "        (no output)")
        rows.append((name, covers, passed, len(failed), status))
        if not ok:
            bad.append(name)

    os.makedirs(os.path.join(HERE, "results"), exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = [f"# Ballooning unit tests - {stamp}", "",
             f"**{len(TESTS) - len(bad)}/{len(TESTS)} files pass, {total_pass} checks passed, {total_fail} failed.**", "",
             "| Test file | Covers | Checks passed | Failed | Result |", "|---|---|---:|---:|---|"]
    lines += [f"| `{n}` | {c} | {p} | {f} | {s} |" for n, c, p, f, s in rows]
    path = os.path.join(HERE, "results", "ballooning-unit-tests.md")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print(f"\n{len(TESTS) - len(bad)}/{len(TESTS)} files pass - {total_pass} checks passed, {total_fail} failed")
    print(f"results: {path}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
