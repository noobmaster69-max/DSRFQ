/**
 * Section and detail views, linked to where they were cut from.
 *
 * "SECTION A-A" is drawn in one place and cut in another - the two letters A at
 * the ends of a cutting-plane line, possibly on another sheet. The consumer
 * finds both on the PDF (RPA/RFQ/view_links.py) and stores them per part; this
 * module loads them, draws them on the page, and answers "which view is this
 * balloon in", so an inspector knows which cut to measure a dimension on.
 *
 * Read-only: they are the drawing's, re-found on every ballooning run.
 */
import {CostingPartBalloonsService, ViewLink} from '@/ServerTypes/Costing/CostingPartBalloonsService';

export interface PctRect { x: number; y: number; width: number; height: number; }

export interface ViewLinkData {
    id: string;
    kind: 'section' | 'detail' | 'view';
    letter: string;
    /** "SECTION A-A", "DETAIL B". */
    title: string;
    /** 0-based page the view (and its label) is on. */
    pageIndex: number;
    label: PctRect | null;
    view: PctRect | null;
    /** 0-based page the cut / detail circle is on. */
    markPageIndex: number;
    marks: PctRect[];
    line: PctRect | null;
}

export const VIEW_LINK_COLOR = '#0d9488';

const rect = (x1?: number | null, y1?: number | null, x2?: number | null, y2?: number | null): PctRect | null =>
    x1 == null || y1 == null || x2 == null || y2 == null ? null
        : {x: +x1, y: +y1, width: +x2 - +x1, height: +y2 - +y1};

export async function loadViewLinks(costingPartId: number): Promise<ViewLinkData[]> {
    try {
        const res = await CostingPartBalloonsService.ListViewLinks({CostingPartId: costingPartId});
        return (res.Links ?? []).map((l: ViewLink) => {
            let marks: PctRect[] = [];
            try {
                marks = (JSON.parse(l.MarksJson || '[]') as any[])
                    .map(m => rect(m.x1, m.y1, m.x2, m.y2)).filter(Boolean) as PctRect[];
            } catch { /* no marks */ }
            return {
                id: String(l.Id),
                kind: (l.Kind as any) || 'section',
                letter: l.Letter || '',
                title: l.Title || '',
                pageIndex: Math.max(0, (l.PageNumber ?? 1) - 1),
                label: rect(l.LabelX1, l.LabelY1, l.LabelX2, l.LabelY2),
                view: rect(l.ViewX1, l.ViewY1, l.ViewX2, l.ViewY2),
                markPageIndex: Math.max(0, (l.MarkPageNumber ?? l.PageNumber ?? 1) - 1),
                marks,
                line: rect(l.LineX1, l.LineY1, l.LineX2, l.LineY2),
            };
        });
    } catch (e) {
        // The editor works exactly as before without them.
        console.warn('View links unavailable', e);
        return [];
    }
}

/** A link is only a link if both ends were found. */
export const isLinked = (l: ViewLinkData) => l.marks.length > 0 || !!l.line;

/**
 * The view a balloon sits in: its box's centre inside the view's area, on the
 * same page. The smallest such view wins - a detail drawn inside a larger
 * view's area is the more specific answer.
 */
export function viewOf(links: ViewLinkData[], pageIndex: number, r: PctRect): ViewLinkData | null {
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    let best: ViewLinkData | null = null;
    for (const l of links) {
        const v = l.view;
        if (l.pageIndex !== pageIndex || !v) continue;
        if (cx < v.x || cx > v.x + v.width || cy < v.y || cy > v.y + v.height) continue;
        if (!best || v.width * v.height < best.view!.width * best.view!.height) best = l;
    }
    return best;
}

/** Where a "go to" lands: the other end of the link. */
export function linkTarget(l: ViewLinkData, to: 'mark' | 'view'): {pageIndex: number; rect: PctRect} | null {
    if (to === 'view') {
        const r = l.view ?? l.label;
        return r ? {pageIndex: l.pageIndex, rect: r} : null;
    }
    const parts = [...l.marks, ...(l.line ? [l.line] : [])];
    if (!parts.length) return null;
    const x1 = Math.min(...parts.map(p => p.x)), y1 = Math.min(...parts.map(p => p.y));
    const x2 = Math.max(...parts.map(p => p.x + p.width)), y2 = Math.max(...parts.map(p => p.y + p.height));
    return {pageIndex: l.markPageIndex, rect: {x: x1, y: y1, width: x2 - x1, height: y2 - y1}};
}

