# Ballooning — Function Checklist

DSRFQ (OneZera) costing workspace → **Balloon** mode. Each row is one function, what it must do, how it is checked, and the latest result.

**Result key**
- **Unit** — passed a Node unit test (pure logic, no browser)
- **UI** — passed a Playwright browser test on part 12
- **Server** — passed a live endpoint test
- **Manual** — not automated yet; check by hand using the "How to verify" column

**Latest run:** 15 Sep 2026, against the live app on :5001 with the engine on :5999.

| Suite | Kind | Result |
|---|---|---|
| `run_ballooning_unit_tests.py` (15 files) | Unit | 503 checks, all pass |
| `check_recognize_region.py` | Server | 11 checks, all pass |
| `check_balloon_onesupply_ui.py` | UI | 51 checks, all pass |
| `check_balloon_editing_ui.py` | UI | 28 checks, all pass |
| `check_balloon_list_ui.py` | UI | 16 checks, all pass |
| `check_default_tolerance_ui.py` | UI | 44 checks, all pass |

All scripts are in `.mssql-scripts/`. Run the unit tests with `python .mssql-scripts/run_ballooning_unit_tests.py`; results are written to `.mssql-scripts/results/ballooning-unit-tests.md`.

---

## 1. Save, load, undo

| ID | Function | Expected behaviour | How to verify | Test | Result |
|---|---|---|---|---|---|
| B-01 | Load balloons | Opening Balloon mode shows the part's balloons, masks, areas, grid lines, page rotation and frame. | Open a part and switch to Balloon mode. | persistence, onesupply_ui | Unit, UI |
| B-02 | Save | Existing rows are updated, new ones created, and rows that disappeared are deleted. Deleted balloons are kept as tombstones so recognition does not bring them back. | Edit, Save, reload. | persistence | Unit |
| B-03 | New columns persist | Audit, colour, shape, line width, style, arrow, size, hidden box, feature, category, export mode and crop rotation all survive save → load. | Set each, Save, reload. | persistence | Unit |
| B-04 | Defaults stored as null | An unstyled balloon, or one in the Normal category / Text export mode, saves null so it follows the shop default. | — | persistence | Unit |
| B-05 | Undo / Redo | Ctrl+Z / Ctrl+Y (and the toolbar buttons) step through every edit, up to 50. A whole drag is one step. Loading resets the history. | Renumber, Ctrl+Z, Ctrl+Y. | editing, editing_ui | Unit, UI |
| B-06 | Undo a drag | Moving or resizing a box, or dragging a balloon, undoes in one step. | Drag a balloon, Ctrl+Z. | — | Manual |
| B-07 | Shortcuts ignore typing | Ctrl+Z, Delete and the tool keys do nothing while a text field has focus, or while 2D/3D mode is showing. | Type in a field and press Delete. | — | Manual |
| B-08 | Leaving with unsaved edits | Closing or reloading the tab warns. | Edit, then press F5. | editing_ui (synthetic event) | UI |
| B-09 | Switching document with unsaved edits | A confirm appears; Cancel stays on the current document. | Edit, then click another document. | editing_ui | UI |

## 2. Balloon list

| ID | Function | Expected behaviour | How to verify | Test | Result |
|---|---|---|---|---|---|
| L-01 | Readable list | 440px rail; number 14px bold, symbol 15px; zebra rows; selected row marked. | Look at the list. | list_ui | UI |
| L-02 | Resize rail | Drag the right edge to resize (remembered); double-click resets. | Drag the edge. | list_ui | UI |
| L-03 | Filter | Matches number, text or tolerance; keeps focus while typing; Esc clears. | Type "40". | list_ui | UI |
| L-04 | All pages | Page picker offers "All pages (N)" and "Page n (count)". All pages adds a Pg column. | Change the picker. | editing_ui | UI |
| L-05 | Row on another page | A plain click goes to that page and selects the balloon. Ctrl/Shift click only changes the selection. | Click a page-2 row. | editing_ui | UI |
| L-06 | Drawing crops | Each row shows its dimension cut from the page. The Images checkbox turns crops off. | Toggle Images. | editing_ui, editing (crop maths) | Unit, UI |
| L-07 | Narrow rail | Tolerances move under the symbol when narrow, return as columns when wide; Qty column appears wider still. | Resize the rail. | list_ui, editing_ui | UI |
| L-08 | Follows selection | Clicking a balloon on the drawing scrolls its row into view. | Click a balloon far down the sheet. | — | Manual |
| L-09 | Zone chip | The zone is shown under the number, coloured: A green, B blue, C yellow, unplaced red. | Look at the No column. | — | Manual |
| L-10 | Audit column | ✓ column: click to toggle; the header shows "x/y audited". | Click a tick. | onesupply_ui (header count) | UI (count); Manual (click) |
| L-11 | Instances | A quantity of 2 or more lists as 44_1, 44_2… under one balloon. | A 4X dimension. | numbering | Unit |

