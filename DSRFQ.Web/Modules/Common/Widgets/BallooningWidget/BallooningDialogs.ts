/**
 * The ballooning widget's One Supply dialogs and its right-click menu, kept out
 * of the widget so it stays about drawing and editing. Every dialog here only
 * asks: it resolves with what the operator chose, or null for Cancel, and the
 * widget makes the change - so every change goes through its undo history.
 */

import { LookupEditor } from "@serenity-is/corelib";
import { InspectionToolsRow } from "@/ServerTypes/Master/InspectionToolsRow";
import {
    BubbleStyle, SHAPES, SIZE_PRESETS, STYLE_PRESETS, BalloonShape, BalloonStylePreset,
    resolveBalloonStyle, shapeSvg,
} from "./BallooningStyle";
import {
    DEFAULT_CATEGORY_ORDER, NUMBER_CATEGORIES, PdfExportOptions, QUICK_SYMBOLS,
    SymbolFilterSettings, categoryLabel,
} from "./BallooningFields";

export const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

interface ModalParts {
    overlay: HTMLElement;
    $: <T extends HTMLElement = HTMLElement>(sel: string) => T;
    close: () => void;
}

/** A modal in the widget's own style. Escape and the backdrop cancel. */
function openModal(container: HTMLElement, title: string, width: number, body: string, footer: string,
                   onCancel: () => void): ModalParts {
    const overlay = document.createElement('div');
    overlay.className = 'ab-modal-overlay';
    overlay.innerHTML = `
      <div class="ab-modal" role="dialog" aria-label="${esc(title)}" style="width:${width}px;">
        <div class="ab-modal-header">${esc(title)}</div>
        <div class="ab-modal-body">${body}</div>
        <div class="ab-modal-footer">${footer}</div>
      </div>`;
    const $ = <T extends HTMLElement = HTMLElement>(sel: string) => overlay.querySelector(sel) as T;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); cancel(); } };
    const close = () => { document.removeEventListener('keydown', key, true); overlay.remove(); };
    const cancel = () => { close(); onCancel(); };
    overlay.addEventListener('click', e => { if (e.target === overlay) cancel(); });
    document.addEventListener('keydown', key, true);
    container.appendChild(overlay);
    return { overlay, $, close };
}

// ── Bubble Settings ─────────────────────────────────────────────────────────

export interface BubbleSettingsResult {
    style: BubbleStyle;
    /** 'selection' writes onto the selected balloons; 'shop' changes the default. */
    scope: 'selection' | 'shop';
}

