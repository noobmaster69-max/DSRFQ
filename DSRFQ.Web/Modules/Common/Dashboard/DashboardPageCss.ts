/**
 * Styles for the pipeline dashboard.
 *
 * The palette is declared once here as custom properties and referenced by
 * role everywhere else, so light/dark swap in one place and the chart code
 * never names a hex. Dark is keyed on `data-bs-theme`, which _Layout sets on
 * <html> from the ProThemeSelection cookie -- not on prefers-color-scheme,
 * because the app's own theme picker has to win over the OS setting.
 *
 * Status hues are the four reserved states, and only three of them are used:
 * `warning` and `serious` sit at normal-vision deltaE 13.6, below the 15 floor,
 * so putting both in one stacked bar would ask people to tell apart two colours
 * that are genuinely hard to tell apart. "No drawing" is not a severity anyway
 * -- it means the step cannot apply -- so it takes the neutral gray instead.
 *
 * `--st-warning` is 1.79:1 on the light surface, under the 3:1 mark. That is
 * allowed only because nothing relies on the colour alone: every segment is
 * directly labelled and the whole dataset is available as a table.
 */
export function DashboardPageCss(): string {
    return `<style id="dsrfq-dashboard-css">
.dsrfq-dash {
    --surface:      #fcfcfb;
    --plane:        #f9f9f7;
    --ink:          #0b0b0b;
    --ink-2:        #52514e;
    --ink-muted:    #898781;
    --grid:         #e1e0d9;
    --axis:         #c3c2b7;
    --hairline:     rgba(11, 11, 11, .10);

    --series:       #2a78d6;   /* sequential blue, the single-series hue */
    --series-soft:  #cde2fb;   /* same ramp, step 100 -- meter tracks */
    --st-good:      #0ca30c;
    --st-warning:   #fab219;
    --st-critical:  #d03b3b;
    --st-na:        #898781;   /* not applicable, deliberately not a severity */
}

[data-bs-theme="dark"] .dsrfq-dash {
    --surface:      #1a1a19;
    --plane:        #0d0d0d;
    --ink:          #ffffff;
    --ink-2:        #c3c2b7;
    --ink-muted:    #898781;
    --grid:         #2c2c2a;
    --axis:         #383835;
    --hairline:     rgba(255, 255, 255, .10);

    --series:       #3987e5;
    --series-soft:  #184f95;
    --st-na:        #898781;
}

/* ---- layout ---------------------------------------------------------- */

.dsrfq-dash { padding: 4px 2px 24px; color: var(--ink); }

/* align-items:start stops a short card being stretched to match a tall
   neighbour, which left a block of dead space under its legend. */
.dsrfq-dash .dash-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: 16px;
    margin-top: 16px;
}
.dsrfq-dash .dash-grid > .span-2 { grid-column: 1 / -1; }
@media (max-width: 1100px) {
    .dsrfq-dash .dash-grid { grid-template-columns: minmax(0, 1fr); }
}

.dsrfq-dash .card {
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-radius: 10px;
    padding: 16px 18px 14px;
}

.dsrfq-dash .card-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 2px;
}
.dsrfq-dash h2 {
    font-size: 14px; font-weight: 600; letter-spacing: .01em;
    color: var(--ink); margin: 0;
}
.dsrfq-dash .sub {
    font-size: 12px; color: var(--ink-2); margin: 0 0 14px;
}

/* ---- KPI row --------------------------------------------------------- */

.dsrfq-dash .kpis {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
}
@media (max-width: 1100px) { .dsrfq-dash .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px)  { .dsrfq-dash .kpis { grid-template-columns: minmax(0, 1fr); } }

.dsrfq-dash .kpi .label {
    font-size: 12px; color: var(--ink-2); margin: 0 0 6px;
}
/* Proportional figures: tabular-nums gives every digit a zero's width, which
   reads loose at display sizes. Columns get tabular; headline numbers do not. */
.dsrfq-dash .kpi .value {
    font-size: 30px; font-weight: 600; line-height: 1.1; color: var(--ink);
}
.dsrfq-dash .kpi .value .unit {
    font-size: 15px; font-weight: 500; color: var(--ink-2); margin-left: 3px;
}
.dsrfq-dash .kpi .note {
    font-size: 12px; color: var(--ink-muted); margin-top: 5px;
}
.dsrfq-dash .kpi .note.is-bad { color: var(--st-critical); font-weight: 500; }

/* ---- charts ---------------------------------------------------------- */

.dsrfq-dash svg { display: block; width: 100%; overflow: visible; }
.dsrfq-dash .tick { font-size: 11px; fill: var(--ink-muted); }
.dsrfq-dash .cat  { font-size: 12px; fill: var(--ink-2); }
.dsrfq-dash .val  { font-size: 12px; fill: var(--ink); font-weight: 600; }
.dsrfq-dash .gridline { stroke: var(--grid); stroke-width: 1; }
.dsrfq-dash .baseline { stroke: var(--axis); stroke-width: 1; }

/* The hit target is the full band, so a 10px bar is still easy to hover. */
.dsrfq-dash .hit { fill: transparent; cursor: default; }
.dsrfq-dash .row-g:hover .hit { fill: var(--ink); fill-opacity: .04; }

/* ---- legend ---------------------------------------------------------- */

.dsrfq-dash .legend {
    display: flex; flex-wrap: wrap; gap: 6px 16px;
    margin: 12px 0 0; padding: 0; list-style: none;
}
.dsrfq-dash .legend li {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--ink-2);
}
.dsrfq-dash .legend .sw {
    width: 10px; height: 10px; border-radius: 2px; flex: none;
}

/* ---- table view ------------------------------------------------------ */

.dsrfq-dash .toggle {
    background: none; border: 0; padding: 0;
    font-size: 12px; color: var(--ink-2);
    text-decoration: underline; text-underline-offset: 2px; cursor: pointer;
}
.dsrfq-dash .toggle:hover { color: var(--ink); }

.dsrfq-dash table { width: 100%; border-collapse: collapse; font-size: 12px; }
.dsrfq-dash th {
    text-align: left; font-weight: 600; color: var(--ink-2);
    padding: 6px 10px 6px 0; border-bottom: 1px solid var(--hairline);
    white-space: nowrap;
}
.dsrfq-dash td {
    padding: 6px 10px 6px 0; color: var(--ink);
    border-bottom: 1px solid var(--hairline); vertical-align: top;
}
.dsrfq-dash td.num, .dsrfq-dash th.num {
    text-align: right; font-variant-numeric: tabular-nums; padding-right: 0;
}
.dsrfq-dash tr:last-child td { border-bottom: 0; }
.dsrfq-dash .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 11px; color: var(--ink-2);
}

/* A stack trace is longer than any column can be. table-layout:fixed is what
   makes the ellipsis work at all -- under the default auto layout the cell
   just widens to fit and pushes the table past the card, and giving the
   detail column a percentage width instead starves the other three until
   "0043-07547" wraps onto two lines. Fixed widths first, then clip. */
.dsrfq-dash table.failures { table-layout: fixed; width: 100%; }
.dsrfq-dash table.failures .c-part  { width: 104px; }
.dsrfq-dash table.failures .c-stage { width: 178px; }
.dsrfq-dash table.failures .c-when  { width: 104px; }
.dsrfq-dash table.failures td {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dsrfq-dash .empty {
    font-size: 12px; color: var(--ink-muted); padding: 10px 0;
}

/* Status text never rides on colour alone -- each carries its own word. */
.dsrfq-dash .pill {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 600; color: var(--ink-2); white-space: nowrap;
}
.dsrfq-dash .pill .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
</style>`;
}
