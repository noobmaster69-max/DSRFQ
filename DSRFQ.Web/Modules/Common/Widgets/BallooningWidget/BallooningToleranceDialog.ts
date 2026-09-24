/**
 * The Default Tol dialog. Port of One Supply's DefaultToleranceDialog
 * (ui/default_tolerance_dialog.py); the rules themselves are in
 * BallooningTolerance.ts and this file is only the editor around them.
 *
 * Laid out as One Supply lays it out: three tabs (custom schemes, ISO 2768-1,
 * ISO 2768-2), the exclusions under them, and two ways to commit - Apply,
 * which only fills balloons with no tolerance, and Update applied, which
 * recalculates the balloons an earlier apply of the same scheme filled.
 *
 * One addition: it counts before it writes. "312 of 444 would be filled" is a
 * decision an operator can make; a bulk edit reported afterwards is not.
 */

import { canEditShopSettings } from "./BallooningSettingsStore";
import {
    DecimalScheme, EXCLUSION_LABELS, ExclusionReason, GeomRule, IsoBand, IsoTables,
    Iso1Class, Iso2Class, IsoUnit, RangeRule, SCHEME_TYPE_LABELS, SchemeType,
    ToleranceCandidate, ToleranceProposal, ToleranceScheme, ToleranceTab,
    ensureAngleDegree, formatDecimalPlacesLabel, isoTablesFor, loadToleranceSettings,
    newScheme, parseDecimalPlacesLabel, proposeDefaultTolerances, proposeUpdateApplied,
    saveToleranceSettings, validateGeometricInput, validateToleranceInput,
} from "./BallooningTolerance";

export interface ToleranceDialogHost {
    /** Where the modal is mounted - the widget's own container. */
    container: HTMLElement;
    /** Every balloon on the drawing, all pages. Read fresh for each count. */
    annotations: () => ToleranceCandidate[];
    /** Write the result. `update` overwrites; `apply` only ever fills blanks. */
    commit: (proposals: ToleranceProposal[], kind: 'apply' | 'update') => void;
}

/** What a cell holds, which decides how it is validated. */
type CellKind = 'places' | 'num' | 'tol' | 'angtol' | 'gtol';

interface TableDef {
    id: string;
    title: string;
    cols: { label: string; kind: CellKind }[];
    /** Model -> editable strings. */
    read(): string[][];
    /** Editable strings -> model. Rows that do not parse are left out. */
    write(rows: string[][]): void;
    /** A new row, pre-filled where the next value is obvious. */
    blank(rows: string[][]): string[];
    /** ISO tables are the standard's rows: editable, but not add/remove. */
    fixed?: boolean;
}

const PLACEHOLDER: Record<CellKind, string> = {
    places: '0.00', num: '0', tol: '+0.1', angtol: '+1°', gtol: '0.05',
};

const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

const NUMBER = /^-?(\d+(\.\d*)?|\.\d+)$/;

