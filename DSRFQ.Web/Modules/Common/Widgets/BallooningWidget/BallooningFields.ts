/**
 * One Supply's per-balloon fields that DSRFQ lacked, and the small rules
 * around them: dimension feature, number category (序号排列), quantity input,
 * tolerance pulled out of the dimension text, export mode, the dimension
 * symbol filter, the PDF export filter, GD&T group sorting and the audit walk.
 */

import { getSetting, setSetting } from "./BallooningSettingsStore";
import type { BalloonAnnotation, Rect } from "./BallooningTypes";
import { compareBalloonNumber } from "./BallooningNumbering";
import { geometricGlyph, isReferenceForTolerance, isTheoreticalDimension } from "./BallooningTolerance";

// ── dimension feature ───────────────────────────────────────────────────────

/** '' is an ordinary dimension. */
export type DimensionFeature = '' | 'theoretical' | 'reference';

export const DIMENSION_FEATURES: { key: DimensionFeature; label: string }[] = [
    { key: '', label: 'None' },
    { key: 'theoretical', label: 'Theoretical (basic)' },
    { key: 'reference', label: 'Reference' },
];

/** Marked by hand, or read off the text - "(50)", "50 REF", "1.250 BSC". */
export function isReferenceBalloon(a: { dimensionFeature?: string; content?: string }): boolean {
    return a.dimensionFeature === 'reference' || (!a.dimensionFeature && isReferenceForTolerance(a.content));
}

export function isTheoreticalBalloon(a: { dimensionFeature?: string; content?: string }): boolean {
    return a.dimensionFeature === 'theoretical' || (!a.dimensionFeature && isTheoreticalDimension(a.content));
}

// ── number category ─────────────────────────────────────────────────────────

export const NUMBER_CATEGORIES: { key: string; label: string }[] = [
    { key: 'notes', label: 'Technical requirements' },
    { key: 'eqn', label: 'EQN (equations)' },
    { key: 'start', label: 'Start' },
    { key: 'normal', label: 'Normal' },
    { key: 'bom', label: 'BOM' },
    { key: 'parts', label: 'Parts list' },
    { key: 'eco', label: 'ECO' },
    { key: 'end', label: 'End' },
];

export const DEFAULT_CATEGORY_ORDER = NUMBER_CATEGORIES.map(c => c.key);

export const categoryLabel = (key: string | undefined) =>
    NUMBER_CATEGORIES.find(c => c.key === (key || 'normal'))?.label ?? key ?? 'Normal';

/** A permutation of every category; unknown keys dropped, missing ones appended. */
export function normalizeCategoryOrder(order: unknown): string[] {
    const keys = Array.isArray(order) ? order.map(String).filter(k => DEFAULT_CATEGORY_ORDER.includes(k)) : [];
    const unique = [...new Set(keys)];
    return [...unique, ...DEFAULT_CATEGORY_ORDER.filter(k => !unique.includes(k))];
}

export function loadCategoryOrder(): string[] {
    try { return normalizeCategoryOrder(JSON.parse(getSetting('partitionOrder') ?? 'null')); }
    catch { return [...DEFAULT_CATEGORY_ORDER]; }
}

export function saveCategoryOrder(order: string[]): void {
    setSetting('partitionOrder', JSON.stringify(normalizeCategoryOrder(order)));
}

/**
 * The category a balloon is numbered in. A note with no category chosen is a
 * technical requirement, as in One Supply (NOTES → tech_req): otherwise a
 * reorder files it among the dimensions by position and the count no longer
 * starts from the notes.
 */
export function effectiveCategory(a: { numberCategory?: string; isNote?: boolean }): string {
    return a.numberCategory || (a.isNote ? 'notes' : 'normal');
}

export function categoryRank(order: string[], key: string | undefined): number {
    const i = order.indexOf(key || 'normal');
    return i < 0 ? order.indexOf('normal') : i;
}

// ── quantity ────────────────────────────────────────────────────────────────

/**
 * One Supply's quantity box: "4", "4x", "×4", "(1-4)". Blank or 1 clears it.
 * `ok: false` for anything else, so the field can refuse it.
 */
export function parseQuantityInput(raw: string | null | undefined): { ok: true; quantity?: number } | { ok: false } {
    const s = String(raw ?? '').trim();
    if (!s) return { ok: true, quantity: undefined };
    const m = s.match(/^(\d+)\s*[xX×]?$/)
        || s.match(/^[xX×]\s*(\d+)$/)
        || s.match(/^\(?\s*1\s*-\s*(\d+)\s*\)?$/);
    if (!m) return { ok: false };
    const n = parseInt(m[1], 10);
    if (!(n >= 1 && n <= 9999)) return { ok: false };
    return { ok: true, quantity: n > 1 ? n : undefined };
}