/** One Supply's 气泡设置: colours, shape, line width, arrow. */
export function bubbleSettingsDialog(container: HTMLElement, current: BubbleStyle, selected: number,
                                     canEditShop: boolean): Promise<BubbleSettingsResult | null> {
    return new Promise(resolve => {
        const body = `
          <p class="ab-modal-note">${selected
            ? `Applies to the ${selected} selected balloon${selected === 1 ? '' : 's'}, or save it as the shop default.`
            : 'The shop default: every balloon that has no style of its own follows it, on every drawing.'}</p>
          <div class="ab-bs-grid">
            <label>Border colour <input id="ab-bs-border" type="color" value="${esc(current.borderColor)}" /></label>
            <label>Number colour <input id="ab-bs-text" type="color" value="${esc(current.textColor)}" /></label>
            <label>Shape
              <select id="ab-bs-shape" class="ab-select">${SHAPES.map(s =>
                  `<option value="${s.key}" ${s.key === current.shape ? 'selected' : ''}>${s.label}</option>`).join('')}</select></label>
            <label>Line width
              <select id="ab-bs-width" class="ab-select">${[1, 2, 3, 4, 5].map(n =>
                  `<option value="${n}" ${n === current.lineWidth ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="ab-check"><input id="ab-bs-arrow" type="checkbox" ${current.showArrow ? 'checked' : ''} /> Arrowhead on the leader</label>
          </div>
          <div class="ab-bs-preview" id="ab-bs-preview"></div>`;
        const footer = `
          <button class="ab-btn" id="ab-bs-cancel">Cancel</button>
          <span style="flex:1;"></span>
          ${canEditShop ? '<button class="ab-btn" id="ab-bs-shop">Save as shop default</button>' : ''}
          ${selected ? `<button class="ab-btn ab-btn-primary" id="ab-bs-apply">Apply to ${selected}</button>` : ''}`;
        const m = openModal(container, 'Bubble settings', 440, body, footer, () => resolve(null));

        const read = (): BubbleStyle => ({
            borderColor: m.$<HTMLInputElement>('#ab-bs-border').value,
            textColor: m.$<HTMLInputElement>('#ab-bs-text').value,
            shape: m.$<HTMLSelectElement>('#ab-bs-shape').value as BalloonShape,
            lineWidth: Number(m.$<HTMLSelectElement>('#ab-bs-width').value),
            showArrow: m.$<HTMLInputElement>('#ab-bs-arrow').checked,
        });
        const paint = () => {
            const s = resolveBalloonStyle({}, read());
            m.$('#ab-bs-preview').innerHTML = `<svg viewBox="0 0 100 100" width="56" height="56">${shapeSvg(s)}
                <text x="50" y="${s.shape === 'triangle' ? 62 : 50}" fill="${s.text}" font-size="${s.shape === 'circle' || s.shape === 'solid' ? 44 : 32}"
                      font-family="sans-serif" text-anchor="middle" dominant-baseline="central">12</text></svg>`;
        };
        m.overlay.addEventListener('input', paint);
        m.overlay.addEventListener('change', paint);
        paint();
        m.$('#ab-bs-cancel').addEventListener('click', () => { m.close(); resolve(null); });
        m.$('#ab-bs-shop')?.addEventListener('click', () => { const style = read(); m.close(); resolve({ style, scope: 'shop' }); });
        m.$('#ab-bs-apply')?.addEventListener('click', () => { const style = read(); m.close(); resolve({ style, scope: 'selection' }); });
    });
}

// ── balloon size scope ──────────────────────────────────────────────────────

export interface SizeScopeResult {
    size: number;
    scope: 'new' | 'page' | 'all';
    reposition: 'none' | 'page' | 'all';
}

/** One Supply's 气泡大小与位置. */
export function sizeScopeDialog(container: HTMLElement, size: number): Promise<SizeScopeResult | null> {
    return new Promise(resolve => {
        const body = `
          <div class="ab-form-group">
            <label class="ab-label" for="ab-sz-value">Balloon size (%)</label>
            <input id="ab-sz-value" class="ab-input" type="number" min="10" max="500" step="10" value="${Math.round(size * 100)}" />
          </div>
          <fieldset class="ab-modal-group"><legend>Apply the size to</legend>
            <label class="ab-modal-radio"><input type="radio" name="ab-sz-scope" value="new" /><span><b>New balloons only</b><small>Existing balloons keep the size they have now.</small></span></label>
            <label class="ab-modal-radio"><input type="radio" name="ab-sz-scope" value="page" /><span><b>This page</b><small>Every balloon on the page, including ones sized by hand.</small></span></label>
            <label class="ab-modal-radio"><input type="radio" name="ab-sz-scope" value="all" checked /><span><b>Every page</b><small>The whole drawing; sizes set by hand are cleared.</small></span></label>
          </fieldset>
          <fieldset class="ab-modal-group"><legend>Re-position balloons beside their boxes</legend>
            <label class="ab-modal-radio"><input type="radio" name="ab-sz-pos" value="none" checked /><span><b>No</b></span></label>
            <label class="ab-modal-radio"><input type="radio" name="ab-sz-pos" value="page" /><span><b>This page</b></span></label>
            <label class="ab-modal-radio"><input type="radio" name="ab-sz-pos" value="all" /><span><b>Every page</b></span></label>
          </fieldset>`;
        const footer = `<button class="ab-btn" id="ab-sz-cancel">Cancel</button><span style="flex:1;"></span>
                        <button class="ab-btn ab-btn-primary" id="ab-sz-ok">Apply</button>`;
        const m = openModal(container, 'Balloon size and position', 440, body, footer, () => resolve(null));
        m.$('#ab-sz-cancel').addEventListener('click', () => { m.close(); resolve(null); });
        m.$('#ab-sz-ok').addEventListener('click', () => {
            const pct = Number(m.$<HTMLInputElement>('#ab-sz-value').value);
            if (!(pct >= 10 && pct <= 500)) { m.$<HTMLInputElement>('#ab-sz-value').focus(); return; }
            const pick = (name: string) => (m.overlay.querySelector(`input[name="${name}"]:checked`) as HTMLInputElement).value;
            m.close();
            resolve({ size: pct / 100, scope: pick('ab-sz-scope') as any, reposition: pick('ab-sz-pos') as any });
        });
    });
}

// ── clear scope ─────────────────────────────────────────────────────────────

/** One Supply's clear_scope: clear this page or the whole drawing. */
export function clearScopeDialog(
    container: HTMLElement, info: { page: number; onPage: number; total: number; pages: number }
): Promise<'page' | 'all' | null> {
    return new Promise(resolve => {
        const n = (v: number) => `${v} balloon${v === 1 ? '' : 's'}`;
        const body = `
          <p class="ab-modal-note">Balloons and masks are removed. Anything cleared by mistake comes back with Ctrl+Z,
             and nothing is final until you save.</p>
          <fieldset class="ab-modal-group"><legend>Clear</legend>
            <label class="ab-modal-radio"><input type="radio" name="ab-clr-scope" value="page" checked /><span><b>This page only (page ${info.page})</b><small>${n(info.onPage)}; every other page is left as it is.</small></span></label>
            <label class="ab-modal-radio"><input type="radio" name="ab-clr-scope" value="all" /><span><b>Every page (${info.pages})</b><small>${n(info.total)} across the whole drawing.</small></span></label>
          </fieldset>`;
        const footer = `<button class="ab-btn" id="ab-clr-cancel">Cancel</button><span style="flex:1;"></span>
                        <button class="ab-btn ab-btn-danger" id="ab-clr-ok">Clear</button>`;
        const m = openModal(container, 'Clear balloons', 420, body, footer, () => resolve(null));
        m.$('#ab-clr-cancel').addEventListener('click', () => { m.close(); resolve(null); });
        m.$('#ab-clr-ok').addEventListener('click', () => {
            const v = (m.overlay.querySelector('input[name="ab-clr-scope"]:checked') as HTMLInputElement).value;
            m.close();
            resolve(v === 'all' ? 'all' : 'page');
        });
    });
}

// ── number category order ───────────────────────────────────────────────────

/** One Supply's 设置序号排列顺序: renumbering walks the categories in this order. */
export function categoryOrderDialog(container: HTMLElement, order: string[]): Promise<string[] | null> {
    return new Promise(resolve => {
        let list = [...order];
        const body = `<p class="ab-modal-note">Renumbering numbers every balloon of the first category,
            on every page, before moving on to the next. Normal is where unmarked balloons go.</p>
            <ol class="ab-cat-list" id="ab-cat-list"></ol>`;
        const footer = `<button class="ab-btn" id="ab-cat-reset">Restore default</button><span style="flex:1;"></span>
                         <button class="ab-btn" id="ab-cat-cancel">Cancel</button>
                         <button class="ab-btn ab-btn-primary" id="ab-cat-ok">Save</button>`;
        const m = openModal(container, 'Number category order', 400, body, footer, () => resolve(null));
        const paint = () => {
            m.$('#ab-cat-list').innerHTML = list.map((k, i) => `
              <li><span>${esc(categoryLabel(k))}</span>
                <button class="ab-btn ab-btn-icon" data-up="${i}" ${i === 0 ? 'disabled' : ''} title="Earlier">&#9650;</button>
                <button class="ab-btn ab-btn-icon" data-down="${i}" ${i === list.length - 1 ? 'disabled' : ''} title="Later">&#9660;</button></li>`).join('');
        };
        m.overlay.addEventListener('click', e => {
            const t = (e.target as HTMLElement).closest('[data-up],[data-down]') as HTMLElement | null;
            if (!t) return;
            const i = Number(t.dataset.up ?? t.dataset.down);
            const j = t.dataset.up !== undefined ? i - 1 : i + 1;
            [list[i], list[j]] = [list[j], list[i]];
            paint();
        });
        paint();
        m.$('#ab-cat-reset').addEventListener('click', () => { list = [...DEFAULT_CATEGORY_ORDER]; paint(); });
        m.$('#ab-cat-cancel').addEventListener('click', () => { m.close(); resolve(null); });
        m.$('#ab-cat-ok').addEventListener('click', () => { m.close(); resolve(list); });
    });
}