export function openToleranceDialog(host: ToleranceDialogHost): void {
    const settings = loadToleranceSettings();
    let tables: IsoTables = isoTablesFor(settings.iso1Class, settings.iso2Class);
    const canSave = canEditShopSettings();

    /** The strings being edited, per table - kept apart from the model so a half-typed "1." survives. */
    let drafts: Record<string, string[][]> = {};
    let defs = new Map<string, TableDef>();
    let namerMode: 'new' | 'rename' | null = null;

    const cur = (): ToleranceScheme => settings.schemes[settings.currentScheme];

    // ── table definitions ───────────────────────────────────────────────

    const decimalDef = (id: string, title: string, key: 'decimalLinear' | 'decimalAngular'): TableDef => {
        const angle = key === 'decimalAngular';
        const tol: CellKind = angle ? 'angtol' : 'tol';
        return {
            id, title,
            cols: [{ label: 'Decimal places', kind: 'places' }, { label: 'Upper', kind: tol }, { label: 'Lower', kind: tol }],
            read: () => {
                const m = cur()[key];
                return Object.keys(m).filter(k => /^\d+$/.test(k)).map(Number).sort((a, b) => a - b)
                    .map(k => [formatDecimalPlacesLabel(k), m[String(k)].upper, m[String(k)].lower]);
            },
            write: rows => {
                const m: DecimalScheme = {};
                for (const [p, u, l] of rows) {
                    const n = parseDecimalPlacesLabel(p);
                    if (n === null) continue;
                    m[String(n)] = angle
                        ? { upper: ensureAngleDegree(u), lower: ensureAngleDegree(l) }
                        : { upper: String(u ?? '').trim(), lower: String(l ?? '').trim() };
                }
                cur()[key] = m;
            },
            blank: rows => {
                const used = rows.map(r => parseDecimalPlacesLabel(r[0])).filter(n => n !== null) as number[];
                return [formatDecimalPlacesLabel(used.length ? Math.max(...used) + 1 : 0), '', ''];
            },
        };
    };

    const rangeDef = (id: string, title: string, key: 'rangeLinear' | 'rangeAngular'): TableDef => {
        const angle = key === 'rangeAngular';
        const tol: CellKind = angle ? 'angtol' : 'tol';
        return {
            id, title,
            cols: [{ label: 'Over (>)', kind: 'num' }, { label: 'Up to (≤)', kind: 'num' },
                   { label: 'Upper', kind: tol }, { label: 'Lower', kind: tol }],
            read: () => cur()[key].map(r => [String(r.min), String(r.max), r.upper, r.lower]),
            write: rows => {
                cur()[key] = rows
                    .filter(r => NUMBER.test(String(r[0]).trim()) && NUMBER.test(String(r[1]).trim()))
                    .map(r => ({
                        min: parseFloat(r[0]), max: parseFloat(r[1]),
                        upper: angle ? ensureAngleDegree(r[2]) : String(r[2] ?? '').trim(),
                        lower: angle ? ensureAngleDegree(r[3]) : String(r[3] ?? '').trim(),
                    } as RangeRule));
            },
            blank: rows => [rows.length ? rows[rows.length - 1][1] : '0', '', '', ''],
        };
    };

    const geomDef = (id: string, title: string, key: 'geomSf' | 'geomPerp' | 'geomSym', length: string): TableDef => ({
        id, title,
        cols: [{ label: `${length} over`, kind: 'num' }, { label: 'up to', kind: 'num' }, { label: 'Tolerance', kind: 'gtol' }],
        read: () => cur()[key].map(r => [String(r.min), String(r.max), String(r.tol)]),
        write: rows => {
            cur()[key] = rows
                .filter(r => NUMBER.test(String(r[0]).trim()) && NUMBER.test(String(r[1]).trim())
                    && validateGeometricInput(r[2]))
                .map(r => ({ min: parseFloat(r[0]), max: parseFloat(r[1]), tol: parseFloat(r[2]) } as GeomRule));
        },
        blank: rows => [rows.length ? rows[rows.length - 1][1] : '0', '', ''],
    });

    const isoDef = (id: string, title: string, key: 'linear' | 'angular' | 'sf' | 'perp' | 'sym',
                    length: string, tolLabel: string): TableDef => ({
        id, title, fixed: true,
        cols: [{ label: `${length} over`, kind: 'num' }, { label: 'up to', kind: 'num' }, { label: tolLabel, kind: 'gtol' }],
        read: () => tables[key].map(([lo, hi, t]) => [String(lo), String(hi), String(t)]),
        write: rows => {
            tables[key] = rows
                .filter(r => NUMBER.test(String(r[0]).trim()) && NUMBER.test(String(r[1]).trim())
                    && validateGeometricInput(r[2]))
                .map(r => [parseFloat(r[0]), parseFloat(r[1]), parseFloat(r[2])] as IsoBand);
        },
        blank: () => ['', '', ''],
    });

    function customDefs(): TableDef[] {
        const s = cur();
        if (!s) return [];
        const decLin = decimalDef('decLin', 'Linear (diameters and plain sizes)', 'decimalLinear');
        const decAng = decimalDef('decAng', 'Angles', 'decimalAngular');
        const rngLin = rangeDef('rngLin', 'Linear size ranges', 'rangeLinear');
        const rngAng = rangeDef('rngAng', 'Angle ranges', 'rangeAngular');
        switch (s.type) {
            case 'decimal': return [decLin, decAng];
            case 'range': return [rngLin, rngAng];
            case 'mixed': return [rngLin, rngAng, decLin, decAng];
            case 'geometric': return [
                geomDef('geoSf', 'Straightness / flatness', 'geomSf', 'Length'),
                geomDef('geoPerp', 'Perpendicularity', 'geomPerp', 'Shorter side'),
                geomDef('geoSym', 'Symmetry', 'geomSym', 'Longer feature'),
            ];
        }
    }

    const iso1Defs = (): TableDef[] => [
        isoDef('isoLin', 'Linear sizes (mm)', 'linear', 'Nominal', '± mm'),
        isoDef('isoAng', 'Angles', 'angular', 'Shorter side (mm)', '± °'),
    ];
    const iso2Defs = (): TableDef[] => [
        isoDef('isoSf', 'Straightness / flatness (mm)', 'sf', 'Length', 'Tolerance mm'),
        isoDef('isoPerp', 'Perpendicularity (mm)', 'perp', 'Shorter side', 'Tolerance mm'),
        isoDef('isoSym', 'Symmetry (mm)', 'sym', 'Longer feature', 'Tolerance mm'),
    ];

    // ── markup ──────────────────────────────────────────────────────────

    const unitSelect = (id: string) => `
        <label class="ab-tol-inline">Drawing unit
          <select id="${id}" class="ab-select">
            <option value="inch">Inch</option><option value="mm">Millimetre</option>
          </select></label>`;

    const overlay = document.createElement('div');
    overlay.className = 'ab-modal-overlay';
    overlay.innerHTML = `
      <div class="ab-modal ab-tol-modal" role="dialog" aria-label="Default tolerance">
        <div class="ab-modal-header">Default (general) tolerance</div>
        <div class="ab-tol-tabs" role="tablist">
          <button type="button" class="ab-tol-tab" data-tab="custom" role="tab">Custom schemes</button>
          <button type="button" class="ab-tol-tab" data-tab="iso1" role="tab">ISO 2768-1 (linear / angular)</button>
          <button type="button" class="ab-tol-tab" data-tab="iso2" role="tab">ISO 2768-2 (geometric)</button>
        </div>
        <div class="ab-modal-body">
          ${canSave ? '' : `<p class="ab-tol-warn">Schemes are shared by the whole shop and only an
             administrator can change them. Edits you make here are used for this apply only.</p>`}

          <section data-pane="custom">
            <div class="ab-tol-bar">
              <label for="ab-tol-scheme">Scheme</label>
              <select id="ab-tol-scheme" class="ab-select"></select>
              <span id="ab-tol-type" class="ab-tol-badge"></span>
              <span class="ab-tol-actions">
                <button type="button" id="ab-tol-new" class="ab-btn">New</button>
                <button type="button" id="ab-tol-rename" class="ab-btn">Rename</button>
                <button type="button" id="ab-tol-save" class="ab-btn">Save</button>
                <button type="button" id="ab-tol-delete" class="ab-btn">Delete</button>
              </span>
            </div>
            <div id="ab-tol-namer" class="ab-tol-namer" hidden>
              <select id="ab-tol-new-type" class="ab-select">
                <option value="decimal">${SCHEME_TYPE_LABELS.decimal} &mdash; by how many places are written</option>
                <option value="range">${SCHEME_TYPE_LABELS.range} &mdash; by the size of the value</option>
                <option value="geometric">${SCHEME_TYPE_LABELS.geometric} &mdash; flatness, perpendicularity, symmetry, runout</option>
              </select>
              <input id="ab-tol-new-name" class="ab-input" placeholder="Scheme name" maxlength="60" />
              <button type="button" id="ab-tol-new-ok" class="ab-btn ab-btn-primary">Create</button>
              <button type="button" id="ab-tol-new-cancel" class="ab-btn">Cancel</button>
              <span id="ab-tol-new-err" class="ab-tol-error"></span>
            </div>
            <div id="ab-tol-custom-body"></div>
            <span id="ab-tol-saved" class="ab-tol-ok"></span>
          </section>

          <section data-pane="iso1" hidden>
            <div class="ab-tol-bar">
              <label class="ab-tol-inline">Class
                <select id="ab-tol-c1" class="ab-select">
                  <option value="f">f &mdash; fine</option><option value="m">m &mdash; medium</option>
                  <option value="c">c &mdash; coarse</option><option value="v">v &mdash; very coarse</option>
                </select></label>
              ${unitSelect('ab-tol-unit')}
            </div>
            <p class="ab-tol-warn ab-tol-unit-warn"></p>
            <div id="ab-tol-iso1-body" class="ab-tol-grid"></div>
          </section>

          <section data-pane="iso2" hidden>
            <div class="ab-tol-bar">
              <label class="ab-tol-inline">Class
                <select id="ab-tol-c2" class="ab-select">
                  <option value="H">H &mdash; fine</option><option value="K">K &mdash; medium</option>
                  <option value="L">L &mdash; coarse</option>
                </select></label>
              ${unitSelect('ab-tol-unit2')}
            </div>
            <p class="ab-tol-warn ab-tol-unit-warn"></p>
            <div id="ab-tol-iso2-body"></div>
          </section>

          <p class="ab-modal-note ab-tol-iso-note" hidden>The standard's values. Edits here apply to
             this run only; reopening shows the standard again. For numbers of your own, make a scheme.</p>

          <fieldset class="ab-modal-group">
            <legend>Exclusions &mdash; ticked kinds never receive a default tolerance</legend>
            <div class="ab-tol-excl">
              <label><input type="checkbox" data-ex="geometric" /> GD&amp;T frames, surface finish and datum markers (&perp; &par; &#x2316; &#x25CB; Ra Rz &#x25B2;)</label>
              <label><input type="checkbox" data-ex="notes" /> Notes</label>
              <label><input type="checkbox" data-ex="theoretical" /> Basic dimensions (BSC, BASIC, or a boxed value read as [1.250])</label>
              <label><input type="checkbox" data-ex="reference" /> Reference dimensions &mdash; (50), (&Oslash;10), 50 REF</label>
              <label><input type="checkbox" data-ex="fastener" /> Fastener part numbers and install notes (NAS/MS/AN&hellip;, INSTALL, TORQUE)</label>
            </div>
          </fieldset>

          <details class="ab-tol-rules">
            <summary>How applying works</summary>
            <ul>
              <li><b>Apply</b> fills only balloons with no tolerance. A tolerance already on a balloon is never overwritten.</li>
              <li><b>Update applied</b> recalculates, and overwrites, every balloon on this drawing that was filled
                  from the scheme or ISO part now shown - so a corrected scheme can be pushed to them. A tolerance
                  typed by hand loses its label and is never touched.</li>
              <li>Upper takes a +, lower a &minus; (+0.1 / -0.1). A symmetric pair may be typed without signs:
                  1 and 1 is &plusmn;1.</li>
              <li>Angle tolerances may be typed without &deg;; it is added.</li>
              <li>Decimal places: 0 is a whole number, 0.0 one place, 0.00 two. A value with more places than
                  the widest row uses the widest; a row removed from the middle means "no default there".</li>
              <li>Size ranges run over (exclusive) to up to (inclusive). A value at or below the first row's
                  start takes the first row; a value past the last row gets nothing.</li>
              <li>ISO and geometric tables take plain numbers; the &plusmn; is added. ISO bands are
                  millimetres: on an inch drawing the value is converted to find its band and the tolerance
                  converted back.</li>
            </ul>
          </details>

          <div id="ab-tol-preview" class="ab-kw-hits"></div>
          <div id="ab-tol-error" class="ab-tol-error"></div>
        </div>
        <div class="ab-modal-footer">
          <button type="button" id="ab-modal-cancel" class="ab-btn">Cancel</button>
          <button type="button" id="ab-tol-update" class="ab-btn ab-tol-btn-update"
                  title="Recalculate and overwrite the balloons this scheme or ISO part filled earlier. Hand-typed tolerances are not affected.">Update applied</button>
          <button type="button" id="ab-tol-apply" class="ab-btn ab-btn-primary">Apply</button>
        </div>
      </div>`;

    const $ = <T extends HTMLElement = HTMLElement>(sel: string) => overlay.querySelector(sel) as T;
    const $$ = (sel: string) => Array.from(overlay.querySelectorAll(sel)) as HTMLElement[];

    // ── painting ────────────────────────────────────────────────────────

    const cellInput = (def: TableDef, r: number, c: number, value: string) =>
        `<input class="ab-input" data-t="${def.id}" data-r="${r}" data-c="${c}"
                value="${esc(value)}" placeholder="${PLACEHOLDER[def.cols[c].kind]}" />`;

    function tableHtml(def: TableDef): string {
        defs.set(def.id, def);
        const rows = drafts[def.id] ?? (drafts[def.id] = def.read());
        const width = def.cols.length + (def.fixed ? 0 : 1);
        const body = rows.length
            ? rows.map((row, r) => `<tr>${def.cols.map((_, c) => `<td>${cellInput(def, r, c, row[c] ?? '')}</td>`).join('')}${
                def.fixed ? '' : `<td><button type="button" class="ab-tol-x" data-del="${def.id}" data-r="${r}"
                                        title="Remove this row">&times;</button></td>`}</tr>`).join('')
            : `<tr><td colspan="${width}" class="ab-tol-empty">No rows &mdash; nothing is defaulted from this table.</td></tr>`;
        return `
          <div class="ab-tol-block">
            <div class="ab-tol-block-head"><b>${esc(def.title)}</b>${
                def.fixed ? '' : `<button type="button" class="ab-tol-add" data-add="${def.id}">+ Add row</button>`}</div>
            <table class="ab-tol-table ab-tol-edit">
              <thead><tr>${def.cols.map(c => `<th>${esc(c.label)}</th>`).join('')}${def.fixed ? '' : '<th></th>'}</tr></thead>
              <tbody>${body}</tbody>
            </table>
          </div>`;
    }

    function paintSchemeBar() {
        const sel = $<HTMLSelectElement>('#ab-tol-scheme');
        sel.innerHTML = Object.keys(settings.schemes)
            .map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
        sel.value = settings.currentScheme;
        const s = cur();
        $('#ab-tol-type').textContent = s ? `[${SCHEME_TYPE_LABELS[s.type]}]` : '';
        for (const id of ['#ab-tol-new', '#ab-tol-rename', '#ab-tol-save', '#ab-tol-delete'])
            ($(id) as HTMLButtonElement).disabled = !canSave;
    }

    function paintCustom() {
        const s = cur();
        const list = customDefs();
        const body = $('#ab-tol-custom-body');
        if (!s) { body.innerHTML = ''; return; }
        const grid = s.type === 'decimal';
        body.innerHTML = (grid ? `<div class="ab-tol-grid">${list.map(tableHtml).join('')}</div>` : list.map(tableHtml).join(''))
            + (s.type === 'geometric' ? `
              <label class="ab-tol-inline">Runout (circular and total)
                <input id="ab-tol-g-runout" class="ab-input ab-tol-num" value="${esc(s.geomRunout)}"
                       placeholder="0.2" /></label>` : '');
    }

    function paintIso() {
        $('#ab-tol-iso1-body').innerHTML = iso1Defs().map(tableHtml).join('');
        $('#ab-tol-iso2-body').innerHTML = iso2Defs().map(tableHtml).join('') + `
            <label class="ab-tol-inline">Runout (circular and total), mm
              <input id="ab-tol-i-runout" class="ab-input ab-tol-num" value="${esc(tables.runout)}" /></label>`;
    }

    function paintTabs() {
        $$('.ab-tol-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === settings.tab));
        $$('section[data-pane]').forEach(p => p.hidden = p.dataset.pane !== settings.tab);
        $('.ab-tol-iso-note').hidden = settings.tab === 'custom';
        $<HTMLButtonElement>('#ab-tol-update').textContent = settings.tab === 'custom'
            ? 'Update applied' : `Update applied ${settings.tab === 'iso1' ? 'ISO 2768-1' : 'ISO 2768-2'}`;
    }

    function paintUnit() {
        $<HTMLSelectElement>('#ab-tol-unit').value = settings.unit;
        $<HTMLSelectElement>('#ab-tol-unit2').value = settings.unit;
        // Said plainly, because it is the one way to use this feature and get
        // a confidently wrong answer.
        const warn = settings.unit === 'inch'
            ? `ISO 2768 is a metric standard. Inch nominals are converted to millimetres to find their
               band and the result converted back, so the numbers are right - but an inch drawing
               usually means its title block, which is a decimal-places scheme.`
            : '';
        $$('.ab-tol-unit-warn').forEach(p => { p.textContent = warn; p.hidden = !warn; });
    }

    /** Scope of the visible tab's tables, for validation. */
    function visibleDefs(): TableDef[] {
        const ids = settings.tab === 'custom' ? customDefs().map(d => d.id)
            : settings.tab === 'iso1' ? ['isoLin', 'isoAng'] : ['isoSf', 'isoPerp', 'isoSym'];
        return ids.map(id => defs.get(id)).filter(Boolean) as TableDef[];
    }

    /** Mark bad cells; true when the visible tab can be applied. */
    function validate(): boolean {
        let ok = true;
        const mark = (el: HTMLElement | null, good: boolean) => {
            el?.classList.toggle('ab-invalid', !good);
            if (!good) ok = false;
        };
        for (const def of visibleDefs()) {
            const rows = drafts[def.id] ?? [];
            const seen = new Set<number>();
            rows.forEach((row, r) => {
                def.cols.forEach((col, c) => {
                    const v = String(row[c] ?? '').trim();
                    let good: boolean;
                    switch (col.kind) {
                        case 'places': {
                            const n = parseDecimalPlacesLabel(v);
                            good = n !== null && !seen.has(n);
                            if (n !== null) seen.add(n);
                            break;
                        }
                        case 'num': good = NUMBER.test(v); break;
                        case 'tol': good = !v || validateToleranceInput(v, false); break;
                        case 'angtol': good = !v || validateToleranceInput(v, true); break;
                        case 'gtol': good = validateGeometricInput(v); break;
                    }
                    // A range that ends before it starts matches nothing, silently.
                    if (good && col.kind === 'num' && c === 1 && def.cols[0].kind === 'num'
                        && NUMBER.test(String(row[0]).trim()))
                        good = parseFloat(v) > parseFloat(row[0]);
                    mark(overlay.querySelector(`input[data-t="${def.id}"][data-r="${r}"][data-c="${c}"]`), good);
                });
            });
        }
        if (settings.tab === 'custom' && cur()?.type === 'geometric') {
            const el = $<HTMLInputElement>('#ab-tol-g-runout');
            mark(el, !el || validateGeometricInput(el.value));
        }
        if (settings.tab === 'iso2') {
            const el = $<HTMLInputElement>('#ab-tol-i-runout');
            mark(el, !el || validateGeometricInput(el.value));
        }
        return ok;
    }

    function preview() {
        const ok = validate();
        const annotations = host.annotations();
        const apply = proposeDefaultTolerances(annotations, settings, tables);
        const update = proposeUpdateApplied(annotations, settings, tables);
        const n = apply.proposals.length;
        const excluded = (Object.keys(apply.excluded) as ExclusionReason[])
            .filter(k => apply.excluded[k] > 0)
            .map(k => `${apply.excluded[k]} ${EXCLUSION_LABELS[k]}`);

        $('#ab-tol-preview').innerHTML = `
            <b>${n}</b> balloon${n === 1 ? '' : 's'} would be filled in${apply.standard
                ? ` from <b>${esc(apply.standard)}</b>` : ''}.
            <span>${apply.skippedHasTolerance} already have a tolerance</span>
            ${excluded.length ? `<span>Excluded: ${esc(excluded.join(', '))}</span>` : ''}
            ${apply.skippedNotCovered ? `<span>${apply.skippedNotCovered} not something this ${
                settings.tab === 'custom' ? 'scheme' : 'part of the standard'} covers</span>` : ''}
            <span>${apply.skippedNoRule} no rule matched</span>
            <span>${update.matched
                ? `Update applied: ${update.matched} balloon${update.matched === 1 ? '' : 's'} carry this label, `
                  + `${update.changed} would change${update.unmatched ? `, ${update.unmatched} no longer match a rule and would be left` : ''}.`
                : 'Update applied: no balloon on this drawing was filled from this yet.'}</span>`;

        $<HTMLButtonElement>('#ab-tol-apply').disabled = !ok || n === 0;
        $<HTMLButtonElement>('#ab-tol-update').disabled = !ok || update.proposals.length === 0;
        $('#ab-tol-error').textContent = ok ? '' : 'Fix the highlighted cells first.';
        return { apply, update };
    }

    function repaintAll() {
        paintTabs();
        paintSchemeBar();
        paintCustom();
        paintIso();
        paintUnit();
        preview();
    }

    const persist = (): boolean => {
        if (!canSave) return false;
        saveToleranceSettings(settings);
        return true;
    };

    // ── events ──────────────────────────────────────────────────────────

    overlay.addEventListener('input', (e: any) => {
        const el = e.target as HTMLInputElement;
        const t = el.dataset?.t;
        if (t && defs.has(t)) {
            const r = +el.dataset.r!, c = +el.dataset.c!;
            drafts[t][r][c] = el.value;
            defs.get(t)!.write(drafts[t]);
        } else if (el.id === 'ab-tol-g-runout') {
            if (validateGeometricInput(el.value)) cur().geomRunout = parseFloat(el.value);
        } else if (el.id === 'ab-tol-i-runout') {
            if (validateGeometricInput(el.value)) tables.runout = parseFloat(el.value);
        } else {
            return;
        }
        $('#ab-tol-saved').textContent = '';
        preview();
    });

    overlay.addEventListener('click', (e: any) => {
        const target = e.target as HTMLElement;
        if (target === overlay) { close(); return; }

        const add = target.closest('[data-add]') as HTMLElement | null;
        const del = target.closest('[data-del]') as HTMLElement | null;
        if (add || del) {
            const id = (add ?? del)!.dataset[add ? 'add' : 'del']!;
            const def = defs.get(id);
            if (!def) return;
            if (add) drafts[id].push(def.blank(drafts[id]));
            else drafts[id].splice(+del!.dataset.r!, 1);
            def.write(drafts[id]);
            if (settings.tab === 'custom') paintCustom(); else paintIso();
            preview();
            if (add) (overlay.querySelector(`input[data-t="${id}"][data-r="${drafts[id].length - 1}"][data-c="0"]`) as HTMLInputElement)?.focus();
            return;
        }

        const tab = target.closest('.ab-tol-tab') as HTMLElement | null;
        if (tab) {
            settings.tab = tab.dataset.tab as ToleranceTab;
            paintTabs();
            preview();
        }
    });

    overlay.addEventListener('change', (e: any) => {
        const el = e.target as HTMLInputElement;
        const ex = el.dataset?.ex as ExclusionReason | undefined;
        if (ex) {
            settings.exclude[ex] = el.checked;
            preview();
        }
    });

    $('#ab-tol-scheme').addEventListener('change', (e: any) => {
        settings.currentScheme = e.target.value;
        drafts = {};
        paintSchemeBar();
        paintCustom();
        preview();
    });

    const namer = $('#ab-tol-namer');
    const openNamer = (mode: 'new' | 'rename') => {
        namerMode = mode;
        namer.hidden = false;
        $('#ab-tol-new-type').hidden = mode === 'rename';
        $<HTMLButtonElement>('#ab-tol-new-ok').textContent = mode === 'new' ? 'Create' : 'Rename';
        const input = $<HTMLInputElement>('#ab-tol-new-name');
        input.value = mode === 'rename' ? settings.currentScheme : '';
        $('#ab-tol-new-err').textContent = '';
        input.focus();
        input.select();
    };
    const closeNamer = () => { namer.hidden = true; namerMode = null; };

    $('#ab-tol-new').addEventListener('click', () => openNamer('new'));
    $('#ab-tol-rename').addEventListener('click', () => openNamer('rename'));
    $('#ab-tol-new-cancel').addEventListener('click', closeNamer);
    $('#ab-tol-new-name').addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); $('#ab-tol-new-ok').click(); }
    });
    $('#ab-tol-new-ok').addEventListener('click', () => {
        const name = $<HTMLInputElement>('#ab-tol-new-name').value.trim();
        const err = $('#ab-tol-new-err');
        if (!name) { err.textContent = 'Give it a name.'; return; }
        if (namerMode === 'rename' && name === settings.currentScheme) { closeNamer(); return; }
        if (settings.schemes[name]) { err.textContent = 'A scheme with that name exists.'; return; }

        if (namerMode === 'new') {
            const type = $<HTMLSelectElement>('#ab-tol-new-type').value as SchemeType;
            settings.schemes[name] = newScheme(type);
        } else {
            // Rebuilt in order so the renamed scheme keeps its place in the list.
            const next: Record<string, ToleranceScheme> = {};
            for (const [n, s] of Object.entries(settings.schemes))
                next[n === settings.currentScheme ? name : n] = s;
            settings.schemes = next;
        }
        settings.currentScheme = name;
        drafts = {};
        closeNamer();
        persist();
        paintSchemeBar();
        paintCustom();
        preview();
    });

    $('#ab-tol-delete').addEventListener('click', () => {
        const names = Object.keys(settings.schemes);
        if (names.length <= 1) {
            $('#ab-tol-error').textContent = 'At least one scheme has to remain.';
            return;
        }
        if (!confirm(`Delete the scheme "${settings.currentScheme}" for the whole shop?\n\n`
            + 'Balloons already filled from it keep their values, but "Update applied" will no longer find them.'))
            return;
        delete settings.schemes[settings.currentScheme];
        settings.currentScheme = Object.keys(settings.schemes)[0];
        drafts = {};
        persist();
        paintSchemeBar();
        paintCustom();
        preview();
    });

    $('#ab-tol-save').addEventListener('click', () => {
        if (!validate()) { $('#ab-tol-error').textContent = 'Fix the highlighted cells first.'; return; }
        if (persist()) $('#ab-tol-saved').textContent = `Saved "${settings.currentScheme}" for the shop.`;
    });

    $('#ab-tol-c1').addEventListener('change', (e: any) => {
        settings.iso1Class = e.target.value as Iso1Class;
        const fresh = isoTablesFor(settings.iso1Class, settings.iso2Class);
        tables.linear = fresh.linear;
        tables.angular = fresh.angular;
        delete drafts.isoLin;
        delete drafts.isoAng;
        paintIso();
        preview();
    });
    $('#ab-tol-c2').addEventListener('change', (e: any) => {
        settings.iso2Class = e.target.value as Iso2Class;
        const fresh = isoTablesFor(settings.iso1Class, settings.iso2Class);
        tables.sf = fresh.sf;
        tables.perp = fresh.perp;
        tables.sym = fresh.sym;
        tables.runout = fresh.runout;
        delete drafts.isoSf;
        delete drafts.isoPerp;
        delete drafts.isoSym;
        paintIso();
        preview();
    });
    for (const id of ['#ab-tol-unit', '#ab-tol-unit2']) {
        $(id).addEventListener('change', (e: any) => {
            settings.unit = e.target.value as IsoUnit;
            paintUnit();
            preview();
        });
    }

    const commit = (kind: 'apply' | 'update') => {
        if (!validate()) { $('#ab-tol-error').textContent = 'Fix the highlighted cells first.'; return; }
        const { apply, update } = preview();
        const proposals = kind === 'apply' ? apply.proposals : update.proposals;
        if (!proposals.length) return;
        // Saved on commit, as One Supply does, so the scheme a balloon's label
        // names is the scheme that produced it.
        persist();
        close();
        host.commit(proposals, kind);
    };
    $('#ab-tol-apply').addEventListener('click', () => commit('apply'));
    $('#ab-tol-update').addEventListener('click', () => commit('update'));
    $('#ab-modal-cancel').addEventListener('click', () => close());

    const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && overlay.isConnected) {
            if (!namer.hidden) closeNamer(); else close();
        }
    };
    document.addEventListener('keydown', onKey);

    function close() {
        document.removeEventListener('keydown', onKey);
        overlay.remove();
    }

    // ── initial state ───────────────────────────────────────────────────

    $<HTMLSelectElement>('#ab-tol-c1').value = settings.iso1Class;
    $<HTMLSelectElement>('#ab-tol-c2').value = settings.iso2Class;
    $$('input[data-ex]').forEach(el =>
        (el as HTMLInputElement).checked = !!settings.exclude[(el as HTMLInputElement).dataset.ex as ExclusionReason]);

    repaintAll();
    host.container.appendChild(overlay);
}