export const formatQuantityRange = (q?: number) => (q && q > 1 ? `(1-${q})` : '');

// ── tolerance in the text ───────────────────────────────────────────────────

/**
 * A tolerance written into the dimension itself: "Ø.380 ±.005",
 * "10 +0.1/-0.05", "25+.002-.000". One Supply strips it into the tolerance
 * fields when the dimension loses focus. Null when there is none.
 */
export function splitTolerance(text: string | null | undefined): { content: string; upper: string; lower: string } | null {
    const s = String(text ?? '').trim();
    if (!s) return null;
    const NUM = String.raw`\d*\.?\d+`;

    let m = s.match(new RegExp(String.raw`^(.*?\d\S*?)\s*±\s*(${NUM})\s*(°?)$`));
    if (m && /\d/.test(m[1])) {
        const deg = m[3] || (m[1].includes('°') ? '°' : '');
        return { content: m[1].trim(), upper: `+${m[2]}${deg}`, lower: `-${m[2]}${deg}` };
    }
    m = s.match(new RegExp(String.raw`^(.*?\d\S*?)\s*\+\s*(${NUM})\s*(°?)\s*/?\s*-\s*(${NUM})\s*(°?)$`));
    if (m && /\d/.test(m[1])) {
        return { content: m[1].trim(), upper: `+${m[2]}${m[3]}`, lower: `-${m[4]}${m[5] || m[3]}` };
    }
    return null;
}

// ── export mode ─────────────────────────────────────────────────────────────

export type ExportMode = 'text' | 'screenshot';
export const EXPORT_MODES: { key: ExportMode; label: string }[] = [
    { key: 'text', label: 'Text' },
    { key: 'screenshot', label: 'Screenshot' },
];

// ── dimension symbol filter ─────────────────────────────────────────────────

export interface SymbolFilterSettings { symbols: string[]; }
export const QUICK_SYMBOLS = ['Ø', '⌀', 'mm', '±', '°', '□', '×', 'x', 'X'];

export function loadSymbolFilter(): SymbolFilterSettings {
    try {
        const s = JSON.parse(getSetting('symbolFilter') ?? 'null');
        return { symbols: Array.isArray(s?.symbols) ? [...new Set<string>(s.symbols.map(String).filter(Boolean))] : [] };
    } catch {
        return { symbols: [] };
    }
}