// ── dimension symbol filter ─────────────────────────────────────────────────

/** One Supply's 尺寸符号过滤: symbols stripped from recognised text. */
export function symbolFilterDialog(container: HTMLElement, current: SymbolFilterSettings,
                                   affected: (symbols: string[]) => number):
    Promise<{ settings: SymbolFilterSettings; cleanExisting: boolean } | null> {
    return new Promise(resolve => {
        let symbols = [...current.symbols];
        const body = `
          <p class="ab-modal-note">Stripped from the text of balloons added by recognition. A letter
             such as x is only stripped where it touches a number, so MAX stays MAX.</p>
          <div class="ab-sym-pills" id="ab-sym-quick"></div>
          <div class="ab-modal-row" style="margin:8px 0;">
            <input id="ab-sym-new" class="ab-input" style="flex:1;" maxlength="10" placeholder="Add a symbol" />
            <button class="ab-btn" id="ab-sym-add">Add</button>
          </div>
          <div class="ab-sym-pills" id="ab-sym-list"></div>
          <p class="ab-modal-note" id="ab-sym-count"></p>`;
        const footer = `<button class="ab-btn" id="ab-sym-cancel">Cancel</button><span style="flex:1;"></span>
                        <button class="ab-btn" id="ab-sym-save">Save</button>
                        <button class="ab-btn ab-btn-primary" id="ab-sym-clean">Save &amp; clean existing</button>`;
        const m = openModal(container, 'Dimension symbol filter', 460, body, footer, () => resolve(null));
        const paint = () => {
            m.$('#ab-sym-quick').innerHTML = 'Quick add: ' + QUICK_SYMBOLS.filter(s => !symbols.includes(s))
                .map(s => `<button class="ab-pill" data-quick="${esc(s)}">${esc(s)}</button>`).join('');
            m.$('#ab-sym-list').innerHTML = symbols.length
                ? symbols.map(s => `<span class="ab-pill on">${esc(s)} <button data-del="${esc(s)}" title="Remove">&times;</button></span>`).join('')
                : '<em>No symbols filtered.</em>';
            const n = affected(symbols);
            m.$('#ab-sym-count').textContent = `${n} existing balloon${n === 1 ? '' : 's'} would change if cleaned.`;
        };
        const add = (s: string) => { s = s.trim(); if (s && !symbols.includes(s)) symbols.push(s); paint(); };
        m.overlay.addEventListener('click', e => {
            const t = e.target as HTMLElement;
            if (t.dataset.quick) add(t.dataset.quick);
            if (t.dataset.del) { symbols = symbols.filter(x => x !== t.dataset.del); paint(); }
        });
        m.$('#ab-sym-add').addEventListener('click', () => { add(m.$<HTMLInputElement>('#ab-sym-new').value); m.$<HTMLInputElement>('#ab-sym-new').value = ''; });
        m.$('#ab-sym-new').addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') m.$('#ab-sym-add').click(); });
        paint();
        m.$('#ab-sym-cancel').addEventListener('click', () => { m.close(); resolve(null); });
        m.$('#ab-sym-save').addEventListener('click', () => { m.close(); resolve({ settings: { symbols }, cleanExisting: false }); });
        m.$('#ab-sym-clean').addEventListener('click', () => { m.close(); resolve({ settings: { symbols }, cleanExisting: true }); });
    });
}

