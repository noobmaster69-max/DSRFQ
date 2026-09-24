# Ballooning unit tests - 2026-09-21 10:59

**16/16 files pass, 540 checks passed, 0 failed.**

| Test file | Covers | Checks passed | Failed | Result |
|---|---|---:|---:|---|
| `check_ballooning_editing.mjs` | Undo/redo history, delete + close gaps, renumber across pages, list order, crops | 26 | 0 | PASS |
| `check_ballooning_move_number.mjs` | Change a balloon's number: it moves in the sequence, the rest slide along, children follow | 29 | 0 | PASS |
| `check_ballooning_fields.mjs` | Balloon styles, quantity input, tolerance in text, categories, symbol filter, PDF filter, GD&T grouping, audit walk | 46 | 0 | PASS |
| `check_ballooning_tolerance.mjs` | Default tolerance: ISO 2768, decimal/range/geometric schemes, exclusions, update applied, migration | 88 | 0 | PASS |
| `check_ballooning_batch.mjs` | Batch edit: touched fields only, validation, selection rules | 21 | 0 | PASS |
| `check_ballooning_batch_fields.mjs` | Batch edit of feature, category, export mode, arrow, characteristic | 15 | 0 | PASS |
| `check_ballooning_regions.mjs` | Areas: make/resequence/overlap/contain, renumber order, applyNumbering | 14 | 0 | PASS |
| `check_ballooning_persistence.mjs` | Save/load mapping of all columns, tombstones, deletes, grid rotation/frame rows | 42 | 0 | PASS |
| `check_dimension_filter.mjs` | Reference / English-noise / datum structural filters | 39 | 0 | PASS |
| `check_grid_geometry.mjs` | Grid extent, equal profile, cell lookup, line moves | 34 | 0 | PASS |
| `check_sub_separator.mjs` | Sub-number separator validation and parsing | 43 | 0 | PASS |
| `check_ballooning_numbering.mjs` | Balloon number format/parse/compare, instances, grid sort | 40 | 0 | PASS |
| `check_ballooning_areasort.mjs` | Area sort modes: rows, columns, reading order, clockwise sweeps | 33 | 0 | PASS |
| `check_ballooning_keywordfilter.mjs` | Always-filter keywords: matching, persistence, defaults | 36 | 0 | PASS |
| `check_balloon_size_shared.mjs` | Balloon size shared by canvas and PDF export | 14 | 0 | PASS |
| `check_datum_classifier.py` | Datum feature classifier (TypeScript and consumer agree) | 20 | 0 | PASS |
