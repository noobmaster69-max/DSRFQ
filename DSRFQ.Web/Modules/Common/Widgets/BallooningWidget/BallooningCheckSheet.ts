import type {BalloonAnnotation} from "./BallooningTypes";
import {parseGdt} from "./BallooningMethod";
import {compareBalloonNumber, formatBalloonNumber} from "./BallooningNumbering";

/**
 * The drawing's balloons as check items, in the layout of DSEFACTORY's
 * SMARTQC › CheckSheet grid (Sqc/SqcCheckItemRev/SqcCheckItemRevEditor.ts):
 * Seq, Check Item Name, Symbol in the Y14.5M GD&T font, Mult, Note, Method,
 * Unit, Target, +Tol, -Tol, LSL, USL.
 *
 * A view, not a copy: no check sheet table, no revision. It is built from the
 * editor's balloons at the moment it is opened - unsaved edits included - so
 * it can never disagree with what is on the drawing. Target / LSL / USL come
 * from parseGdt, the same parser SMARTQC's CheckSheetConvertDialog uses to
 * turn balloons into check items, so a drawing gets the same numbers here as
 * it would in the factory.
 */

export interface CheckSheetLine {
    id: string;
    seq: number;
    page: number;
    /** SMARTQC's "Check Item Name": the balloon number, 5 or 5-1. */
    name: string;
    /** The section / detail view the balloon is in, "SECTION A-A", or blank. */
    view?: string;
    symbol: string;
    mult: string;
    /** Note / Datum, or blank for a measured characteristic. */
    note: string;
    method: string;
    unit: string;
    target: number | null;
    upperTol: string;
    lowerTol: string;
    lsl: number | null;
    usl: number | null;
    audited: boolean;
}

const blank = (v: any) => v == null || String(v).trim() === '';

function num(v: any): number | null {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : null;
}

/** One line per balloon, in page order and then number order. */
export function checkSheetLines(annotations: BalloonAnnotation[], opts: {
    subSeparator?: string; unit?: string;
    /** "SECTION A-A" for a balloon in a section view - see BallooningViewLinks. */
    viewOf?: (a: BalloonAnnotation) => string | null;
} = {}): CheckSheetLine[] {
    const sorted = [...annotations].sort((a, b) =>
        (a.pageIndex - b.pageIndex) || compareBalloonNumber(a, b));

    return sorted.map((a, i) => {
        const symbol = a.content ?? '';
        // Only hand parseGdt tolerances that exist. Given anything at all it
        // takes its "explicit tolerances" route and never looks for a ± in the
        // text itself.
        const hasTol = !blank(a.upperTol) || !blank(a.lowerTol);
        const g: any = a.isNote ? {target: null, lsl: null, usl: null}
            : parseGdt(symbol,
                hasTol ? (a.upperTol ?? '') : undefined,
                hasTol ? (a.lowerTol ?? '') : undefined);
        return {
            id: a.id,
            seq: i + 1,
            page: a.pageIndex + 1,
            name: formatBalloonNumber(a, opts.subSeparator as any),
            view: opts.viewOf?.(a) ?? '',
            symbol,
            mult: (a.quantity ?? 1) > 1 ? String(a.quantity) : '',
            note: a.isNote ? 'Note' : a.isDatum ? 'Datum' : '',
            method: a.inspectionToolName ?? '',
            unit: opts.unit ?? '',
            target: num(g.target),
            upperTol: a.upperTol ?? '',
            lowerTol: a.lowerTol ?? '',
            lsl: num(g.lsl),
            usl: num(g.usl),
            audited: !!a.audited,
        };
    });
}

/**
 * A limit as the drawing would print it. Adding a tolerance to a nominal in
 * floating point gives 2.1750000000000003; six decimals is past any drawing's
 * precision, and trailing zeros are dropped so .5 stays .5.
 */
export function formatLimit(v: number | null): string {
    if (v == null) return '';
    return String(parseFloat(v.toFixed(6)));
}

const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]!));