// ── grid ────────────────────────────────────────────────────────────────────

export interface GridEditResult {
    start: string;
    end: string;
    frame: 'keep' | 'select' | 'reset';
    recalc: boolean;
    allPages: boolean;
}

/** One Supply's 编辑网格分区: the sheet's corner cells and the frame it divides. */
export function gridEditDialog(container: HTMLElement, start: string, end: string, hasFrame: boolean,
                               parse: (s: string, e: string) => string | null): Promise<GridEditResult | null> {
    return new Promise(resolve => {
        const body = `
          <div class="ab-form-row">
            <div class="ab-form-group"><label class="ab-label" for="ab-ge-start">Start cell (top-left)</label>
              <input id="ab-ge-start" class="ab-input" value="${esc(start)}" placeholder="e.g. F8" /></div>
            <div class="ab-form-group"><label class="ab-label" for="ab-ge-end">End cell (bottom-right)</label>
              <input id="ab-ge-end" class="ab-input" value="${esc(end)}" placeholder="e.g. A1" /></div>
          </div>
          <p class="ab-modal-note" id="ab-ge-preview"></p>
          <fieldset class="ab-modal-group"><legend>Frame the grid divides</legend>
            <p class="ab-modal-note">Now: ${hasFrame ? 'a frame drawn on this page' : 'the whole page'}.</p>
            <label class="ab-modal-radio"><input type="radio" name="ab-ge-frame" value="keep" checked /><span><b>Keep</b></span></label>
            <label class="ab-modal-radio"><input type="radio" name="ab-ge-frame" value="select" /><span><b>Select the drawing border&hellip;</b><small>Drag a box round the printed frame after closing this.</small></span></label>
            <label class="ab-modal-radio"><input type="radio" name="ab-ge-frame" value="reset" /><span><b>Whole page</b></span></label>
          </fieldset>
          <label class="ab-label ab-check"><input id="ab-ge-recalc" type="checkbox" checked /> Re-file every balloon into its cell</label>
          <label class="ab-label ab-check"><input id="ab-ge-all" type="checkbox" /> Apply to every page</label>`;
        const footer = `<button class="ab-btn" id="ab-ge-cancel">Cancel</button><span style="flex:1;"></span>
                        <button class="ab-btn ab-btn-primary" id="ab-ge-ok">Apply</button>`;
        const m = openModal(container, 'Edit grid', 460, body, footer, () => resolve(null));
        const preview = () => {
            const s = m.$<HTMLInputElement>('#ab-ge-start').value.trim().toUpperCase();
            const e = m.$<HTMLInputElement>('#ab-ge-end').value.trim().toUpperCase();
            const p = parse(s, e);
            m.$('#ab-ge-preview').textContent = p ?? 'Enter two cells such as F8 and A1.';
            m.$<HTMLButtonElement>('#ab-ge-ok').disabled = !p;
        };
        m.overlay.addEventListener('input', preview);
        preview();
        m.$('#ab-ge-cancel').addEventListener('click', () => { m.close(); resolve(null); });
        m.$('#ab-ge-ok').addEventListener('click', () => {
            const frame = (m.overlay.querySelector('input[name="ab-ge-frame"]:checked') as HTMLInputElement).value as any;
            const r: GridEditResult = {
                start: m.$<HTMLInputElement>('#ab-ge-start').value.trim().toUpperCase(),
                end: m.$<HTMLInputElement>('#ab-ge-end').value.trim().toUpperCase(),
                frame,
                recalc: m.$<HTMLInputElement>('#ab-ge-recalc').checked,
                allPages: m.$<HTMLInputElement>('#ab-ge-all').checked,
            };
            m.close();
            resolve(r);
        });
    });
}

