/**
 * Areas ("regions") drawn on a page, and the reorder that walks them.
 *
 * Ported from the PyQt tool at RPA/Bubble:
 *     ui/region_items.py                              -> AreaRegion, palette
 *     ui/managers/area_selection_manager.py           -> create/select/delete
 *     ui/managers/annotation_reorder_manager.py
 *         ::_build_ordered_models_from_regions        -> the ordering rule
 *
 * The idea: an operator boxes part of the drawing, picks how balloons inside
 * that box should be numbered, and repeats for as many boxes as the sheet
 * needs. Renumbering then walks the boxes in their own order, numbering each
 * box's contents by that box's rule, and sweeps up whatever was left over at
 * the end.
 */

import type { BalloonAnnotation, Rect } from "./BallooningTypes";
// Not crypto.randomUUID(): that does not exist on http:// over Tailscale.
import { newId } from "../../Helpers/NewId";
import type { GridSystem } from "./BallooningNumbering";
import type { AreaSortMode } from "./BallooningAreaSort";
import {
    sortArea, sortByReadingOrder, rowTolerancePct, DEFAULT_AREA_SORT_MODE,
    normalizeSortMode, sortCoord,
} from "./BallooningAreaSort";

/** Region outline colours, cycled by creation order. From REGION_PALETTE. */
export const REGION_PALETTE = [
    "#0078d7", "#ff8c00", "#009933", "#aa00ff",
    "#dc143c", "#00aaaa", "#ffc107", "#607d8b",
] as const;

export interface AreaRegion {
    regionId: string;
    pageIndex: number;
    /** 1-based. Decides which region is numbered first. */
    orderIndex: number;
    rect: Rect;
    color: string;
    label: string;
    sortMode: AreaSortMode;
    /** Degrees clockwise from 12 o'clock; only polar_sweep uses it. */
    startAngle: number;
}

export function regionColor(index: number): string {
    return REGION_PALETTE[index % REGION_PALETTE.length];
}

export function makeRegion(
    pageIndex: number, rect: Rect, existingCount: number
): AreaRegion {
    return {
        regionId: newId(),
        pageIndex,
        orderIndex: existingCount + 1,
        rect,
        color: regionColor(existingCount),
        label: `Area ${existingCount + 1}`,
        sortMode: DEFAULT_AREA_SORT_MODE,
        startAngle: 0,
    };
}

/** Renumber labels and orderIndex after an insert, delete or reorder. */
export function resequenceRegions(regions: AreaRegion[]): AreaRegion[] {
    return regions.map((r, i) => ({
        ...r,
        orderIndex: i + 1,
        label: `Area ${i + 1}`,
        color: regionColor(i),
    }));
}

// ── containment ──────────────────────────────────────────────────────────────

/**
 * Tolerance added around a region when deciding what falls inside it.
 *
 * The original grows the rect by 2 scene pixels at 250 DPI - 0.008 inch - so a
 * balloon sitting exactly on the border is not lost. Expressed here as a
 * percentage of page height for the same reason the row tolerance is.
 */
const EDGE_TOLERANCE_INCHES = 2 / 250;

export function regionContains(
    region: AreaRegion, ann: BalloonAnnotation,
    pageHeightInches = 11.69
): boolean {
    const pad = (EDGE_TOLERANCE_INCHES / pageHeightInches) * 100;
    const c = sortCoord(ann);
    return c.x >= region.rect.x - pad
        && c.x <= region.rect.x + region.rect.width + pad
        && c.y >= region.rect.y - pad
        && c.y <= region.rect.y + region.rect.height + pad;
}

/** True when two regions overlap - the original refuses to create those. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.width && b.x < a.x + a.width
        && a.y < b.y + b.height && b.y < a.y + a.height;
}

// ── the ordering ─────────────────────────────────────────────────────────────

export interface RegionOrderOptions {
    grid: GridSystem | null;
    pageHeightInches?: number;
}

/**
 * Every balloon on the page, in the order the regions dictate.
 *
 * Port of _build_ordered_models_from_regions:
 *   - regions are walked by orderIndex
 *   - a balloon belongs to the FIRST region that contains it and is then
 *     removed from the pool, so overlapping boxes cannot number it twice
 *   - each region's contents are sorted by that region's own mode
 *   - anything in no region goes last, in reading order
 *
 * With no regions defined this is just the page in reading order, which is
 * what makes it safe to call unconditionally.
 */
export function orderByRegions(
    pageAnnotations: BalloonAnnotation[],
    regions: AreaRegion[],
    opts: RegionOrderOptions
): BalloonAnnotation[] {
    const tol = rowTolerancePct("page", opts.pageHeightInches);
    if (!regions.length)
        return sortByReadingOrder(pageAnnotations, tol);

    let remaining = [...pageAnnotations];
    const ordered: BalloonAnnotation[] = [];

    for (const region of [...regions].sort((a, b) => a.orderIndex - b.orderIndex)) {
        const inside: BalloonAnnotation[] = [];
        const outside: BalloonAnnotation[] = [];
        for (const a of remaining)
            (regionContains(region, a, opts.pageHeightInches) ? inside : outside).push(a);
        remaining = outside;

        if (!inside.length) continue;
        ordered.push(...sortArea(inside, {
            mode: normalizeSortMode(region.sortMode),
            startAngle: region.startAngle,
            center: {
                x: region.rect.x + region.rect.width / 2,
                y: region.rect.y + region.rect.height / 2,
            },
            grid: opts.grid,
            pageHeightInches: opts.pageHeightInches,
        }));
    }

    // Balloons no region claimed still have to be numbered, or a partial set
    // of boxes would silently drop the rest of the sheet.
    if (remaining.length)
        ordered.push(...sortByReadingOrder(remaining, tol));

    return ordered;
}

/**
 * Assign numbers over an ordered list, leaving children attached to parents.
 *
 * Mirrors the server-side rule in BalloonPosition.recalculate_balloon_position:
 * a child shares its parent's number and does not advance the counter, so
 * adding a sub-number never renumbers the balloons after it.
 *
 * Mutates in place and returns how many parents were numbered.
 */
export function applyNumbering(
    ordered: BalloonAnnotation[],
    startId = 1
): number {
    let counter = startId;
    const remap = new Map<number, number>();

    for (const a of ordered) {
        if (a.subNumber) continue;
        remap.set(a.balloonNumber, counter);
        a.balloonNumber = counter;
        counter++;
    }
    for (const a of ordered) {
        if (!a.subNumber) continue;
        // An orphan - parent deleted - keeps the number it had rather than
        // silently attaching to whichever balloon now owns that slot.
        const moved = remap.get(a.balloonNumber);
        if (moved !== undefined) a.balloonNumber = moved;
    }
    return counter - startId;
}