## 3. Selecting, deleting, numbering

| ID | Function | Expected behaviour | How to verify | Test | Result |
|---|---|---|---|---|---|
| N-01 | Click / Ctrl / Shift select | Standard list behaviour on the table and the drawing. A plain click on a balloon inside a multi-selection narrows to that balloon. | — | batch, onesupply_ui | Unit, UI |
| N-02 | Rubber-band select | Dragging on empty drawing selects every balloon the box touches; Ctrl/Shift adds to the selection. A click without a drag clears it. | Drag from a corner of the sheet. | onesupply_ui | UI |
| N-03 | Delete key | Deletes every selected balloon and mask. | Select 2, press Delete. | editing_ui | UI |
| N-04 | Delete closes the gap | Deleting 3 of 1..6 gives 1..5. A deleted parent's first child takes its number; siblings close up. Pages numbered separately only close up within their own page. | — | editing | Unit, UI |
| N-05 | Renumber all pages | Numbers run continuously across pages, each page carrying on from the last; no duplicates. | Click Renumber. | editing, editing_ui | Unit, UI |
| N-06 | Areas | Areas are walked in area order, each by its own sort rule; leftovers follow in reading order. Areas may not overlap. | Draw 2 areas, Renumber. | regions, areasort | Unit |
| N-07 | Number categories | With categories set, Renumber numbers the categories in the order from the "Number category order" dialog. A child follows its parent's category. | Set a balloon to BOM, Renumber. | editing (groups) | Unit |
| N-08 | GD&T group sorting | When on, a feature control frame touching a dimension is numbered straight after it. | Settings → GD&T group sorting, Renumber. | fields | Unit |
| N-09 | Set as sub-number | Right-click → "Set as sub-number…", then click the parent. The balloon becomes parent-n, its own children come with it, and its old number closes up. Must be on the same page; a reference dimension cannot be the parent; Esc cancels. | Right-click → pick. | onesupply_ui | UI |
| N-10 | Restore normal number | Right-click a child → it gets the next free number; its siblings close up. | — | — | Manual |
| N-11 | Sub-number separator | 1–3 characters, not a digit, space or "_". | Settings → separator. | sub_separator, numbering | Unit |

## 4. Canvas

| ID | Function | Expected behaviour | How to verify | Test | Result |
|---|---|---|---|---|---|
| C-01 | Add balloon | Drawing a box adds the next number, filed in its grid zone, with the default inspection tool. | Add Balloon, drag. | — | Manual |
| C-02 | Move / resize | Boxes, and selected masks and areas, move and resize with their corner handles. | Select a mask, drag it. | — | Manual |
| C-03 | Zoom at cursor | Mouse wheel zooms ×1.1 about the pointer. | Scroll over a corner. | — | Manual |
| C-04 | Pan | Middle or right-button drag pans. A right drag does not open the menu. | Right-drag. | — | Manual |
| C-05 | Rotate page | ↻ or R turns the page 90° (remembered per page); "90° ×" resets. Mouse positions stay correct when rotated. | Rotate, then add a balloon. | onesupply_ui, persistence | UI (rotate/reset), Manual (drawing while rotated) |
| C-06 | Go to page | Page box jumps; ← → and PageUp/PageDown turn pages. | Type 2. | onesupply_ui | UI |
| C-07 | Hide boxes | "Hide boxes" hides every recognition box (view only). A selected hidden box still shows dashed. | Toggle. | — | Manual |
| C-08 | Fit page | The reset button fits the page, respecting rotation. | — | — | Manual |

## 5. Right-click menu and styles

| ID | Function | Expected behaviour | How to verify | Test | Result |
|---|---|---|---|---|---|
| S-01 | Balloon menu | Right-click a balloon or box opens a menu that acts on the whole selection. | Right-click. | onesupply_ui | UI |
| S-02 | Shape | Hollow circle, solid circle (white number), star, triangle. | Menu → shape. | fields, onesupply_ui | Unit, UI |
| S-03 | Colour / style / line width | A colour overrides the style preset; Warning/Error/Success recolour; line width 1–5. Selected balloons draw orange. | Menu. | fields | Unit |
| S-04 | Size preset | S / M / L / XL / Auto set a per-balloon scale. | Menu → L. | — | Manual |
| S-05 | Arrow | Per balloon (Show / Hide / shop default); arrowhead drawn at the box end. | Panel → Arrow. | fields | Unit |
| S-06 | Bubble settings | "Style…" applies to the selection, or "Save as shop default" (admin); unstyled balloons follow the default. | Style… | fields (round trip), onesupply_ui (opens) | Unit, UI |
| S-07 | Size +/- | With balloons selected, sizes only those; otherwise the whole drawing. | Select 2, press +. | — | Manual |
| S-08 | Size and position scope | Apply size to new balloons only / this page / every page; optionally re-position. | ⚙ by Balloon Size. | onesupply_ui (opens) | UI (opens), Manual (apply) |

