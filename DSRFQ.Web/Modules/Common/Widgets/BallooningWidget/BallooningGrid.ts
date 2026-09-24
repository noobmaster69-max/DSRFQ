/**
 * Where the sheet's grid lines actually are, so a balloon's cell can be
 * recomputed from its position.
 *
 * Ported from One Supply (C:\Aizera\RPA\Bubble), `utils/grid_geometry.py`.
 *
 * DSRFQ already knew the grid's EXTENT and DIRECTION - parseGridSystem, from
 * the sheet's two corner labels - and used it to sort. What it had no idea of
 * was the geometry: where on the page the lines between D and E, or between 3
 * and 4, physically fall. Without that, `section` is whatever recognition
 * decided and there is no way to correct it, which is the gap this fills.
 *
 * Everything here is in PAGE PERCENTAGES, not pixels. That is the unit the rest
 * of the widget stores positions in, and it means a profile survives the page
 * being re-rendered at a different resolution - which the original, working in
 * scene coordinates, does not have to worry about.
 *
 * ── the axis convention, which is easy to get backwards ──
 *
 * The original names its axes `row` and `col`, and maps `row` to X and `col` to
 * Y. Its own GridSorter docstring says the opposite, and that comment is the
 * misleading one: GridSorter only ever parses LABELS, never pixels, so its
 * row/col naming never touches geometry. Only this module maps to a position,
 * and it does so as:
 *
 *     letter-first sheet ("D8"):  numbers run ACROSS (x), letters run DOWN (y)
 *     number-first sheet ("8D"):  letters run ACROSS (x), numbers run DOWN (y)
 *
 * The first is the ordinary drawing frame - 1..8 along the top, A..D down the
 * side - and checking that a "D8" sheet yields 8 columns and 4 rows is the
 * quickest way to confirm this has not been transposed.
 */

import type { GridCell } from './BallooningNumbering';
import {
    REGION_UNMATCHED, letterOrdinal, parseGridCell,
} from './BallooningNumbering';

/** Closest two lines may be dragged, in page percent. */
export const MIN_GRID_GAP = 0.5;

/**
 * The boundary lines of one page's grid, in page percent, ascending.
 *
 * Both arrays include the outer borders, so a sheet with 8 columns has 9
 * xLines. That is what makes a profile checkable against the sheet's declared
 * extent rather than merely plausible.
 */
export interface GridProfile {
    xLines: number[];
    yLines: number[];
}

/**
 * The sheet's extent, resolved onto physical axes.
 *
 * `row` varies along X and `col` along Y, following the original. Which of
 * them carries the letters depends on how the sheet writes its labels.
 */
export interface GridExtent {
    rowStart: number;
    rowEnd: number;
    rowDirection: 1 | -1;
    rowIsLetter: boolean;
    colStart: number;
    colEnd: number;
    colDirection: 1 | -1;
    colIsLetter: boolean;
    /** How the sheet writes a cell: "8D" rather than "D8". */
    numberFirst: boolean;
}

const axisValue = (cell: GridCell, wantLetter: boolean) =>
    wantLetter ? letterOrdinal(cell.letter) : cell.number;

/**
 * Resolve the two corner labels onto the physical axes.
 *
 * Null when either label is not a cell - a sheet with no grid, which is
 * common, and which every caller here treats as "nothing to draw".
 */
export function parseGridExtent(
    start: string | null | undefined,
    end: string | null | undefined
): GridExtent | null {
    const a = parseGridCell(start);
    const b = parseGridCell(end);
    if (!a || !b) return null;

    // Letter-first means the letter is the COLUMN - it runs down the page -
    // and the number is the ROW, running across. See the note at the top.
    const rowIsLetter = a.numberFirst;
    const rowStart = axisValue(a, rowIsLetter);
    const rowEnd = axisValue(b, rowIsLetter);
    const colStart = axisValue(a, !rowIsLetter);
    const colEnd = axisValue(b, !rowIsLetter);

    return {
        rowStart, rowEnd,
        rowDirection: rowEnd >= rowStart ? 1 : -1,
        rowIsLetter,
        colStart, colEnd,
        colDirection: colEnd >= colStart ? 1 : -1,
        colIsLetter: !rowIsLetter,
        numberFirst: a.numberFirst,
    };
}

/**
 * How many boundary lines each axis needs: cells + 1, plus one for the far
 * border, hence +2 on the span.
 */
export function expectedLineCounts(extent: GridExtent): [number, number] {
    return [
        Math.abs(extent.rowEnd - extent.rowStart) + 2,
        Math.abs(extent.colEnd - extent.colStart) + 2,
    ];
}

/** Does this profile describe the grid the sheet declares? */
export function isProfileValidFor(profile: GridProfile, extent: GridExtent): boolean {
    const [x, y] = expectedLineCounts(extent);
    return profile.xLines.length === x && profile.yLines.length === y;
}

