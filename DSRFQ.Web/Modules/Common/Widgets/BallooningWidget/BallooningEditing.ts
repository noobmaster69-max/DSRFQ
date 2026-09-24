/**
 * The editing rules the ballooning widget follows, kept out of the widget so
 * they can be tested without a browser.
 *
 * Ported behaviour from One Supply (C:\Aizera\RPA\Bubble):
 *   - undo/redo over every edit      (core/undo_commands.py, QUndoStack)
 *   - delete closes the number gap   (annotation_manager.py:451-552)
 *   - renumbering runs across pages  (annotation_reorder_manager.py)
 *   - the list covers every page     (annotation_list.py)
 *   - each row shows its dimension   (annotation_list.py:748-775)
 */

import type { BalloonAnnotation, Rect } from "./BallooningTypes";
import { compareBalloonNumber } from "./BallooningNumbering";
import { applyNumbering } from "./BallooningRegions";

// ── undo / redo ─────────────────────────────────────────────────────────────

/**
 * A linear history of whole-drawing snapshots.
 *
 * Snapshots rather than per-edit commands: the widget changes its balloons
 * through some thirty paths - dragging, the panel, batch apply, filters,
 * tolerances, renumbering, the grid - and a command per path is thirty chances
 * to forget one. A drawing is a few hundred small objects, so a serialised
 * copy per step is cheap, and it cannot drift out of step with the edit.
 */
export class UndoHistory {
    private undoStack: string[] = [];
    private redoStack: string[] = [];
    private current: string | null = null;
    private readonly limit: number;

    constructor(limit = 50) {
        this.limit = limit;
    }

    /** Start over from this state - after a load, nothing before it is undoable. */
    reset(state: string): void {
        this.undoStack = [];
        this.redoStack = [];
        this.current = state;
    }

    /**
     * Note the state after an edit. A no-op when nothing actually changed, so
     * callers can record freely. Returns whether a step was added.
     */
    record(state: string): boolean {
        if (this.current === null) { this.current = state; return false; }
        if (state === this.current) return false;
        this.undoStack.push(this.current);
        if (this.undoStack.length > this.limit) this.undoStack.shift();
        this.redoStack = [];
        this.current = state;
        return true;
    }

    /** The state to go back to, or null when there is none. */
    undo(): string | null {
        if (!this.undoStack.length || this.current === null) return null;
        this.redoStack.push(this.current);
        this.current = this.undoStack.pop()!;
        return this.current;
    }

    redo(): string | null {
        if (!this.redoStack.length || this.current === null) return null;
        this.undoStack.push(this.current);
        this.current = this.redoStack.pop()!;
        return this.current;
    }

    get canUndo(): boolean { return this.undoStack.length > 0; }
    get canRedo(): boolean { return this.redoStack.length > 0; }
    get undoDepth(): number { return this.undoStack.length; }
}

// ── delete ──────────────────────────────────────────────────────────────────

export interface DeleteOutcome {
    /** What is left, as fresh objects - the input array is not modified. */
    kept: BalloonAnnotation[];
    removed: BalloonAnnotation[];
    /** How many kept balloons changed number to close the gap. */
    renumbered: number;
}

/**
 * Remove balloons and close the gaps they leave, as One Supply does.
 *
 * Deleting 3 from 1..6 gives 1..5, not 1,2,4,5,6: the numbers are the order an
 * inspector works through, and a missing one reads as a lost characteristic.
 *
 *   - A deleted PARENT hands its number to its first remaining child, and the
 *     other children close up behind it (5-1, 5-2 -> 5, 5-1). No gap opens.
 *   - A deleted CHILD closes its siblings up (5-1, 5-3 -> 5-1, 5-2).
 *   - Only numbers nothing else still carries are closed.
 *
 * Numbering is closed across every page when the drawing is numbered
 * continuously, and within the page otherwise. A drawing whose pages each
 * start at 1 must not have page 2 shifted down because a balloon went on page 1.
 */
