/**
 * Area reorder strategies - the sort modes offered by the Area Reorder dialog.
 *
 * Ported from the PyQt tool at RPA/Bubble:
 *     core/area_sort_strategy.py   -> the eight coordinate strategies
 *     core/spatial_sort.py         -> row clustering, snake and reading order
 *     ui/managers/annotation_reorder_manager.py::_sort_items_by_partition
 *
 * Everything here is pure: it takes annotations and returns them reordered,
 * and never touches the DOM or widget state.
 *
 * ── The one number that needed converting ───────────────────────────────────
 * The original clusters balloons into visual rows with a tolerance in SCENE
 * PIXELS - 40 inside a grid cell, 30 for a whole page - at its own render
 * resolution of 250 DPI (utils/constants.py: DEFAULT_PDF_DPI = 250). Those are
 * therefore physical distances on the sheet:
 *
 *     40 px / 250 dpi = 0.160 inch  (4.1 mm)   within a grid cell
 *     30 px / 250 dpi = 0.120 inch  (3.0 mm)   across a whole page
 *
 * DSRFQ works in percent of page, so the same physical tolerance is a
 * different percentage on every sheet size - 1.37% of an A3's height but only
 * 0.73% of a D-size sheet. Carrying the pixel number across unchanged would
 * have been silently wrong on every sheet that is not the size the original
 * was tuned on. rowTolerancePct() does the conversion from the page's real
 * height instead.
 *
 * The original's own comment is worth preserving: the grid-cell tolerance was
 * deliberately NOT widened to 80, because at that width a densely packed area
 * merges the upper row's 7 with the lower row's 9 and 10, and the balloons come
 * out numbered 9, 7, ... instead of 7, 9, ...
 */

import type { BalloonAnnotation } from "./BallooningTypes";
import type { GridSystem } from "./BallooningNumbering";
import { parseGridCell, cellOrderKey, compareKeys } from "./BallooningNumbering";

// ── sort modes ───────────────────────────────────────────────────────────────

export type AreaSortMode =
    | "partition"
    | "left_to_right"
    | "right_to_left"
    | "top_to_bottom"
    | "bottom_to_top"
    | "reading_order"
    | "clockwise"
    | "counterclockwise"
    | "polar_sweep";

export const DEFAULT_AREA_SORT_MODE: AreaSortMode = "partition";

/**
 * Modes the original dropped. A project saved under one of these must still
 * open, so they fall back rather than throwing - matching
 * _normalize_region_sort_mode, which resolves them to reading order.
 */
const REMOVED_SORT_MODES: Record<string, AreaSortMode> = {
    boundary_clockwise: "reading_order",
    view_surround: "reading_order",
};

export function normalizeSortMode(mode: string | null | undefined): AreaSortMode {
    if (!mode) return DEFAULT_AREA_SORT_MODE;
    if (mode in REMOVED_SORT_MODES) return REMOVED_SORT_MODES[mode];
    return mode as AreaSortMode;
}

/** Dialog copy, in the order the original presents it. */
export const AREA_SORT_GROUPS: {
    title: string;
    modes: { key: AreaSortMode; label: string; hint: string }[];
}[] = [
    {
        title: "Common",
        modes: [
            { key: "partition", label: "Grid partition (default)",
              hint: "Follow the drawing's grid: balloons are grouped by their grid cell, the cells are walked in grid order, and each cell is read top-to-bottom then left-to-right. Falls back to whole-page order when the sheet has no grid." },
            { key: "left_to_right", label: "Single row, left to right",
              hint: "Straight by X. Use when the balloons in the area sit on roughly one horizontal line." },
            { key: "right_to_left", label: "Single row, right to left",
              hint: "The same, numbered the other way." },
            { key: "top_to_bottom", label: "Single column, top to bottom",
              hint: "Straight by Y. Use when the balloons sit in roughly one vertical line." },
            { key: "bottom_to_top", label: "Single column, bottom to top",
              hint: "The same, numbered the other way." },
            { key: "reading_order", label: "Reading order",
              hint: "Cluster into visual rows top-to-bottom, then read each row left-to-right. The usual choice for a rectangular area holding several rows of dimensions." },
        ],
    },
    {
        title: "Circular",
        modes: [
            { key: "clockwise", label: "Clockwise",
              hint: "Sweep clockwise from 12 o'clock about the centre of the area you drew. For features arranged around a circle." },
            { key: "counterclockwise", label: "Counter-clockwise",
              hint: "The same sweep, the other way round." },
            { key: "polar_sweep", label: "Clockwise from a set angle",
              hint: "A clockwise sweep that starts at an angle you choose, for a circular pattern whose first feature is not at 12 o'clock." },
        ],
    },
];

// ── row clustering ───────────────────────────────────────────────────────────

/**
 * Physical row tolerances, in inches on the sheet. See the header for how
 * these were derived from the original's pixel values.
 */