export interface GridBounds { x: number; y: number; width: number; height: number; }

/** Equal spacing across the given bounds - where an adjustment starts from. */
export function buildEqualProfile(extent: GridExtent, bounds: GridBounds): GridProfile {
    const [xCount, yCount] = expectedLineCounts(extent);
    const xStep = bounds.width / Math.max(xCount - 1, 1);
    const yStep = bounds.height / Math.max(yCount - 1, 1);
    return {
        xLines: Array.from({length: xCount}, (_, i) => bounds.x + i * xStep),
        yLines: Array.from({length: yCount}, (_, i) => bounds.y + i * yStep),
    };
}

/**
 * A profile read back from storage, or null if it is not usable.
 *
 * Ascending is required rather than sorted-into-place: lines that arrived out
 * of order mean something wrote them wrongly, and quietly sorting them would
 * turn a bug into a subtly wrong grid.
 */
export function profileFromValues(
    xValues: unknown, yValues: unknown
): GridProfile | null {
    const clean = (values: unknown): number[] | null => {
        if (!Array.isArray(values) || values.length < 2) return null;
        const out: number[] = [];
        for (const v of values) {
            const n = Number(v);
            if (!Number.isFinite(n)) return null;
            if (out.length && n <= out[out.length - 1]) return null;
            out.push(n);
        }
        return out;
    };
    const xLines = clean(xValues);
    const yLines = clean(yValues);
    return xLines && yLines ? {xLines, yLines} : null;
}

/** Which interval `value` falls in; clamped, so a point outside lands on the edge. */
function indexInLines(value: number, lines: number[]): number | null {
    if (lines.length < 2) return null;
    const clamped = Math.max(lines[0], Math.min(value, lines[lines.length - 1]));
    let i = 0;
    while (i + 1 < lines.length - 1 && clamped >= lines[i + 1]) i++;
    return Math.min(Math.max(i, 0), lines.length - 2);
}

const label = (value: number, isLetter: boolean): string => {
    if (!isLetter) return String(value);
    // letterOrdinal's inverse, so a sheet running past Z still labels.
    let n = value, out = '';
    while (n > 0) {
        const rem = (n - 1) % 26;
        out = String.fromCharCode(65 + rem) + out;
        n = Math.floor((n - 1) / 26);
    }
    return out || 'A';
};

/**
 * The cell a point falls in, as the sheet would write it.
 *
 * REGION_UNMATCHED when the profile does not match the declared extent, rather
 * than a cell computed against the wrong number of lines - a wrong cell is
 * worse than an honest blank, because it sorts the balloon into the wrong part
 * of the inspection report.
 */
export function belongFromProfile(
    x: number, y: number, extent: GridExtent, profile: GridProfile
): string {
    if (!isProfileValidFor(profile, extent)) return REGION_UNMATCHED;

    const rowIndex = indexInLines(x, profile.xLines);
    const colIndex = indexInLines(y, profile.yLines);
    if (rowIndex === null || colIndex === null) return REGION_UNMATCHED;

    const rowValue = extent.rowStart
        + (extent.rowDirection === 1 ? rowIndex : -rowIndex);
    const colValue = extent.colStart
        + (extent.colDirection === 1 ? colIndex : -colIndex);

    const letter = extent.rowIsLetter
        ? label(rowValue, true) : label(colValue, true);
    const number = extent.rowIsLetter
        ? label(colValue, false) : label(rowValue, false);

    return extent.numberFirst ? `${number}${letter}` : `${letter}${number}`;
}

/**
 * Keep a dragged line between its neighbours.
 *
 * Lines that cross would make indexInLines nonsense - two cells would claim
 * the same span and one would be unreachable - so the drag is bounded rather
 * than validated afterwards.
 */
export function clampLinePosition(
    value: number, previous: number, next: number, minGap = MIN_GRID_GAP
): number {
    const low = previous + minGap;
    const high = next - minGap;
    if (low > high) return (previous + next) / 2;
    return Math.max(low, Math.min(value, high));
}

/** Move one line and return the new profile, leaving the original untouched. */
export function moveLine(
    profile: GridProfile, axis: 'x' | 'y', index: number, value: number
): GridProfile {
    const lines = [...(axis === 'x' ? profile.xLines : profile.yLines)];
    if (index <= 0 || index >= lines.length - 1) {
        // The outer borders are the sheet's edge. Moving one would change what
        // the grid covers rather than where a line inside it sits, so they are
        // dragged as a pair with everything else - not individually here.
        lines[index] = value;
    } else {
        lines[index] = clampLinePosition(value, lines[index - 1], lines[index + 1]);
    }
    return axis === 'x'
        ? {xLines: lines, yLines: profile.yLines}
        : {xLines: profile.xLines, yLines: lines};
}