## 6. Property panel

| ID | Function | Expected behaviour | How to verify | Test | Result |
|---|---|---|---|---|---|
| P-01 | Crop preview | Shows the dimension; wheel zooms; ↺ ↻ ±15° rotate and are saved. | Select a balloon. | onesupply_ui (present) | UI (present), Manual (rotate) |
| P-02 | Symbol insert | Inserts at the cursor; a GD&T glyph also sets the characteristic. | Insert ⊥. | — | Manual |
| P-03 | Tolerance in text | "Ø.380 ±.005" typed into the text moves the tolerance into the empty tolerance fields. | Type it, Tab. | fields | Unit |
| P-04 | Quantity | Accepts 4, 4x, ×4 or (1-4) and shows (1-4); anything else is refused. | Type 4x. | fields, onesupply_ui | Unit, UI |
| P-05 | Dimension feature | Basic or Reference clears tolerances; None recalculates from the tolerance label. | Set Reference. | batch_fields, tolerance | Unit |
| P-06 | Number category / export mode | Saved per balloon; "order…" opens the category priority dialog. | — | persistence | Unit |
| P-07 | Default inspection tool | "default…" sets the tool that new balloons start with. | — | — | Manual |
| P-08 | Tolerance from | Picking a scheme or ISO class recalculates this balloon; typing a tolerance clears the label; "upper below lower" warns. | — | tolerance, default_tolerance_ui | Unit, UI |
| P-09 | Audit button | Audit (F2) marks it and moves on; when already audited, the button clears it. | Click. | onesupply_ui (F2) | UI |

## 7. Batch panel (2+ selected)

| ID | Function | Expected behaviour | How to verify | Test | Result |
|---|---|---|---|---|---|
| M-01 | Touched fields only | Only fields you change are written; Apply is disabled until something changes. | — | batch | Unit |
| M-02 | New batch fields | Characteristic, dimension feature (Basic/Reference clears tolerances), number category, export mode, arrow. | — | batch_fields, onesupply_ui | Unit, UI |
| M-03 | Tolerance from (batch) | Recalculates each balloon; ones without a matching rule keep their tolerance and are counted in a warning. | — | tolerance (rules) | Unit (rules), Manual (panel) |
| M-04 | Audit N | Marks every selected balloon audited. | — | onesupply_ui (present) | Manual |
| M-05 | Delete N | Confirms, deletes, closes the gap. | — | editing | Unit |

## 8. Audit

| ID | Function | Expected behaviour | How to verify | Test | Result |
|---|---|---|---|---|---|
| A-01 | F2 | Marks the selection audited (with who and when) and selects the next unaudited balloon, wrapping round and across pages; says so when everything is done. | Press F2. | fields (walk), onesupply_ui | Unit, UI |
| A-02 | Audited look | An audited box is tinted green. | — | — | Manual |

## 9. Recognition

| ID | Function | Expected behaviour | How to verify | Test | Result |
|---|---|---|---|---|---|
| R-01 | Area Read (W) | Drag a box: every text read inside it becomes a balloon, in reading order, with zone, symbol filter and default tool applied. One Ctrl+Z removes them. | W, drag round dimensions. | recognize_region, onesupply_ui | Server, UI |
| R-02 | Single Read (Q) | Drag a box: everything read becomes one balloon. An empty read still gives one balloon to type into. | Q, drag. | recognize_region | Server |
| R-03 | Single as screenshot | When on, Single Read adds a balloon with export mode Screenshot and no reading. | Settings → option, Q. | — | Manual |
| R-04 | Endpoint safety | Refuses an unknown mode, an empty box, a path outside the part's images, and another part's image. | — | recognize_region | Server |
| R-05 | Engine down | A clear message: "not answering… start Ballooning Model". | Stop the engine, press W. | — | Manual |
| R-06 | Auto Balloon (all / page) | Queues recognition; replaces automatic balloons; hand-drawn and deleted balloons are kept. | — | earlier suites | Manual |
| R-07 | Skip pages already done | With the setting on, Auto Balloon (all) clears nothing and only runs pages that have no balloons. Needs the restarted RFQ consumer. | Settings → option, Auto Balloon. | consumer file parses | Manual |
| R-08 | Datum detection | Datum features are classified; the ▲ generation switch is admin-only. | — | datum_classifier, dimension_filter | Unit |