/** The table, in the same column order as SMARTQC's check item grid. */
export function renderCheckSheetTable(lines: CheckSheetLine[]): string {
    if (!lines.length)
        return `<p class="ab-cs-empty">No balloons on this drawing yet - the check sheet is built from them.</p>`;
    const multiPage = new Set(lines.map(l => l.page)).size > 1;
    return `
      <table class="ab-cs-table">
        <thead><tr>
          <th class="num">Seq</th>
          ${multiPage ? '<th class="num" title="Page">Pg</th>' : ''}
          <th title="The balloon number">Check Item Name</th>
          <th class="ab-cs-symcol">Symbol</th>
          <th class="num">Mult</th>
          <th>Note</th>
          <th title="Inspection tool">Method</th>
          <th>Unit</th>
          <th class="num">Target</th>
          <th class="num" title="Upper tolerance">+Tol</th>
          <th class="num" title="Lower tolerance">-Tol</th>
          <th class="num">LSL</th>
          <th class="num">USL</th>
        </tr></thead>
        <tbody>${lines.map(l => `
          <tr data-cs-id="${esc(l.id)}" title="Go to balloon ${esc(l.name)}"
              class="${l.note ? 'ab-cs-' + l.note.toLowerCase() : ''} ${l.audited ? 'ab-cs-audited' : ''}">
            <td class="num">${l.seq}</td>
            ${multiPage ? `<td class="num">${l.page}</td>` : ''}
            <td class="ab-cs-name">${esc(l.name)}${l.view ? `<span class="ab-vl-tag" title="In ${esc(l.view)}">${esc(l.view)}</span>` : ''}</td>
            <td class="ab-cs-symbol" title="${esc(l.symbol)}">${esc(l.symbol)}</td>
            <td class="num">${esc(l.mult)}</td>
            <td>${esc(l.note)}</td>
            <td>${esc(l.method)}</td>
            <td>${esc(l.unit)}</td>
            <td class="num">${formatLimit(l.target)}</td>
            <td class="num">${esc(l.upperTol)}</td>
            <td class="num">${esc(l.lowerTol)}</td>
            <td class="num ab-cs-limit">${formatLimit(l.lsl)}</td>
            <td class="num ab-cs-limit">${formatLimit(l.usl)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
}

/**
 * Open the check sheet over the page, as SMARTQC shows its check sheet
 * maximised. Escape, the Close button or the backdrop close it; clicking a
 * line closes it and hands that balloon to `onPick`.
 *
 * Attached to document.body, not the editor. The editor sits inside a
 * transformed ancestor, and position: fixed inside one is placed relative to
 * that ancestor rather than the window - the sheet opened 2000px above the
 * screen. From body it covers the viewport.
 *
 * Being outside the editor, it would no longer pause the editor's keyboard
 * shortcuts, which stand down only while an .ab-modal-overlay is inside the
 * editor (isOnScreen) - and Delete would delete the selected balloon behind
 * the sheet. A hidden marker with that class goes into the editor for as long
 * as the sheet is open.
 */
/**
 * SMARTQC's three Excel exports, with DSEFACTORY's own button labels, in its
 * order. The key is what the server's CheckSheetExcelReport.Forms expects.
 */
export const CHECK_SHEET_FORMS: {key: string; label: string; title: string}[] = [
    {key: 'IP', label: 'I-QA-001 (IP)', title: 'In-process inspection check sheet, 23 items a page'},
    {key: 'FPLP', label: 'I-QA-002 (FP/LP)', title: 'First piece / last piece check sheet, 27 items a page'},
    {key: 'CheckSheet', label: 'I-QA-003 (QC)', title: 'QC check sheet, 20 items a page'},
];

/**
 * Fill one of SMARTQC's Excel forms with these lines and download it.
 *
 * The lines go to the server as they are on screen, so the file matches what
 * was exported - unsaved balloon edits included. The server adds the header
 * (drawing number, revision, material) from the part and fills DSEFACTORY's
 * template with them (CheckSheetExcelReport).
 *
 * fetch + blob rather than a navigation: the request carries the lines, so it
 * has to be a POST with a body, and a Serenity service needs the CSRF header.
 */
export async function downloadCheckSheetExcel(serviceUrl: string, costingPartId: number,
                                              form: string, lines: CheckSheetLine[]): Promise<void> {
    const token = (document.cookie.match(/(?:^|; )CSRF-TOKEN=([^;]*)/) || [])[1];
    const res = await fetch(serviceUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? {'X-CSRF-TOKEN': decodeURIComponent(token)} : {}),
        },
        body: JSON.stringify({
            CostingPartId: costingPartId,
            Form: form,
            // SMARTQC's balloon conversion puts +tol in Remark1 and -tol in
            // Remark2; the report writes them to the same columns.
            Items: lines.map(l => ({
                Sequence: l.seq, CheckItemName: l.name, Symbol: l.symbol,
                PlusTol: l.upperTol, MinusTol: l.lowerTol, MethodName: l.method,
                IsCritical: false,
            })),
        }),
    });
    if (!res.ok) {
        let message = `the server answered HTTP ${res.status}`;
        try { message = (await res.json())?.Error?.Message || message; } catch { /* not JSON */ }
        throw new Error(message);
    }
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') || '';
    const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd)?.[1] || `CheckSheet_${form}.xlsx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = decodeURIComponent(name);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function openCheckSheet(container: HTMLElement, lines: CheckSheetLine[], opts: {
    unsaved?: boolean; onPick?: (id: string) => void;
    /** Called with a CHECK_SHEET_FORMS key; resolves when the file is on its way. */
    onExport?: (form: string) => Promise<void>;
} = {}): () => void {
    ensureCss();
    const measured = lines.filter(l => !l.note).length;
    const withLimits = lines.filter(l => l.lsl != null && l.usl != null).length;

    const overlay = document.createElement('div');
    overlay.className = 'ab-cs-overlay';
    overlay.innerHTML = `
      <div class="ab-cs-panel" role="dialog" aria-label="Check sheet">
        <div class="ab-cs-head">
          <strong class="ab-cs-title">Check sheet</strong>
          <span class="ab-cs-summary">${lines.length} check item${lines.length === 1 ? '' : 's'}
            · ${measured} measured · ${withLimits} with LSL/USL</span>
          <span class="ab-cs-hint">${opts.unsaved
              ? 'Includes changes not saved yet.'
              : 'From this drawing\'s balloons.'} Click a line to go to its balloon.</span>
          ${opts.onExport && lines.length ? `<span class="ab-cs-exports" role="group" aria-label="Export to Excel">
            ${CHECK_SHEET_FORMS.map(f => `<button type="button" class="ab-btn ab-cs-export" data-cs-form="${f.key}"
                title="${esc(f.title)}">&#128462; ${esc(f.label)}</button>`).join('')}
          </span>` : ''}
          <button type="button" class="ab-btn ab-cs-close" title="Close (Esc)">&#10005; Close</button>
        </div>
        <div class="ab-cs-body">${renderCheckSheetTable(lines)}</div>
      </div>`;

    const marker = document.createElement('div');
    marker.className = 'ab-modal-overlay ab-cs-marker';
    marker.hidden = true;

    const close = () => {
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        marker.remove();
    };
    const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') { e.stopPropagation(); close(); }
    };
    document.addEventListener('keydown', onKey, true);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.ab-cs-close')!.addEventListener('click', close);
    overlay.querySelectorAll('[data-cs-form]').forEach(btn => btn.addEventListener('click', async () => {
        const b = btn as HTMLButtonElement;
        const label = b.innerHTML;
        // Disabled while it builds, so a double click does not make two files.
        overlay.querySelectorAll<HTMLButtonElement>('[data-cs-form]').forEach(x => x.disabled = true);
        b.textContent = 'Exporting...';
        try {
            await opts.onExport!(b.dataset.csForm!);
        } finally {
            b.innerHTML = label;
            overlay.querySelectorAll<HTMLButtonElement>('[data-cs-form]').forEach(x => x.disabled = false);
        }
    }));
    overlay.querySelectorAll('tr[data-cs-id]').forEach(tr => tr.addEventListener('click', () => {
        const id = (tr as HTMLElement).dataset.csId!;
        close();
        opts.onPick?.(id);
    }));
    container.appendChild(marker);
    document.body.appendChild(overlay);
    return close;
}

