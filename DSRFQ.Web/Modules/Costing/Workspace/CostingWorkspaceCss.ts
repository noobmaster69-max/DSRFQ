/**
 * Layout for the costing workspace.
 *
 * Everything is scoped under `.cw-`. Sizing is fluid rather than the fixed
 * 1200x850 the result dialog used, because a drawing wants every pixel the
 * screen has.
 */
export function CostingWorkspaceCss(): string {
    return `<style>
    /* ── Theme tokens ─────────────────────────────────────────────────────
       This app selects a theme with a class on <html> — theme-azure-light,
       theme-glassy-light or theme-cosmos-dark — NOT with data-bs-theme. Only
       three Bootstrap variables are actually redefined by all three:
       --bs-body-color, --bs-body-bg and --bs-border-color.

       In particular --bs-tertiary-bg and --bs-secondary-bg are NOT redefined by
       theme-cosmos-dark, so using them for a surface paints a light grey panel
       behind that theme's light text. Everything below therefore derives from
       the body colour: mixing ink into the background gives a surface that goes
       darker on light themes and lighter on dark ones by itself, with no
       per-theme block to keep in sync. */
    .cw-root {
      --cw-line:      var(--bs-border-color, #d5dce0);
      --cw-line-soft: color-mix(in srgb, var(--bs-border-color, #d5dce0) 55%, transparent);
      --cw-ink:       var(--bs-body-color, #212529);
      --cw-accent:    var(--bs-link-color, #0f41c9);
      --cw-surface:   var(--bs-body-bg, #ffffff);
      --cw-muted:     color-mix(in srgb, var(--cw-ink) 65%, transparent);
      --cw-surface-2: color-mix(in srgb, var(--cw-ink) 6%,  var(--cw-surface));
      --cw-hover:     color-mix(in srgb, var(--cw-ink) 10%, var(--cw-surface));
      color: var(--cw-ink);
    }

    .cw-root {
      display: flex;
      flex-direction: column;
      height: calc(100vh - var(--cw-chrome, 72px));
      min-height: 680px;
      gap: 10px;
    }

    /* ── Header ───────────────────────────────────────────────────────── */
    .cw-header {
      flex: 0 0 auto;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border: 1px solid var(--cw-line);
      border-radius: 8px;
      background: var(--cw-surface);
    }
    .cw-title { display: flex; align-items: baseline; gap: 12px; min-width: 0; }
    .cw-title h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 650;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cw-rev {
      padding: 1px 7px;
      border: 1px solid var(--cw-line);
      border-radius: 4px;
      font-size: .75rem;
    }
    .cw-customer { font-size: .8125rem; color: var(--cw-muted); }

    .cw-header-right {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .cw-total {
      display: flex;
      align-items: baseline;
      gap: 6px;
      padding: 3px 12px;
      border: 1px solid var(--cw-line);
      border-radius: 6px;
      background: var(--cw-hover);
      font-variant-numeric: tabular-nums;
    }
    .cw-total-cur { font-size: .75rem; color: var(--cw-muted); }
    .cw-total-val { font-size: 1.05rem; font-weight: 650; }
    .cw-save {
      padding: 5px 20px;
      border: none;
      border-radius: 6px;
      background: var(--cw-accent);
      color: #ffffff;
      font-size: .875rem;
      font-weight: 600;
      cursor: pointer;
    }
    .cw-save:disabled { opacity: .6; cursor: default; }

    .cw-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .cw-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 9px;
      border: 1px solid var(--cw-line);
      border-radius: 99px;
      font-size: .75rem;
      white-space: nowrap;
    }
    .cw-chip-label { color: var(--cw-muted); }

    /* ── Body ─────────────────────────────────────────────────────────── */
    .cw-body {
      flex: 1 1 auto;
      min-height: 0;
      display: grid;
      /* Wider left column than before: it now carries the machine cards and
         the picker as well as the documents. */
      grid-template-columns: 300px minmax(0, 1fr) 300px;
      gap: 10px;
    }

    .cw-rail,
    .cw-inspector {
      min-height: 0;
      overflow-y: auto;
      padding: 12px;
      border: 1px solid var(--cw-line);
      border-radius: 8px;
      background: var(--cw-surface);
    }

    /* The rail is two stacked panels that scroll independently, so a long
       machine list cannot push the documents out of reach. */
    .cw-rail {
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow: hidden;
      position: relative;   /* for the balloon-mode resize handle */
    }
    /* Deliberately short: a part has two or three documents, and the space is
       worth more to the machines below. Scrolls once there are more. */
    .cw-rail-docs {
      flex: 0 0 auto;
      max-height: 190px;
      overflow-y: auto;
    }
    .cw-rail-machines {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      border-top: 1px solid var(--cw-line);
      padding-top: 10px;
    }
    .cw-rail-machines:empty { display: none; }
    .cw-rail-title {
      margin: 0 0 10px;
      font-size: .6875rem;
      font-weight: 600;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: var(--cw-muted);
    }

    /* ── Document rail ────────────────────────────────────────────────── */
    .cw-doc-list { display: flex; flex-direction: column; gap: 4px; }
    .cw-doc {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px;
      border: 1px solid transparent;
      border-radius: 6px;
      cursor: pointer;
      min-width: 0;
    }
    .cw-doc:hover { background: var(--cw-hover); }
    .cw-doc.is-selected {
      border-color: var(--cw-accent);
      background: var(--cw-hover);
    }
    .cw-doc.is-unviewable { opacity: .6; cursor: default; }
    .cw-doc-type {
      flex: 0 0 auto;
      width: 36px;
      line-height: 22px;
      border-radius: 4px;
      color: #ffffff;
      font-size: .6875rem;
      font-weight: 600;
      text-align: center;
    }
    .cw-doc-name {
      flex: 1 1 auto;
      min-width: 0;
      font-size: .8125rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cw-doc-dl {
      flex: 0 0 auto;
      width: 22px;
      line-height: 22px;
      border-radius: 4px;
      text-align: center;
      text-decoration: none;
      color: var(--cw-accent);
    }
    .cw-doc-dl:hover { background: var(--cw-hover); }

    /* ── Main column ──────────────────────────────────────────────────── */
    /* Explicit areas, not bare rows: the mode switch is hidden whenever the
       document has fewer than two modes, and with implicit row placement that
       hidden element would pull the stage into the auto row - where it
       collapses to nothing, because everything inside it is absolutely
       positioned. NOTE: no backticks in here, this whole block is a JS
       template literal. */
    .cw-main {
      min-width: 0;
      min-height: 0;
      display: grid;
      /* Areas are named explicitly: with implicit rows an :empty control bar
         drops out and pulls .cw-stage into an auto row, collapsing it to zero
         height. */
      grid-template-areas: "modes" "sheet" "stage" "tray";
      grid-template-rows: auto auto minmax(0, 1fr) auto;
      gap: 8px;
    }

    /* A quote missing its material cost looks like a complete quote unless
       something says otherwise, so this is stated in the panel rather than
       left to whoever notices the total is low. */
    .cw-warn { color: var(--bs-danger, #dc3545); }
    .cw-warn-block {
      margin: 4px 0 10px;
      font-size: 11.5px;
      line-height: 1.45;
      padding: 6px 8px;
      border-left: 2px solid var(--bs-danger, #dc3545);
      background: color-mix(in srgb, var(--bs-danger, #dc3545) 7%, transparent);
    }
    /* The LookupEditor brings its own combobox styling from the theme; this
       only makes it fill the field slot like the plain inputs beside it. */
    .cw-material-editor { flex: 1; min-width: 0; }
    .cw-material-editor .select2-container,
    .cw-material-editor input { width: 100% !important; }
    .cw-material-warn:empty { display: none; }

    /* ── Processing steps ─────────────────────────────────────────────── */
    .cw-timings { margin-top: 16px; }
    /* Each pipeline is its own block, so conversion/OCR steps are never read as
       a continuation of the costing steps printed under them. */
    .cw-timing-group + .cw-timing-group { margin-top: 4px; }
    .cw-timing-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .09em;
      text-transform: uppercase;
      color: var(--cw-muted);
      margin-bottom: 8px;
      padding-top: 12px;
      border-top: 1px solid var(--cw-line);
    }
    .cw-timing-total { font-variant-numeric: tabular-nums; letter-spacing: 0; }
    .cw-timing-empty { font-size: 12px; color: var(--cw-muted); font-style: italic; }
    .cw-timing-row {
      display: grid;
      grid-template-columns: 1fr 54px 52px 30px;
      align-items: center;
      gap: 6px;
      padding: 3px 0;
      font-size: 11.5px;
    }
    .cw-timing-name {
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      color: var(--cw-ink);
    }
    .cw-timing-bar {
      height: 5px; border-radius: 3px;
      background: color-mix(in srgb, var(--cw-ink) 10%, var(--cw-surface));
      overflow: hidden;
    }
    .cw-timing-bar > i { display: block; height: 100%; background: var(--cw-accent); }
    .cw-timing-ms, .cw-timing-share {
      text-align: right;
      font-variant-numeric: tabular-nums;
      color: var(--cw-muted);
    }
    /* A failed step is the first thing to look at, so it is the only coloured
       row; skipped is dimmed because its absence is expected, not a problem. */
    .cw-timing-row.is-failed .cw-timing-name,
    .cw-timing-row.is-failed .cw-timing-ms { color: var(--bs-danger, #dc3545); }
    .cw-timing-row.is-failed .cw-timing-bar > i { background: var(--bs-danger, #dc3545); }
    .cw-timing-row.is-skipped { opacity: .55; }
    .cw-timing-row.is-skipped .cw-timing-bar > i { background: var(--cw-muted); }
    .cw-timing-row.is-running .cw-timing-bar > i { background: var(--bs-warning, #d9a047); }

    .cw-modes { grid-area: modes; display: flex; gap: 4px; }
    .cw-modes:empty { display: none; }

    /* Original / Converted sheet switch, plus the converted download. */
    .cw-sheet {
      grid-area: sheet;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .cw-sheet:empty { display: none; }
    .cw-sheet-group {
      display: inline-flex;
      border: 1px solid var(--cw-line);
      border-radius: 6px;
      overflow: hidden;
    }
    .cw-sheet-btn {
      padding: 3px 12px;
      border: 0;
      background: transparent;
      color: var(--cw-muted);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    }
    .cw-sheet-btn + .cw-sheet-btn { border-left: 1px solid var(--cw-line); }
    .cw-sheet-btn:hover { background: var(--cw-hover); color: var(--cw-ink); }
    .cw-sheet-btn.is-active {
      background: var(--cw-accent);
      color: #fff;
    }
    .cw-sheet-dl {
      font-size: 12px;
      color: var(--cw-accent);
      text-decoration: none;
    }
    .cw-sheet-dl:hover { text-decoration: underline; }
    /* No converted PDF yet: kept visible so its absence is legible, but inert. */
    .cw-sheet-dl.is-disabled {
      color: var(--cw-muted);
      pointer-events: none;
      opacity: .6;
    }
    .cw-mode {
      padding: 4px 14px;
      border: 1px solid var(--cw-line);
      border-radius: 6px;
      background: var(--cw-surface);
      color: var(--cw-ink);
      font-size: .8125rem;
      cursor: pointer;
    }
    .cw-mode.is-active {
      border-color: var(--cw-accent);
      color: var(--cw-accent);
      font-weight: 600;
    }

    .cw-stage {
      grid-area: stage;
      position: relative;
      min-height: 0;
      overflow: hidden;
      border: 1px solid var(--cw-line);
      border-radius: 8px;
      background: var(--cw-surface);
    }
    /* Each mode's host fills the stage; visibility is toggled, not remounted,
       so the 2D transform survives a trip through 3D and back. */
    .cw-stage-2d,
    .cw-stage-3d,
    .cw-stage-balloon {
      position: absolute;
      inset: 0;
    }
    /* Balloon mode takes over the stage rather than overlaying 2D: the ported
       widget brings its own canvas, pan and zoom, and two transforms on one
       page fight each other. It therefore needs pointer events of its own. */
    .cw-stage-balloon { overflow: hidden; }
    .cw-stage-message {
      position: absolute;
      inset: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 24px;
      text-align: center;
      font-size: .875rem;
      color: var(--cw-muted);
      background: var(--cw-surface);
    }

    .cw-tray {
      grid-area: tray;
      display: flex;
      flex-direction: column;
      /* Fixed, not a 190-340px range: the tray used to grow and shrink with
         whichever tab was open, so switching tabs moved the stage above it.
         The "tray" grid row is auto-sized, so it follows this height; min and
         max are pinned to the same value to keep that true if the row is ever
         changed to a fraction. .cw-traybody scrolls whatever does not fit. */
      height: 250px;
      min-height: 250px;
      max-height: 250px;
      border: 1px solid var(--cw-line);
      border-radius: 8px;
      background: var(--cw-surface);
      overflow: hidden;
    }
    .cw-traytabs {
      flex: 0 0 auto;
      display: flex;
      gap: 2px;
      padding: 6px 8px 0;
      border-bottom: 1px solid var(--cw-line);
    }
    .cw-traytab {
      padding: 5px 14px;
      border: none;
      border-bottom: 2px solid transparent;
      background: none;
      font-size: .8125rem;
      cursor: pointer;
      color: var(--cw-muted);
    }
    .cw-traytab.is-active {
      border-bottom-color: var(--cw-accent);
      color: var(--cw-accent);
      font-weight: 600;
    }
    .cw-count {
      display: inline-block;
      min-width: 18px;
      padding: 0 5px;
      border-radius: 9px;
      background: var(--cw-hover);
      font-size: .6875rem;
    }
    /* The tables are wide; scroll them inside the tray rather than letting the
       page scroll sideways. */
    .cw-traybody { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 4px 8px 8px; }

    .cw-table {
      width: 100%;
      border-collapse: collapse;
      font-size: .8125rem;
    }
    .cw-table th {
      position: sticky;
      top: 0;
      text-align: left;
      padding: 6px 10px;
      background: var(--cw-surface);
      border-bottom: 1px solid var(--cw-line);
      font-size: .6875rem;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: var(--cw-muted);
      white-space: nowrap;
    }
    .cw-table td {
      padding: 6px 10px;
      border-bottom: 1px solid var(--cw-line-soft);
    }
    .cw-table .num { text-align: right; font-variant-numeric: tabular-nums; }
    .cw-table tfoot td {
      border-top: 2px solid var(--cw-line);
      border-bottom: none;
      color: var(--cw-muted);
    }
    .cw-table tfoot .total { font-size: .95rem; font-weight: 700; color: inherit; }

    /* ── Process-analysis notes ────────────────────────────────────────────
       The only prose in a panel of numbers, so it gets a rule above it and a
       list rather than another key/value row. */
    .cw-notes {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid var(--cw-line);
    }
    .cw-notes-k {
      font-size: .6875rem;
      font-weight: 600;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: var(--cw-muted);
      margin-bottom: 4px;
    }
    .cw-notes-list {
      margin: 0;
      padding-left: 16px;
      font-size: .75rem;
      line-height: 1.5;
    }
    .cw-notes-list li { margin-bottom: 2px; }

    /* ── Balloon mode: the editor lives in the rail ────────────────────────
       It used to sit across the bottom tray, which cost the drawing a full
       tray's height on the tightest stage in the page. A balloon list is a
       tall narrow thing anyway, so a column in the rail suits it better than a
       strip under the canvas. Hidden by :empty in every other mode, so the
       rail keeps its old shape for costing. */
    .cw-rail-balloon { display: none; }
    .cw-rail-balloon:not(:empty) {
      display: flex;
      flex-direction: column;
      min-height: 0;
      flex: 1 1 auto;
      gap: 8px;
    }
    /* The property editor is short and fixed; the list takes what is left and
       scrolls, so selecting a balloon never pushes its own properties away. */
    /* Capped, so a selected balloon's form can never squeeze the list down to
       a few rows; the form scrolls instead. */
    .cw-rail-balloon .cw-balloon-props { flex: 0 0 auto; min-height: 0; max-height: 46%; overflow-y: auto; }
    .cw-rail-balloon .cw-balloon-table {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      border-top: 1px solid var(--cw-line);
      padding-top: 8px;
      /* The list re-cuts its columns by its own width, not the window's -
         the rail is resizable. */
      container-type: inline-size;
      /* Header pinned, rows scroll: the page picker and filter must stay in
         reach 150 rows down. */
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .cw-rail-balloon .cw-balloon-table > .ab-table-header { flex: 0 0 auto; }
    .cw-rail-balloon .cw-balloon-table > .ab-table-wrapper { flex: 1 1 auto; min-height: 0; overflow: auto; }

    /* ── Balloon mode: the rail moves to the right ─────────────────────────
       The part details give up their column and the rail (documents, balloon
       list, property editor) takes the right-hand side, so the drawing gets
       everything from the left edge. Drag the rail's LEFT edge to resize
       (remembered per browser); double-click the edge to reset. */
    .cw-rail-resizer { display: none; }
    .cw-root.is-balloon .cw-body {
      grid-template-columns: 300px minmax(0, 1fr) var(--cw-balloon-rail, 440px);
    }
    .cw-root.is-balloon .cw-inspector { display: none; }
    .cw-root.is-balloon .cw-balloon-editor { grid-column: 1; grid-row: 1; }
    .cw-root.is-balloon .cw-main { grid-column: 2; grid-row: 1; }
    .cw-root.is-balloon .cw-rail { grid-column: 3; grid-row: 1; }
    /* The selected balloon's properties, left of the drawing. Only in balloon
       mode; :empty keeps it out of the grid everywhere else. */
    .cw-balloon-editor { display: none; }
    .cw-root.is-balloon .cw-balloon-editor:not(:empty) {
      display: block;
      min-height: 0;
      overflow-y: auto;
      padding: 12px;
      border: 1px solid var(--cw-line);
      border-radius: 8px;
      background: var(--cw-surface);
    }
    .cw-root.is-balloon .cw-rail-resizer {
      display: block;
      position: absolute; top: 0; left: 0; bottom: 0;
      width: 8px;
      cursor: col-resize;
      touch-action: none;
      z-index: 5;
    }
    .cw-root.is-balloon .cw-rail-resizer::after {
      content: '';
      position: absolute; top: 50%; left: 2px;
      width: 3px; height: 44px; margin-top: -22px;
      border-radius: 2px;
      background: var(--cw-line);
    }
    .cw-root.is-balloon .cw-rail-resizer:hover::after,
    .cw-body.is-resizing .cw-rail-resizer::after {
      top: 0; height: 100%; margin-top: 0;
      background: var(--cw-accent);
    }
    .cw-body.is-resizing { cursor: col-resize; user-select: none; }
    /* The panels come from the ported widget, which styles itself; strip the
       borders and fixed heights it assumes so they sit flush in the rail. */
    .cw-rail-balloon .ab-property-editor,
    .cw-balloon-editor .ab-property-editor,
    .cw-rail-balloon .ab-table-container {
      width: 100%; height: auto; max-height: none;
      border: none; box-shadow: none; background: transparent;
      /* The container ships flex-shrink: 0 for a fixed 25rem tray slot; in a
         column it has to give way instead. */
      flex: 1 1 auto; min-height: 0;
    }

    /* The list is built for a wide tray: five columns, each with 16px of
       padding either side. In a 280px rail that leaves the symbol about forty
       pixels and it wraps one character per line, so the columns are re-cut
       here rather than left to the browser.

       Upper and lower stay: a tolerance is what turns a dimension into
       something an inspector has to measure, and reading it a balloon at a
       time through the property editor above is no way to scan a sheet.
       Quantity is the one that comes off - it is redundant here, because the
       No column already prints repeats as 44_1 / 44_2 and the property editor
       carries the number itself. */
    /* Sized to be read at a glance, not merely to fit: 13px rows, the symbol
       at 15px in the Y14.5 face, the number bold, zebra rows, and a strong
       marker on the selected line so it can be found while looking at the
       drawing. Quantity only appears once the rail is wide enough for it. */
    .cw-rail-balloon .ab-table { font-size: 13px; border-collapse: separate; border-spacing: 0; }
    .cw-rail-balloon .ab-table th {
      padding: 7px 8px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .04em;
      color: var(--cw-muted);
      background: var(--cw-surface);
      border-bottom: 1px solid var(--cw-line);
    }
    .cw-rail-balloon .ab-table td {
      padding: 8px;
      font-size: 13px;
      line-height: 1.4;
      vertical-align: top;
      color: var(--cw-ink);
      border-bottom: 1px solid var(--cw-line-soft);
    }
    .cw-rail-balloon .ab-table tbody tr:nth-child(even) td {
      background: color-mix(in srgb, var(--cw-ink) 3%, var(--cw-surface));
    }
    .cw-rail-balloon .ab-table tbody tr:hover td { background: var(--cw-hover); }
    .cw-rail-balloon .ab-table tbody tr.selected td {
      background: color-mix(in srgb, var(--cw-accent) 16%, var(--cw-surface));
    }
    .cw-rail-balloon .ab-table tbody tr.selected td.ab-c-no {
      box-shadow: inset 4px 0 0 var(--cw-accent);
    }

    /* Columns are addressed by class, not position: the page and drawing
       columns come and go, which would shift every nth-child along.

       Narrow rail: the tolerance pair moves under the symbol instead of
       squeezing it to a word per line. The columns come back once the list
       is wide enough - sooner without the drawing crops. */
    .cw-rail-balloon .ab-table .ab-c-up,
    .cw-rail-balloon .ab-table .ab-c-lo,
    .cw-rail-balloon .ab-table .ab-c-qty { display: none; }
    .cw-rail-balloon .ab-table .ab-c-tolinline {
      display: block;
      margin-top: 2px;
      font-family: inherit;
      font-size: 12px;
      color: var(--cw-muted);
      font-variant-numeric: tabular-nums;
    }
    @container (min-width: 380px) {
      .cw-rail-balloon .ab-table:not(.has-img) .ab-c-up,
      .cw-rail-balloon .ab-table:not(.has-img) .ab-c-lo { display: table-cell; }
      .cw-rail-balloon .ab-table:not(.has-img) .ab-c-tolinline { display: none; }
    }
    @container (min-width: 560px) {
      .cw-rail-balloon .ab-table.has-img .ab-c-up,
      .cw-rail-balloon .ab-table.has-img .ab-c-lo { display: table-cell; }
      .cw-rail-balloon .ab-table.has-img .ab-c-tolinline { display: none; }
    }
    @container (min-width: 640px) {
      .cw-rail-balloon .ab-table .ab-c-qty {
        display: table-cell;
        width: 48px;
        text-align: center;
        color: var(--cw-muted);
      }
    }

    /* Right-aligned so the decimal points line up down the column - the whole
       point of reading tolerances as a list. Never wrapped: "+.000" broken
       over two lines reads as two numbers. */
    .cw-rail-balloon .ab-table .ab-c-up,
    .cw-rail-balloon .ab-table .ab-c-lo {
      width: 70px;
      text-align: right;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-variant-numeric: tabular-nums;
    }
    .cw-rail-balloon .ab-table .ab-c-no {
      width: 1%;
      white-space: nowrap;
      text-align: right;
      padding-left: 12px;
      padding-right: 8px;
    }
    .cw-rail-balloon .ab-table td.ab-c-no {
      font-size: 14px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .cw-rail-balloon .ab-table .ab-c-page {
      width: 1%;
      padding-left: 4px;
      padding-right: 4px;
      text-align: center;
      color: var(--cw-muted);
    }
    .cw-rail-balloon .ab-table .ab-c-img {
      width: 1%;
      padding: 5px 6px;
    }
    /* break-word, not break-all: a long part number should move to the next
       line whole rather than be split mid-token. */
    .cw-rail-balloon .ab-table td.ab-c-sym {
      font-size: 15px;
      overflow-wrap: break-word;
      word-break: normal;
      line-height: 1.35;
    }
    .cw-rail-balloon .ab-table-header {
      padding: 6px 4px 8px;
      font-size: 13px;
      font-weight: 600;
      gap: 8px;
      background: transparent;
      border-bottom: none;
    }

    /* The title and its delete button are laid out for a wide panel and wrap
       onto two lines in the rail, leaving the button stranded under the
       heading. Keep them on one row with the button pinned right. */
    .cw-rail-balloon .ab-panel-header,
    .cw-balloon-editor .ab-panel-header {
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 0 0 6px;
    }
    .cw-rail-balloon .ab-panel-title,
    .cw-balloon-editor .ab-panel-title {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cw-rail-balloon .ab-panel-header .ab-btn,
    .cw-balloon-editor .ab-panel-header .ab-btn { flex: 0 0 auto; }
    .cw-rail-balloon .ab-panel-content,
    .cw-balloon-editor .ab-panel-content { padding: 0; }

    /* Ballooning hands the drawing everything the layout can spare. */
    .cw-root.is-balloon .cw-rail-machines { display: none; }
    .cw-root.is-balloon .cw-tray { display: none; }
    /* The documents list shrinks but stays: switching between a part's two or
       three drawings is exactly what you do while ballooning. */
    .cw-root.is-balloon .cw-rail-docs { max-height: 120px; }

    /* ── Editable detail fields ───────────────────────────────────────── */
    .cw-field-edit { align-items: center; cursor: text; }
    .cw-input {
      flex: 1 1 auto;
      min-width: 0;
      max-width: 60%;
      padding: 3px 7px;
      border: 1px solid var(--cw-line);
      border-radius: 4px;
      background: var(--cw-surface);
      color: inherit;
      font-size: .8125rem;
      text-align: right;
    }
    .cw-input:focus {
      outline: none;
      border-color: var(--cw-accent);
    }
    .cw-dims { display: flex; gap: 6px; padding: 8px 0; }
    .cw-dim { flex: 1 1 0; min-width: 0; text-align: center; }
    .cw-dim .cw-input { max-width: 100%; width: 100%; text-align: center; }
    .cw-dim span {
      display: block;
      margin-top: 3px;
      font-size: .6875rem;
      color: var(--cw-muted);
    }

    /* ── Inspector ────────────────────────────────────────────────────── */
    /* Fixed-height slot so the fields below do not jump when a picture arrives
       or is missing. */
    .cw-part-image {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 150px;
      margin-bottom: 12px;
      padding: 6px;
      border: 1px solid var(--cw-line);
      border-radius: 6px;
      background: var(--cw-hover);
      overflow: hidden;
    }
    .cw-part-image img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    a.cw-part-image:hover { border-color: var(--cw-accent); }
    .cw-part-image.is-empty {
      border-style: dashed;
      font-size: .75rem;
      font-style: italic;
      color: var(--cw-muted);
    }
    .cw-field {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 5px 0;
      border-bottom: 1px solid var(--cw-line-soft);
      font-size: .8125rem;
    }
    .cw-field:last-of-type { border-bottom: none; }
    .cw-field-k { color: var(--cw-muted); flex: 0 0 auto; }
    .cw-field-v { text-align: right; min-width: 0; word-break: break-word; }

    .cw-placeholder {
      margin: 12px 0 0;
      font-size: .75rem;
      font-style: italic;
      color: var(--cw-muted);
    }
    .cw-stage-balloon .cw-placeholder { margin: 16px; }

    /* ── Narrow screens ───────────────────────────────────────────────── */
    @media (max-width: 1400px) {
      .cw-body { grid-template-columns: 260px minmax(0, 1fr) 260px; }
      .cw-root.is-balloon .cw-body {
        grid-template-columns: 260px minmax(0, 1fr) var(--cw-balloon-rail, 380px);
      }
    }
    @media (max-width: 1100px) {
      .cw-root { height: auto; }
      .cw-body,
      .cw-root.is-balloon .cw-body { grid-template-columns: minmax(0, 1fr); }
      .cw-stage { height: 60vh; }
      .cw-rail, .cw-inspector { max-height: 320px; }
      .cw-root.is-balloon .cw-rail { max-height: 70vh; }
      .cw-root.is-balloon .cw-balloon-editor,
      .cw-root.is-balloon .cw-main,
      .cw-root.is-balloon .cw-rail { grid-column: auto; grid-row: auto; }
      .cw-root.is-balloon .cw-rail-resizer { display: none; }
    }
    
    /* A costing that fell back to new_tsh's flat default rates because no
       machine in the equipment table fits the part. Marked rather than hidden:
       the price is real, but it is not a price from anyone's shop floor. */
    .cw-machine-default {
      color: var(--bs-warning-text-emphasis, #997404);
      font-style: italic;
    }

    /* ── The machines a part was costed on ─────────────────────────────── */
    /* Above the cost lines rather than repeated on every row: a turn-mill part
       runs two machines over four or five rows, and the specifications only
       need saying once each. */
    /* Stacked, not side by side: the rail is one narrow column. */
    .cw-machines {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 0 0 10px;
    }
    .cw-machine-card {
      display: flex;
      gap: 9px;
      align-items: flex-start;
      border: 1px solid var(--cw-line);
      border-left: 3px solid var(--cw-accent);
      border-radius: 8px;
      background: color-mix(in srgb, var(--cw-ink) 3%, var(--cw-surface));
      padding: 8px 10px 8px 8px;
    }
    /* Priced without a machine, so the card carries a warning instead of specs. */
    .cw-machine-card.is-default {
      border-left-color: var(--bs-warning, #d9a047);
    }

    .cw-machine-pic {
      flex: 0 0 74px;
      width: 74px;
      align-self: flex-start;
      display: flex; align-items: center; justify-content: center;
      background: var(--cw-surface);
      border: 1px solid var(--cw-line);
      border-radius: 6px;
      overflow: hidden;
      padding: 3px;
    }
    .cw-machine-pic img { max-width: 100%; max-height: 74px; object-fit: contain; }
    .cw-machine-pic.is-empty {
      font-size: 10px; color: var(--cw-muted); text-align: center; padding: 4px;
    }

    .cw-machine-card-body { min-width: 0; flex: 1; }
    .cw-machine-card-name {
      font-size: 13px; font-weight: 600; color: var(--cw-ink);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .cw-machine-desc {
      font-size: 11px; color: var(--cw-muted); margin-top: 1px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    /* A label/value grid rather than a run-on line: these are five unrelated
       numbers, and side by side they read as one string. */
    .cw-machine-specs {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 2px 10px;
      margin: 7px 0 0;
      font-size: 11.5px;
    }
    .cw-machine-specs dt {
      color: var(--cw-muted);
      text-transform: uppercase; letter-spacing: .05em;
      font-size: 9.5px; font-weight: 600;
      align-self: center;
    }
    .cw-machine-specs dd {
      margin: 0; color: var(--cw-ink);
      font-variant-numeric: tabular-nums;
    }
    /* Which cost lines this machine priced -- the link back to the table. */
    .cw-machine-lines {
      margin-top: 6px; font-size: 11px; color: var(--cw-muted);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .cw-machine-note {
      margin: 4px 0 0; font-size: 11.5px; line-height: 1.45;
      color: var(--bs-warning-text-emphasis, #997404);
    }

    /* In the cost table itself: enough to tell two machines apart at a glance,
       with the detail left to the cards above. */
    .cw-machine-name { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
    .cw-machine-name > span {
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    /* The machine cell is a control, not a label -- the pipeline's pick is a
       suggestion and the operator is expected to overrule it. */
    button.cw-machine-name {
      border: 1px solid transparent; background: transparent;
      padding: 1px 5px 1px 3px; border-radius: 5px;
      font: inherit; color: inherit; cursor: pointer; text-align: left;
      max-width: 100%;
    }
    button.cw-machine-name:hover {
      border-color: var(--cw-line);
      background: color-mix(in srgb, var(--cw-ink) 5%, var(--cw-surface));
    }
    .cw-machine-alt {
      font-style: normal; font-size: 9.5px; font-weight: 700;
      color: var(--cw-muted); border: 1px solid var(--cw-line);
      border-radius: 8px; padding: 0 4px; margin-left: 2px;
    }

    /* ── Machine picker ────────────────────────────────────────────────── */
    .cw-picker {
      border: 1px solid var(--cw-accent);
      border-radius: 8px;
      background: var(--cw-surface);
      overflow: hidden;
    }
    /* The cell whose picker is open, so the rail and the table agree about
       which process is being changed. */
    button.cw-machine-name.is-open {
      border-color: var(--cw-accent);
      background: color-mix(in srgb, var(--cw-accent) 10%, var(--cw-surface));
    }
    .cw-picker-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 7px 10px;
      background: color-mix(in srgb, var(--cw-ink) 4%, var(--cw-surface));
      border-bottom: 1px solid var(--cw-line);
      font-size: 11.5px; color: var(--cw-ink);
    }
    .cw-picker-close {
      border: 0; background: transparent; cursor: pointer;
      font-size: 17px; line-height: 1; color: var(--cw-muted); padding: 0 2px;
    }
    .cw-picker-list { max-height: 300px; overflow-y: auto; }

    .cw-pick {
      display: flex; align-items: center; gap: 10px; width: 100%;
      padding: 6px 10px; border: 0; border-bottom: 1px solid var(--cw-line);
      background: transparent; cursor: pointer; text-align: left; font: inherit;
    }
    .cw-pick:last-child { border-bottom: 0; }
    .cw-pick:hover:not(:disabled) {
      background: color-mix(in srgb, var(--cw-accent) 8%, var(--cw-surface));
    }
    .cw-pick:disabled { cursor: default; opacity: .85; }
    .cw-pick.is-current {
      background: color-mix(in srgb, var(--cw-ink) 4%, var(--cw-surface));
    }
    .cw-pick img, .cw-pick-nopic {
      flex: 0 0 40px; width: 40px; height: 34px; object-fit: contain;
      border: 1px solid var(--cw-line); border-radius: 4px; background: var(--cw-surface);
    }
    .cw-pick-body { flex: 1; min-width: 0; }
    .cw-pick-name {
      display: block; font-size: 12px; color: var(--cw-ink);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .cw-pick-spec { display: block; font-size: 10.5px; color: var(--cw-muted); }
    .cw-pick-tag, .cw-pick-warn {
      font-style: normal; font-size: 9px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .05em;
      border-radius: 3px; padding: 0 4px; margin-left: 5px;
    }
    .cw-pick-tag { color: var(--cw-accent); border: 1px solid currentColor; }
    .cw-pick-warn { color: var(--bs-danger, #dc3545); border: 1px solid currentColor; }

    .cw-pick-money {
      flex: 0 0 auto; text-align: right;
      font-variant-numeric: tabular-nums; font-size: 11.5px;
    }
    .cw-pick-rate { display: block; color: var(--cw-muted); font-size: 10.5px; }
    .cw-pick-total { display: block; color: var(--cw-ink); font-weight: 600; }
    /* The number people are actually here for: what swapping the machine does
       to this line. */
    .cw-pick-delta { display: block; font-size: 10.5px; color: var(--cw-muted); }
    .cw-pick-delta.is-down { color: var(--bs-success, #198754); }
    .cw-pick-delta.is-up { color: var(--bs-danger, #dc3545); }

    .cw-machine-thumb {
      flex: 0 0 auto;
      width: 22px; height: 22px;
      object-fit: contain;
      border: 1px solid var(--cw-line);
      border-radius: 4px;
      background: var(--cw-surface);
    }
</style>`;
}