// ── PDF export filter ───────────────────────────────────────────────────────

/** One Supply's PDF导出标注设置. Resolves with the options to export with. */
export function pdfExportDialog(container: HTMLElement, current: PdfExportOptions,
                                counts: { reference: number; theoretical: number }):
    Promise<PdfExportOptions | null> {
    return new Promise(resolve => {
        const body = `
          <label class="ab-label ab-check"><input id="ab-pe-ref" type="checkbox" ${current.hideReference ? 'checked' : ''} />
            Hide reference balloons (${counts.reference})</label>
          <label class="ab-label ab-check"><input id="ab-pe-basic" type="checkbox" ${current.hideTheoretical ? 'checked' : ''} />
            Hide basic (theoretical) balloons (${counts.theoretical})</label>
          <p class="ab-modal-note">Hidden balloons are left out of the PDF and the rest are numbered
             without gaps in the file. The drawing itself keeps its numbers.</p>
          <label class="ab-label ab-check"><input id="ab-pe-qty" type="checkbox" ${current.showQuantity ? 'checked' : ''} />
            Print the quantity, (1-4), beside a balloon that covers several features</label>
          <label class="ab-label ab-check"><input id="ab-pe-ask" type="checkbox" ${current.askBeforeExport ? 'checked' : ''} />
            Ask before every PDF export</label>`;
        const footer = `<button class="ab-btn" id="ab-pe-cancel">Cancel</button><span style="flex:1;"></span>
                        <button class="ab-btn ab-btn-primary" id="ab-pe-ok">Export</button>`;
        const m = openModal(container, 'PDF export', 440, body, footer, () => resolve(null));
        m.$('#ab-pe-cancel').addEventListener('click', () => { m.close(); resolve(null); });
        m.$('#ab-pe-ok').addEventListener('click', () => {
            const r: PdfExportOptions = {
                hideReference: m.$<HTMLInputElement>('#ab-pe-ref').checked,
                hideTheoretical: m.$<HTMLInputElement>('#ab-pe-basic').checked,
                showQuantity: m.$<HTMLInputElement>('#ab-pe-qty').checked,
                askBeforeExport: m.$<HTMLInputElement>('#ab-pe-ask').checked,
            };
            m.close();
            resolve(r);
        });
    });
}