export function saveSymbolFilter(s: SymbolFilterSettings): void {
    setSetting('symbolFilter', JSON.stringify({ symbols: [...new Set(s.symbols.filter(Boolean))] }));
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Strip the listed symbols from a dimension's text.
 *
 * A plain letter ("x", "mm") is only stripped where it touches a number, so
 * filtering "x" turns "4x .250" into "4 .250" without making "MAX" into "MA".
 */
export function applySymbolFilter(text: string | null | undefined, symbols: string[]): string {
    let s = String(text ?? '');
    for (const sym of symbols) {
        if (!sym) continue;
        if (/^[A-Za-z]+$/.test(sym)) {
            s = s.replace(new RegExp(String.raw`(?<=\d)\s*${escapeRe(sym)}(?![A-Za-z])|(?<![A-Za-z])${escapeRe(sym)}\s*(?=\d|\.\d)`, 'g'), ' ');
        } else {
            s = s.split(sym).join('');
        }
    }
    return s.replace(/\s{2,}/g, ' ').trim();
}

// ── PDF export filter ───────────────────────────────────────────────────────

export interface PdfExportOptions {
    /** Ask these questions before every PDF export. */
    askBeforeExport: boolean;
    hideReference: boolean;
    hideTheoretical: boolean;
    showQuantity: boolean;
}

export const DEFAULT_PDF_EXPORT: PdfExportOptions = {
    askBeforeExport: false, hideReference: false, hideTheoretical: false, showQuantity: false,
};

export function loadPdfExportOptions(): PdfExportOptions {
    try { return { ...DEFAULT_PDF_EXPORT, ...JSON.parse(getSetting('pdfExport') ?? '{}') }; }
    catch { return { ...DEFAULT_PDF_EXPORT }; }
}

export function savePdfExportOptions(o: PdfExportOptions): void {
    setSetting('pdfExport', JSON.stringify(o));
}

/**
 * The balloons a filtered PDF shows, renumbered without gaps. Copies - the
 * drawing itself keeps its numbers; only the exported file closes up.
 */
export function filterForExport(
    annotations: BalloonAnnotation[], o: Pick<PdfExportOptions, 'hideReference' | 'hideTheoretical'>
): { list: BalloonAnnotation[]; hidden: number } {
    const keep = annotations.filter(a =>
        !(o.hideReference && isReferenceBalloon(a)) && !(o.hideTheoretical && isTheoreticalBalloon(a)));
    const hidden = annotations.length - keep.length;
    if (!hidden) return { list: annotations, hidden };

    const ordered = [...keep].sort((a, b) => (a.pageIndex - b.pageIndex) || compareBalloonNumber(a, b));
    const remap = new Map<string, number>();
    let next = 1;
    const out: BalloonAnnotation[] = [];
    for (const a of ordered) {
        const key = `${a.balloonNumber}`;
        if (!a.subNumber && !remap.has(key)) remap.set(key, next++);
    }
    for (const a of ordered) {
        const n = remap.get(`${a.balloonNumber}`);
        out.push({ ...a, balloonNumber: n ?? a.balloonNumber });
    }
    return { list: out, hidden };
}

// ── editor defaults ─────────────────────────────────────────────────────────

export interface EditorDefaults {
    /** Pre-filled on a balloon drawn or recognised by hand. */
    defaultInspectionToolId?: number;
    /** Keep a GD&T frame numbered straight after the dimension it controls. */
    gdtGroupSort: boolean;
    /** Auto Balloon (all) queues only pages with no balloons yet. */
    skipDonePages: boolean;
    /** Single recognition keeps a picture of the area instead of reading it. */
    singleAsScreenshot: boolean;
}

export const DEFAULT_EDITOR_DEFAULTS: EditorDefaults = {
    gdtGroupSort: false, skipDonePages: false, singleAsScreenshot: false,
};

export function loadEditorDefaults(): EditorDefaults {
    try { return { ...DEFAULT_EDITOR_DEFAULTS, ...JSON.parse(getSetting('editorDefaults') ?? '{}') }; }
    catch { return { ...DEFAULT_EDITOR_DEFAULTS }; }
}

export function saveEditorDefaults(d: EditorDefaults): void {
    setSetting('editorDefaults', JSON.stringify(d));
}

// ── GD&T group sorting ──────────────────────────────────────────────────────

const gap = (a: Rect, b: Rect) => {
    const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width));
    const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height));
    return Math.hypot(dx, dy);
};

/**
 * One Supply's 形位公差尺寸组连续排序: a feature control frame sitting against
 * a dimension is numbered straight after it, instead of wherever reading
 * order happened to put it. "Against" is within `maxGap` page percent.
 */
export function groupGdtWithDimensions(ordered: BalloonAnnotation[], maxGap = 1.2): BalloonAnnotation[] {
    const isFrame = (a: BalloonAnnotation) => !a.isDatum && !a.isNote && !!geometricGlyph(a.content);
    const frames = ordered.filter(isFrame);
    if (!frames.length) return ordered;

    const hosts = ordered.filter(a => !isFrame(a) && !a.isNote);
    const attached = new Map<string, BalloonAnnotation[]>();
    const moved = new Set<string>();
    for (const f of frames) {
        let best: BalloonAnnotation | null = null, bestGap = Infinity;
        for (const h of hosts) {
            if (h.pageIndex !== f.pageIndex) continue;
            const g = gap(f.rect, h.rect);
            if (g < bestGap) { best = h; bestGap = g; }
        }
        if (best && bestGap <= maxGap) {
            if (!attached.has(best.id)) attached.set(best.id, []);
            attached.get(best.id)!.push(f);
            moved.add(f.id);
        }
    }
    const out: BalloonAnnotation[] = [];
    for (const a of ordered) {
        if (moved.has(a.id)) continue;
        out.push(a);
        for (const f of attached.get(a.id) ?? []) out.push(f);
    }
    return out;
}

// ── audit ───────────────────────────────────────────────────────────────────

/**
 * The next balloon to review after `fromId`, in list order, wrapping round to
 * the start. Null once everything is audited - One Supply's F2 walk.
 */
export function nextUnaudited(ordered: { id: string; audited?: boolean }[], fromId: string | null): string | null {
    if (!ordered.length) return null;
    const start = Math.max(0, ordered.findIndex(a => a.id === fromId));
    for (let i = 1; i <= ordered.length; i++) {
        const a = ordered[(start + i) % ordered.length];
        if (!a.audited) return a.id;
    }
    return null;
}