## 10. Filters and grid

| ID | Function | Expected behaviour | How to verify | Test | Result |
|---|---|---|---|---|---|
| F-01 | Always-filter keywords | Case- and space-insensitive phrase match; notes exempt; save & remove matches. | Settings → keywords. | keywordfilter | Unit |
| F-02 | Structural filters | Reference, English noise (salvages "R11.5 ALL AROUND"), datum. | — | dimension_filter | Unit |
| F-03 | Dimension symbol filter | Strips listed symbols; letters only where they touch a number; "Save & clean existing" is undoable. | Settings → symbol filter. | fields | Unit (logic), Manual (dialog) |
| G-01 | Grid overlay / adjust | G toggles the grid; Adjust drags lines; Apply saves and re-files balloons. | — | grid_geometry, earlier grid UI | Unit |
| G-02 | Edit grid | Set start/end cells (with preview), keep / select / reset the frame, re-file, all pages. | Edit grid… | onesupply_ui (opens), persistence (frame row) | UI (opens), Unit, Manual (apply) |
| G-03 | Select drawing border | After "Select the drawing border", drag the frame; equal grid inside it; saved per page. | Edit grid → select. | persistence | Unit (storage), Manual (flow) |
| G-04 | Grid per page | Changing page never carries the previous page's adjusted lines over. | Adjust p1, go to p2. | — | Manual |

## 11. Default tolerance

| ID | Function | Expected behaviour | How to verify | Test | Result |
|---|---|---|---|---|---|
| T-01 | Tabs and schemes | Custom / ISO 2768-1 / ISO 2768-2; new/rename/save/delete schemes (admin); reopens on the last tab. | Default Tol. | tolerance, default_tolerance_ui | Unit, UI |
| T-02 | Tables | Decimal, range and geometric tables; add/remove rows; bad cells block Apply. | — | default_tolerance_ui | UI |
| T-03 | Exclusions | GD&T, notes, basic, reference, fastener — marked features beat text cues. | — | tolerance, fields | Unit |
| T-04 | Apply / Update applied | Apply fills blanks only; Update applied recalculates labelled balloons, including legacy ".XXX" labels. | — | tolerance, default_tolerance_ui | Unit, UI |

## 12. Export

| ID | Function | Expected behaviour | How to verify | Test | Result |
|---|---|---|---|---|---|
| E-01 | Export PDF | Balloons are drawn with their own colour, line width, shape (star/triangle on unrotated pages) and arrowheads. | Style some balloons, Export PDF. | — | Manual |
| E-02 | PDF export filter | When on, asks: hide reference / basic balloons (the file renumbers without gaps, the drawing does not), print "(1-N)". | Settings → PDF export filter. | fields (filterForExport) | Unit (logic), Manual (file) |
| E-03 | Export Excel | One line per characteristic; sorts correctly with any sub-number separator. | Export Excel. | earlier excel suite | Manual |
| E-04 | Balloon size shared | The canvas and the PDF use the same size calculation. | — | balloon_size_shared | Unit |

---

## Found while testing

| # | Finding | Status |
|---|---|---|
| 1 | Clicking one balloon inside a multi-selection kept the whole selection, so the click did nothing. | **Fixed:** a click without a drag now narrows the selection. |
| 2 | Four older unit tests could no longer start: they bundled the Serenity library, which needs a browser, after settings moved to the database. | **Fixed:** they now use the settings-store stub. |
| 3 | `BallooningDatabaseService.ts` imported types as values, which Node refuses. | **Fixed:** type-only imports. |
| 4 | Single Read on a widened box around "40°" returned "▲B" — it read the nearby datum rather than the dimension. | **Open:** engine reading quality; draw the box tighter. |
| 5 | Area Read on a long note paragraph returns garbled text. | **Open:** use Single Read for notes. |
| 6 | Several UI tests read columns by position and broke when the page, drawing and audit columns were added. | **Fixed:** the tests now use column classes. |

## Not covered by automation

Visual PDF output, Excel file content, the consumer run of "skip pages already done", rotated-page drawing, zoom/pan feel, and the dialogs' apply paths (bubble shop default, size scope, category order, symbol filter clean, edit grid apply, default tool). These are marked **Manual** above.