export const ROW_TOLERANCE_INCHES = {
    /** Within one grid cell, where the span is short. */
    gridCell: 40 / 250,
    /** Across a whole page, kept tighter so distant rows do not merge. */
    page: 30 / 250,
} as const;

/** Assumed sheet height when the real one is unknown - A3/A4 short edge. */
export const FALLBACK_PAGE_HEIGHT_INCHES = 11.69;

/**
 * The row tolerance as a percentage of page height, which is the space
 * annotation coordinates live in.
 */
export function rowTolerancePct(
    kind: keyof typeof ROW_TOLERANCE_INCHES,
    pageHeightInches: number = FALLBACK_PAGE_HEIGHT_INCHES
): number {
    const h = pageHeightInches > 0 ? pageHeightInches : FALLBACK_PAGE_HEIGHT_INCHES;
    return (ROW_TOLERANCE_INCHES[kind] / h) * 100;
}

/** The point a balloon sorts by: its marker if set, else its box corner. */
export function sortCoord(a: BalloonAnnotation): { x: number; y: number } {
    // Mirrors _get_item_sort_coord, which prefers the OCR anchor and falls
    // back to the item's own position when the anchor is still at the origin.
    if (a.balloonX || a.balloonY) return { x: a.balloonX, y: a.balloonY };
    return { x: a.rect.x, y: a.rect.y };
}

/**
 * Group balloons into visual rows, top to bottom.
 *
 * The row's anchor is the Y of its FIRST member and does not move as members
 * join. That matters: comparing against a running last-Y instead would let a
 * column of balloons each within tolerance of the previous one drift into a
 * single row of unbounded height.
 */
export function clusterVisualRows(
    anns: BalloonAnnotation[],
    yTolerance: number
): BalloonAnnotation[][] {
    const entries = anns
        .map(a => ({ a, ...sortCoord(a) }))
        .sort((p, q) => p.y - q.y);
    if (!entries.length) return [];

    const rows: (typeof entries)[] = [];
    let current = [entries[0]];
    let anchorY = entries[0].y;

    for (const e of entries.slice(1)) {
        if (e.y - anchorY <= yTolerance) {
            current.push(e);
        } else {
            rows.push(current);
            current = [e];
            anchorY = e.y;
        }
    }
    rows.push(current);
    return rows.map(r => r.map(e => e.a));
}

/** Rows top to bottom, every row left to right. */
export function sortByReadingOrder(
    anns: BalloonAnnotation[],
    yTolerance: number
): BalloonAnnotation[] {
    return clusterVisualRows(anns, yTolerance).flatMap(row =>
        [...row].sort((a, b) => sortCoord(a).x - sortCoord(b).x));
}

/**
 * Rows top to bottom, alternating direction - left to right, then right to
 * left, then left to right again (boustrophedon).
 *
 * This, not reading order, is what the original uses for a whole page with no
 * grid: it keeps consecutive numbers physically adjacent instead of jumping
 * back across the sheet at every row break.
 */
export function sortBySnakeRows(
    anns: BalloonAnnotation[],
    yTolerance: number
): BalloonAnnotation[] {
    return clusterVisualRows(anns, yTolerance).flatMap((row, i) => {
        const sorted = [...row].sort((a, b) => sortCoord(a).x - sortCoord(b).x);
        return i % 2 === 1 ? sorted.reverse() : sorted;
    });
}

// ── circular strategies ──────────────────────────────────────────────────────

/**
 * Balloons within this many degrees of each other count as the same direction
 * and are then ordered near-to-far.
 *
 * The original's reasoning, kept because the number looks arbitrary otherwise:
 * too wide and several dimensions stacked on one side collapse into a single
 * direction, whose near-to-far ordering then reads as jumping numbers; too
 * narrow and pixel-level jitter splits neighbours that should be consecutive.
 */
export const ANGLE_GROUP_TOLERANCE_DEGREES = 3.0;

function areaCenter(
    anns: BalloonAnnotation[],
    center?: { x: number; y: number }
): { x: number; y: number } {
    if (center) return center;
    const cs = anns.map(sortCoord);
    return {
        x: cs.reduce((s, c) => s + c.x, 0) / cs.length,
        y: cs.reduce((s, c) => s + c.y, 0) / cs.length,
    };
}

/**
 * Sweep about a centre, grouping near-equal angles and ordering each group
 * near-to-far.
 *
 * `atan2(dx, -dy)` - note the argument order and the negated dy - puts 0 at
 * 12 o'clock and increases clockwise, which is what a screen's downward Y
 * axis requires.
 */