// ── default inspection tool ─────────────────────────────────────────────────

/** One Supply's 启用检测设备默认值: pre-filled on balloons added by hand or by area recognition. */
export function defaultToolDialog(container: HTMLElement, currentId: number | undefined):
    Promise<{ toolId: number | undefined } | null> {
    return new Promise(resolve => {
        const body = `
          <p class="ab-modal-note">Balloons you add - drawn, or read with Area or Single recognition -
             start with this tool. Leave empty for none.</p>
          <div class="ab-form-group"><div id="ab-dt-host"></div></div>
          <p class="ab-modal-note"><a href="/Master/InspectionTools" target="_blank" rel="noopener">Manage the inspection tool list&hellip;</a></p>`;
        const footer = `<button class="ab-btn" id="ab-dt-cancel">Cancel</button><span style="flex:1;"></span>
                        <button class="ab-btn ab-btn-primary" id="ab-dt-ok">Save</button>`;
        const m = openModal(container, 'Default inspection tool', 420, body, footer, () => resolve(null));
        const editor = new LookupEditor({
            element: el => m.$('#ab-dt-host').appendChild(el),
            lookupKey: InspectionToolsRow.lookupKey,
            filterField: 'IsActive', filterValue: '1', allowClear: true,
        } as any);
        if (currentId) editor.value = String(currentId);
        m.$('#ab-dt-cancel').addEventListener('click', () => { m.close(); resolve(null); });
        m.$('#ab-dt-ok').addEventListener('click', () => {
            const v = Number(editor.value);
            m.close();
            resolve({ toolId: Number.isFinite(v) && v > 0 ? v : undefined });
        });
    });
}

// ── the balloon right-click menu ────────────────────────────────────────────

export type BalloonMenuAction =
    | { kind: 'color'; value: string }
    | { kind: 'shape'; value: BalloonShape }
    | { kind: 'size'; value: number | null }
    | { kind: 'width'; value: number }
    | { kind: 'style'; value: BalloonStylePreset }
    | { kind: 'arrow'; value: boolean }
    | { kind: 'box'; value: boolean }
    | { kind: 'subNumber' }
    | { kind: 'restoreNumber' }
    | { kind: 'audit'; value: boolean }
    | { kind: 'delete' };

export interface BalloonMenuState {
    count: number;
    color: string;
    shape: BalloonShape;
    lineWidth: number;
    arrow: boolean;
    boxShown: boolean;
    isChild: boolean;
    audited: boolean;
}

/**
 * One Supply's bubble context menu, for one balloon or the whole selection.
 * Returns a function that closes it.
 */