function ensureCss() {
    if (document.getElementById('ab-checksheet-css')) return;
    const style = document.createElement('style');
    style.id = 'ab-checksheet-css';
    // SMARTQC's look: compact 24px-ish rows and the symbol in the Y14.5M GD&T
    // face at its .y145m size - 17px bold, whitespace kept - so a feature
    // control frame stored as CAD font text reads as the boxed frame.
    style.textContent = `
      .ab-cs-overlay { position: fixed; inset: 0; z-index: 1060;
        background: rgba(15, 23, 42, .45); display: flex; }
      .ab-cs-panel { margin: 14px; flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column;
        background: var(--bs-body-bg, #fff); color: var(--bs-body-color, #212529);
        border-radius: 10px; box-shadow: 0 18px 48px rgba(0,0,0,.28); overflow: hidden; }
      .ab-cs-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px;
        padding: 10px 14px; border-bottom: 1px solid var(--bs-border-color, #e5e7eb); }
      .ab-cs-title { font-size: 1rem; }
      .ab-cs-summary { font-size: .8rem; opacity: .75; }
      .ab-cs-hint { margin-left: auto; font-size: .78rem; font-style: italic; opacity: .7; }
      .ab-cs-close { padding: 2px 12px; }
      .ab-cs-exports { display: inline-flex; gap: 6px; }
      .ab-cs-export { padding: 2px 10px; font-size: .78rem; white-space: nowrap; }
      /* The body scrolls both ways; no inner wrapper, so the sticky header
         sticks to this box and stays in view while the rows scroll. */
      .ab-cs-body { flex: 1 1 auto; overflow: auto; }
      .ab-cs-table { width: 100%; border-collapse: collapse; font-size: .86rem; }
      .ab-cs-table th { position: sticky; top: 0; z-index: 2; text-align: left;
        padding: 5px 8px; font-size: .72rem; font-weight: 600; letter-spacing: .04em;
        text-transform: uppercase; white-space: nowrap;
        background: var(--bs-tertiary-bg, #f3f4f6); border-bottom: 1px solid var(--bs-border-color, #d1d5db); }
      .ab-cs-table td { padding: 3px 8px; white-space: nowrap;
        border-bottom: 1px solid var(--bs-border-color-translucent, #eef0f3); }
      .ab-cs-table .num { text-align: right; font-variant-numeric: tabular-nums; }
      .ab-cs-table tbody tr { cursor: pointer; }
      .ab-cs-table tbody tr:nth-child(even) td { background: rgba(127,127,127,.05); }
      .ab-cs-table tbody tr:hover td { background: rgba(37, 99, 235, .09); }
      .ab-cs-name { font-weight: 700; }
      .ab-cs-symcol { min-width: 200px; }
      .ab-cs-symbol { font-family: 'Y14_5M', 'Segoe UI Symbol', 'Cambria Math', sans-serif;
        font-size: 17px; font-weight: bold; white-space: pre !important;
        max-width: 560px; overflow: hidden; text-overflow: ellipsis; }
      /* The two numbers an inspector reads first. */
      .ab-cs-limit { font-weight: 700; }
      /* Notes and datums are check items too, but not measured ones. */
      .ab-cs-note td, .ab-cs-datum td { opacity: .6; }
      .ab-cs-datum .ab-cs-symbol { color: #c026d3; opacity: 1; }
      .ab-cs-empty { padding: 24px; opacity: .7; }`;
    document.head.appendChild(style);
}