function sortByAngleGroups(
    anns: BalloonAnnotation[],
    center: { x: number; y: number },
    angleFn: (angle: number) => number,
    toleranceDegrees: number
): BalloonAnnotation[] {
    const TWO_PI = Math.PI * 2;
    const tolerance = (toleranceDegrees * Math.PI) / 180;

    const entries = anns.map((a, index) => {
        const c = sortCoord(a);
        const dx = c.x - center.x;
        const dy = c.y - center.y;
        let angle = Math.atan2(dx, -dy);
        if (angle < 0) angle += TWO_PI;
        return {
            a, index,
            sweep: angleFn(angle),
            distance: Math.hypot(dx, dy),
        };
    });

    entries.sort((p, q) => p.sweep - q.sweep);

    const groups: (typeof entries)[] = [];
    let current: typeof entries = [];
    let anchor: number | null = null;
    for (const e of entries) {
        if (anchor === null || e.sweep - anchor <= tolerance) {
            current.push(e);
            if (anchor === null) anchor = e.sweep;
        } else {
            groups.push(current);
            current = [e];
            anchor = e.sweep;
        }
    }
    if (current.length) groups.push(current);

    return groups.flatMap(g =>
        [...g]
            // Near-to-far, and stable on the original order when equidistant.
            .sort((p, q) => (p.distance - q.distance) || (p.index - q.index))
            .map(e => e.a));
}

// ── partition (the grid-aware default) ───────────────────────────────────────

/**
 * Group by grid cell, walk the cells in grid order, read each cell normally.
 *
 * Port of _sort_items_by_partition. With no grid on the sheet it degrades to
 * the whole-page snake, exactly as the original does.
 */
export function sortByPartition(
    anns: BalloonAnnotation[],
    grid: GridSystem | null,
    pageHeightInches?: number
): BalloonAnnotation[] {
    if (!grid)
        return sortBySnakeRows(anns, rowTolerancePct("page", pageHeightInches));

    const cells = new Map<string, BalloonAnnotation[]>();
    const unmatched: BalloonAnnotation[] = [];
    for (const a of anns) {
        if (!parseGridCell(a.section)) {
            unmatched.push(a);
            continue;
        }
        const key = String(a.section).trim().toUpperCase();
        let bucket = cells.get(key);
        if (!bucket) cells.set(key, bucket = []);
        bucket.push(a);
    }

    const inCell = rowTolerancePct("gridCell", pageHeightInches);
    // Shares cellOrderKey with the rest of the widget so cell ordering cannot
    // drift from the ordering the server's GridSorter applies.
    const names = [...cells.keys()].sort((p, q) =>
        compareKeys(cellOrderKey(p, grid), cellOrderKey(q, grid)));

    const out: BalloonAnnotation[] = [];
    for (const name of names)
        out.push(...sortByReadingOrder(cells.get(name)!, inCell));
    // Whatever the grid could not place goes last, still in reading order.
    if (unmatched.length)
        out.push(...sortByReadingOrder(unmatched, inCell));
    return out;
}

// ── the entry point ──────────────────────────────────────────────────────────

export interface AreaSortOptions {
    mode: AreaSortMode | string;
    /** Degrees clockwise from 12 o'clock; only polar_sweep uses it. */
    startAngle?: number;
    /** Centre of the drawn area, for the circular modes. */
    center?: { x: number; y: number };
    grid?: GridSystem | null;
    /** Real page height, so the row tolerance lands at the right percentage. */
    pageHeightInches?: number;
}

/** Apply one sort mode to one area's balloons. */
export function sortArea(
    anns: BalloonAnnotation[],
    opts: AreaSortOptions
): BalloonAnnotation[] {
    const mode = normalizeSortMode(opts.mode);
    if (anns.length < 2) return [...anns];

    const byX = (s: 1 | -1) => [...anns].sort((a, b) =>
        s * (sortCoord(a).x - sortCoord(b).x) || (sortCoord(a).y - sortCoord(b).y));
    const byY = (s: 1 | -1) => [...anns].sort((a, b) =>
        s * (sortCoord(a).y - sortCoord(b).y) || (sortCoord(a).x - sortCoord(b).x));

    const TWO_PI = Math.PI * 2;
    const center = areaCenter(anns, opts.center);
    const tol = ANGLE_GROUP_TOLERANCE_DEGREES;

    switch (mode) {
        case "left_to_right":  return byX(1);
        case "right_to_left":  return byX(-1);
        case "top_to_bottom":  return byY(1);
        case "bottom_to_top":  return byY(-1);
        case "reading_order":
            return sortByReadingOrder(
                anns, rowTolerancePct("gridCell", opts.pageHeightInches));
        case "clockwise":
            return sortByAngleGroups(anns, center, a => a, tol);
        case "counterclockwise":
            return sortByAngleGroups(anns, center,
                a => (TWO_PI - a) % TWO_PI, tol);
        case "polar_sweep": {
            const start = ((opts.startAngle ?? 0) * Math.PI) / 180;
            return sortByAngleGroups(anns, center,
                a => ((a - start) % TWO_PI + TWO_PI) % TWO_PI, tol);
        }
        case "partition":
        default:
            return sortByPartition(anns, opts.grid ?? null, opts.pageHeightInches);
    }
}