export function openBalloonMenu(container: HTMLElement, clientX: number, clientY: number,
                                state: BalloonMenuState, onAction: (a: BalloonMenuAction) => void): () => void {
    const menu = document.createElement('div');
    menu.className = 'ab-menu ab-balloon-menu';
    menu.setAttribute('role', 'menu');
    const many = state.count > 1;
    const row = (label: string, inner: string) => `<div class="ab-bm-row"><span class="ab-bm-label">${label}</span><span class="ab-bm-opts">${inner}</span></div>`;
    menu.innerHTML = `
      <div class="ab-bm-head">${many ? `${state.count} balloons` : 'Balloon'}</div>
      ${row('Colour', `<input type="color" data-a="color" value="${esc(state.color)}" />`)}
      ${row('Shape', SHAPES.map(s => `<button class="ab-pill ${s.key === state.shape ? 'on' : ''}" data-a="shape" data-v="${s.key}" title="${s.label}">${
          s.key === 'circle' ? '&#9675;' : s.key === 'solid' ? '&#9679;' : s.key === 'star' ? '&#9733;' : '&#9651;'}</button>`).join(''))}
      ${row('Size', SIZE_PRESETS.map(p => `<button class="ab-pill" data-a="size" data-v="${p.scale ?? ''}" title="${p.label}">${
          p.key === 'auto' ? 'Auto' : p.label[0] + (p.key === 'xlarge' ? 'L' : '')}</button>`).join(''))}
      ${row('Line', [1, 2, 3, 4, 5].map(n => `<button class="ab-pill ${n === state.lineWidth ? 'on' : ''}" data-a="width" data-v="${n}">${n}</button>`).join(''))}
      ${row('Style', STYLE_PRESETS.map(p => `<button class="ab-pill" data-a="style" data-v="${p.key}" title="${p.label}"
          style="${p.color ? `color:${p.color};border-color:${p.color};` : ''}">${p.label}</button>`).join(''))}
      <div class="ab-menu-sep"></div>
      <label class="ab-menu-item"><input type="checkbox" data-a="arrow" ${state.arrow ? 'checked' : ''} /> Show arrow</label>
      <label class="ab-menu-item"><input type="checkbox" data-a="box" ${state.boxShown ? 'checked' : ''} /> Show recognition box</label>
      <label class="ab-menu-item"><input type="checkbox" data-a="audit" ${state.audited ? 'checked' : ''} /> Audited</label>
      <div class="ab-menu-sep"></div>
      ${many ? '' : (state.isChild
          ? '<button class="ab-menu-item" data-a="restoreNumber">Restore to a normal number</button>'
          : '<button class="ab-menu-item" data-a="subNumber">Set as sub-number&hellip; then click the parent</button>')}
      <button class="ab-menu-item ab-menu-danger" data-a="delete">Delete${many ? ` ${state.count} balloons` : ''}</button>`;

    container.appendChild(menu);
    const host = container.getBoundingClientRect();
    menu.style.position = 'fixed';
    const w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.left = `${Math.max(4, Math.min(clientX, window.innerWidth - w - 8))}px`;
    menu.style.top = `${Math.max(4, Math.min(clientY, window.innerHeight - h - 8))}px`;
    void host;

    const close = () => {
        document.removeEventListener('mousedown', away, true);
        document.removeEventListener('keydown', key, true);
        menu.remove();
    };
    const away = (e: Event) => { if (!menu.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    setTimeout(() => {
        document.addEventListener('mousedown', away, true);
        document.addEventListener('keydown', key, true);
    }, 0);

    const fire = (el: HTMLElement) => {
        const a = el.dataset.a, v = el.dataset.v;
        switch (a) {
            case 'shape': onAction({ kind: 'shape', value: v as BalloonShape }); break;
            case 'size': onAction({ kind: 'size', value: v ? Number(v) : null }); break;
            case 'width': onAction({ kind: 'width', value: Number(v) }); break;
            case 'style': onAction({ kind: 'style', value: v as BalloonStylePreset }); break;
            case 'subNumber': onAction({ kind: 'subNumber' }); break;
            case 'restoreNumber': onAction({ kind: 'restoreNumber' }); break;
            case 'delete': onAction({ kind: 'delete' }); break;
            default: return;
        }
        close();
    };
    menu.addEventListener('click', e => {
        const el = (e.target as HTMLElement).closest('button[data-a]') as HTMLElement | null;
        if (el) fire(el);
    });
    menu.addEventListener('change', e => {
        const el = e.target as HTMLInputElement;
        if (el.dataset.a === 'color') onAction({ kind: 'color', value: el.value });
        if (el.dataset.a === 'arrow') onAction({ kind: 'arrow', value: el.checked });
        if (el.dataset.a === 'box') onAction({ kind: 'box', value: el.checked });
        if (el.dataset.a === 'audit') onAction({ kind: 'audit', value: el.checked });
    });
    return close;
}

export { NUMBER_CATEGORIES };