const box = (r: PctRect, pad = 0) =>
    `left:${r.x - pad}%;top:${r.y - pad}%;width:${r.width + 2 * pad}%;height:${r.height + 2 * pad}%;`;

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!));

/**
 * The links' overlay for one page. Under the balloons (z-index 1). The view
 * outline takes no pointer events - it covers a whole view and must not get
 * in the way of drawing a box inside it; the label chip and the marks are the
 * click targets, each jumping to the other end.
 */
export function renderViewLinks(links: ViewLinkData[], pageIndex: number, highlightId: string | null): string {
    let html = '';
    for (const l of links) {
        const hot = l.id === highlightId ? ' hot' : '';
        const linked = isLinked(l);
        if (l.pageIndex === pageIndex) {
            if (l.view)
                html += `<div class="ab-vl-view${hot}" style="${box(l.view, 0.3)}"></div>`;
            if (l.label) {
                const where = !linked ? 'where it was cut from was not found on the drawing'
                    : l.markPageIndex === pageIndex ? 'click to show where it was cut'
                    : `click to go to the cut on page ${l.markPageIndex + 1}`;
                html += `<div class="ab-vl-label${hot}${linked ? '' : ' unlinked'}" data-vl="${l.id}" data-vl-go="mark"
                    style="${box(l.label, 0.4)}" title="${esc(l.title)} - ${where}"></div>`;
            }
        }
        if (l.markPageIndex === pageIndex && linked) {
            const go = l.pageIndex === pageIndex ? `click to show ${esc(l.title)}`
                : `click to go to ${esc(l.title)} on page ${l.pageIndex + 1}`;
            if (l.line)
                html += `<div class="ab-vl-line${hot}" style="${box(l.line, 0.2)}"></div>`;
            for (const m of l.marks)
                html += `<div class="ab-vl-mark${hot}" data-vl="${l.id}" data-vl-go="view"
                    style="${box(m, 0.3)}" title="${esc(l.letter)}: ${go}"><span>${esc(l.title)}</span></div>`;
        }
    }
    return html;
}

export const VIEW_LINK_CSS = `
    .ab-vl-view { position:absolute; z-index:1; pointer-events:none; border:1.5px dashed ${VIEW_LINK_COLOR}80; border-radius:4px; }
    .ab-vl-label, .ab-vl-mark { position:absolute; z-index:1; cursor:pointer; border:2px solid ${VIEW_LINK_COLOR};
        border-radius:3px; background:${VIEW_LINK_COLOR}1f; }
    .ab-vl-label.unlinked { border-style:dotted; cursor:help; }
    .ab-vl-line { position:absolute; z-index:1; pointer-events:none; border:1.5px solid ${VIEW_LINK_COLOR}99; background:${VIEW_LINK_COLOR}14; }
    /* Inside the zoomed canvas: sized against --ab-scale (set by the widget)
       so the tag stays 11px on screen at any zoom. */
    .ab-vl-mark > span { position:absolute; left:100%; top:50%; transform:translateY(-50%);
        margin-left:calc(4px / var(--ab-scale, 1)); white-space:nowrap;
        font:600 calc(11px / var(--ab-scale, 1))/1 sans-serif; color:#fff; background:${VIEW_LINK_COLOR};
        padding:calc(2px / var(--ab-scale, 1)) calc(5px / var(--ab-scale, 1)); border-radius:3px; display:none; }
    .ab-vl-mark:hover > span, .ab-vl-mark.hot > span { display:block; }
    .ab-vl-view.hot, .ab-vl-label.hot, .ab-vl-mark.hot, .ab-vl-line.hot {
        border-color:${VIEW_LINK_COLOR}; background:${VIEW_LINK_COLOR}33; animation: ab-vl-pulse 0.9s ease-in-out 3; }
    @keyframes ab-vl-pulse { 50% { box-shadow: 0 0 0 6px ${VIEW_LINK_COLOR}55; } }
    .ab-vl-tag { display:inline-block; margin-left:6px; padding:0 5px; border-radius:3px; font:600 10px/16px sans-serif;
        color:${VIEW_LINK_COLOR}; background:${VIEW_LINK_COLOR}1a; border:1px solid ${VIEW_LINK_COLOR}55; white-space:nowrap;
        vertical-align:middle; cursor:default; }
`;