export function deleteBalloons(annotations: BalloonAnnotation[], ids: Set<string>): DeleteOutcome {
    const removed = annotations.filter(a => ids.has(a.id));
    if (!removed.length) return { kept: annotations, removed, renumbered: 0 };

    const kept = annotations.filter(a => !ids.has(a.id)).map(a => ({ ...a }));
    const before = new Map(kept.map(a => [a.id, `${a.balloonNumber}|${a.subNumber ?? ''}`]));

    // Continuous numbering: no top-level number appears on two pages.
    const pagesByNumber = new Map<number, Set<number>>();
    for (const a of annotations) {
        if (a.subNumber) continue;
        if (!pagesByNumber.has(a.balloonNumber)) pagesByNumber.set(a.balloonNumber, new Set());
        pagesByNumber.get(a.balloonNumber)!.add(a.pageIndex);
    }
    const continuous = [...pagesByNumber.values()].every(p => p.size <= 1);
    const sameScope = (a: BalloonAnnotation, page: number) => continuous || a.pageIndex === page;

    // 1. Orphaned children: the first becomes the parent.
    for (const parent of removed.filter(r => !r.subNumber)) {
        const replaced = kept.some(k => !k.subNumber
            && k.balloonNumber === parent.balloonNumber && sameScope(k, parent.pageIndex));
        if (replaced) continue;
        const children = kept
            .filter(k => k.subNumber && k.balloonNumber === parent.balloonNumber && sameScope(k, parent.pageIndex))
            .sort((a, b) => (a.subNumber ?? 0) - (b.subNumber ?? 0));
        if (!children.length) continue;
        children[0].subNumber = undefined;
        children.slice(1).forEach((c, i) => c.subNumber = i + 1);
    }

    // 2. Siblings of a deleted child close up.
    const lostChildren = removed.filter(r => r.subNumber);
    for (const child of lostChildren) {
        const siblings = kept
            .filter(k => k.subNumber && k.balloonNumber === child.balloonNumber && sameScope(k, child.pageIndex))
            .sort((a, b) => (a.subNumber ?? 0) - (b.subNumber ?? 0));
        siblings.forEach((s, i) => s.subNumber = i + 1);
    }

    // 3. Top-level gaps, highest first so each shift sees the final numbers above it.
    const gaps = removed
        .filter(r => !r.subNumber && Number.isFinite(r.balloonNumber))
        .map(r => ({ num: r.balloonNumber, page: r.pageIndex }))
        .sort((a, b) => b.num - a.num);
    const seen = new Set<string>();
    for (const gap of gaps) {
        const key = continuous ? `${gap.num}` : `${gap.page}:${gap.num}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (kept.some(k => k.balloonNumber === gap.num && sameScope(k, gap.page))) continue;
        for (const k of kept)
            if (sameScope(k, gap.page) && k.balloonNumber > gap.num) k.balloonNumber--;
    }

    const renumbered = kept.filter(a => before.get(a.id) !== `${a.balloonNumber}|${a.subNumber ?? ''}`).length;
    return { kept, removed, renumbered };
}

/** No top-level number appears on two pages - the drawing is numbered as one sequence. */
export function isContinuousNumbering(annotations: BalloonAnnotation[]): boolean {
    const pageOf = new Map<number, number>();
    for (const a of annotations) {
        if (a.subNumber) continue;
        const seen = pageOf.get(a.balloonNumber);
        if (seen !== undefined && seen !== a.pageIndex) return false;
        pageOf.set(a.balloonNumber, a.pageIndex);
    }
    return true;
}

/**
 * Shift everything above `num` down one, if nothing top-level still carries it.
 * Scoped to `page` unless the drawing is numbered continuously. Mutates.
 */
export function closeNumberGap(annotations: BalloonAnnotation[], num: number, page: number, continuous: boolean): number {
    const inScope = (a: BalloonAnnotation) => continuous || a.pageIndex === page;
    if (annotations.some(a => !a.subNumber && a.balloonNumber === num && inScope(a))) return 0;
    let moved = 0;
    for (const a of annotations)
        if (inScope(a) && a.balloonNumber > num) { a.balloonNumber--; moved++; }
    return moved;
}

// ── move to a number ────────────────────────────────────────────────────────

export interface MoveNumberOutcome {
    /** False when nothing changed: already there, unknown id, or a child. */
    moved: boolean;
    from: number;
    /** Where it ended up - the requested number, clamped into the sequence. */
    to: number;
    /** How many OTHER balloons changed number to make room. */
    shifted: number;
    /** The requested number was outside 1..last and was pulled in. */
    clamped: boolean;
    /** Why nothing moved, in words for the operator. */
    reason?: string;
}

/**
 * Give a balloon a new number and slide the rest along, like dragging a row
 * in a list.
 *
 *   1 2 3 4 5 6 7   move 6 to 3  ->  1 2 [6] 3 4 5 7   (3,4,5 become 4,5,6)
 *   1 2 3 4 5 6 7   move 2 to 5  ->  1 3 4 5 [2] 6 7   (3,4,5 become 2,3,4)
 *
 * Typing a number used to just SET it, so the drawing ended up with two
 * balloon 3s and a hole where the old number was - the one thing the numbering
 * everywhere else (delete, renumber) goes out of its way to prevent. One
 * Supply has no way to do this at all: its list is read-only and numbers only
 * change by renumbering the whole drawing or an area.
 *
 *   - Children move with their parent: 6-1 and 6-2 become 3-1 and 3-2, and
 *     the families in between shift as whole families.
 *   - The scope follows the drawing: across every page when it is numbered
 *     continuously, within the balloon's own page when each page starts at 1
 *     (the same rule deleteBalloons closes gaps by).
 *   - A number past the end goes to the end; below 1 goes to 1.
 *   - A CHILD is refused: its number is its parent's. Move the parent, or
 *     clear the sub-number to make it a balloon of its own first.
 *
 * Only numbers change. Nothing moves on the drawing. Mutates in place.
 */
export function moveBalloonNumber(
    annotations: BalloonAnnotation[], id: string, target: number
): MoveNumberOutcome {
    const ann = annotations.find(a => a.id === id);
    const none = (reason: string, from = ann?.balloonNumber ?? 0): MoveNumberOutcome =>
        ({ moved: false, from, to: from, shifted: 0, clamped: false, reason });

    if (!ann) return none("that balloon no longer exists");
    if (ann.subNumber)
        return none("a sub-number follows its parent - change the parent's number, "
            + "or clear the sub-number first");
    if (!Number.isFinite(target)) return none("that is not a number");

    const continuous = isContinuousNumbering(annotations);
    const inScope = (a: BalloonAnnotation) => continuous || a.pageIndex === ann.pageIndex;
    const from = ann.balloonNumber;

    // The top-level numbers in play. Distinct, because a drawing can already
    // carry a duplicate (from a hand edit before this existed) and the last
    // slot is the highest number, not the count.
    const tops = [...new Set(annotations
        .filter(a => !a.subNumber && inScope(a) && Number.isFinite(a.balloonNumber))
        .map(a => a.balloonNumber))].sort((a, b) => a - b);
    const last = tops.length ? tops[tops.length - 1] : from;

    let to = Math.round(target);
    const clamped = to < 1 || to > last;
    to = Math.max(1, Math.min(last, to));
    if (to === from) return { ...none(clamped
        ? `it is already ${to <= 1 ? "first" : "last"}`
        : "it already has that number"), clamped };

    // The moving family: this balloon and its own children - found by id and
    // scope, not just by number, so a stray duplicate of the old number on
    // another page (or a second parent that happens to share it) stays put.
    const family = new Set(annotations
        .filter(a => a.id === id || (a.subNumber && a.balloonNumber === from && inScope(a)))
        .map(a => a.id));

    let shifted = 0;
    for (const a of annotations) {
        if (family.has(a.id) || !inScope(a)) continue;
        const n = a.balloonNumber;
        // Moving up the list (to a smaller number): the ones it passes step
        // down one place. Moving down: the ones it passes step up.
        if (to < from && n >= to && n < from) { a.balloonNumber = n + 1; if (!a.subNumber) shifted++; }
        else if (to > from && n > from && n <= to) { a.balloonNumber = n - 1; if (!a.subNumber) shifted++; }
    }
    for (const a of annotations) if (family.has(a.id)) a.balloonNumber = to;

    return { moved: true, from, to, shifted, clamped };
}

// ── renumber ────────────────────────────────────────────────────────────────

export interface RenumberOutcome {
    parents: number;
    children: number;
    pages: number;
    /** The last number given out - so the report can say "1-148". */
    last: number;
}

/**
 * Number every page in turn, continuing from the page before.
 *
 * Each page is ordered by `orderPage` - its areas and their rules, then
 * reading order - exactly as a single-page renumber was. What changes is the
 * start: page 2 carries on from page 1 instead of starting again at 1, so a
 * multi-page drawing no longer has two balloon 1s. Mutates in place.
 */
export function renumberAcrossPages(
    annotations: BalloonAnnotation[],
    orderPage: (pageIndex: number, onPage: BalloonAnnotation[]) => BalloonAnnotation[],
    /**
     * One Supply's number categories: every balloon of the lowest group, on
     * every page, is numbered before the next group starts. Omitted = one group.
     */
    groupOf?: (a: BalloonAnnotation) => number
): RenumberOutcome {
    const pageIndexes = [...new Set(annotations.map(a => a.pageIndex))].sort((a, b) => a - b);
    const groups = groupOf ? [...new Set(annotations.map(groupOf))].sort((a, b) => a - b) : [0];
    let next = 1, parents = 0;
    const pagesTouched = new Set<number>();
    for (const group of groups) {
        for (const page of pageIndexes) {
            const onPage = annotations.filter(a => a.pageIndex === page && (!groupOf || groupOf(a) === group));
            if (!onPage.length) continue;
            const numbered = applyNumbering(orderPage(page, onPage), next);
            next += numbered;
            parents += numbered;
            pagesTouched.add(page);
        }
    }
    return { parents, children: annotations.length - parents, pages: pagesTouched.size, last: next - 1 };
}

// ── the list ────────────────────────────────────────────────────────────────

/** The list's order: page, then number with each child after its parent. */
export function listOrder(
    annotations: BalloonAnnotation[], allPages: boolean, currentPage: number
): BalloonAnnotation[] {
    return annotations
        .filter(a => allPages || a.pageIndex === currentPage)
        .sort((a, b) => (a.pageIndex - b.pageIndex) || compareBalloonNumber(a, b));
}

export interface CropGeometry {
    width: number;
    height: number;
    /** CSS background-size. */
    size: string;
    /** CSS background-position. */
    position: string;
}

/**
 * A thumbnail of one balloon's box, cut from the page image with CSS.
 *
 * The page image is already in the browser for the canvas, so the crop is a
 * background positioned over it rather than a second request per row. The
 * box is padded slightly, since OCR boxes sit tight against the glyphs, and
 * fitted inside maxW x maxH without distortion.
 *
 * `pageAspect` is the page's width / height; unknown until the image has been
 * measured, when an A-size landscape sheet is assumed.
 */
export function cropGeometry(
    rect: Rect, pageAspect: number | null, maxW = 104, maxH = 52, pad = 0.35
): CropGeometry {
    const x = Math.max(0, rect.x - pad);
    const y = Math.max(0, rect.y - pad);
    const w = Math.max(0.01, Math.min(100 - x, rect.width + pad * 2));
    const h = Math.max(0.01, Math.min(100 - y, rect.height + pad * 2));

    const aspect = (w * (pageAspect && pageAspect > 0 ? pageAspect : Math.SQRT2)) / h;
    let width = maxW, height = maxW / aspect;
    if (height > maxH) { height = maxH; width = maxH * aspect; }

    const pct = (v: number) => `${+v.toFixed(3)}%`;
    return {
        width: Math.max(12, Math.round(width)),
        height: Math.max(10, Math.round(height)),
        size: `${pct(10000 / w)} ${pct(10000 / h)}`,
        position: `${pct(w >= 100 ? 0 : (x / (100 - w)) * 100)} ${pct(h >= 100 ? 0 : (y / (100 - h)) * 100)}`,
    };
}
