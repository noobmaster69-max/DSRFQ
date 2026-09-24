/**
 * Numbering, grid parsing and grid-order sorting for the ballooning widget.
 *
 * All of this is pure logic over plain objects - no DOM, no widget state - so
 * it can be unit tested and reused by the reorder dialogs that will sit on top
 * of it.
 *
 * Two things here mirror code that already exists server-side in
 * RPA/API/BalloonPosition.py and must stay in step with it:
 *
 *   parseGridSystem  <-  GridSorter.parse_grid_system
 *   gridSortKey      <-  GridSorter.get_sort_key
 *
 * The server sorts this way already; until now the browser threw the result
 * away and re-sorted balloons by raw y/x, which is why the on-screen order and
 * the exported order could disagree.
 *
 * A note on the field names, because they are not obvious:
 *
 *   gridStart / gridEnd  are the DRAWING's grid extent (e.g. "F2" -> "A1").
 *                        Every balloon on a page carries the same pair; they
 *                        describe the sheet, not the balloon. They come from
 *                        the model's `start` / `end`.
 *   section              is the BALLOON's own grid cell (e.g. "D8"), what the
 *                        model calls `belong`. "" or "UNMATCHED" means the
 *                        model could not place it.
 */

import type { BalloonAnnotation } from "./BallooningTypes";
import { getSetting, setSetting } from "./BallooningSettingsStore";

// ── sub-numbering ────────────────────────────────────────────────────────────

/**
 * Separators offered for child numbers. A child renders as 5-1 or 5.1 and is
 * NOT a member of the integer sequence: the balloon after 5-1 is 6, not 7.
 * That is the whole point of a sub-number - it lets an inspector add a
 * characteristic to an approved print without renumbering everything after it.
 */
/**
 * The common ones, offered as a hint next to the field - not a closed list.
 * Any mark a shop writes is allowed; see isValidSubSeparator for the three
 * that are not, and why.
 */
export const SUB_SEPARATORS = ["-", ".", "/"] as const;

/** Whatever the shop writes between a parent and its child. */
export type SubSeparator = string;

export const DEFAULT_SUB_SEPARATOR: SubSeparator = "-";

/** Longest separator accepted, matching One Supply's own limit. */
export const MAX_SUB_SEPARATOR_LENGTH = 3;

/**
 * Is this usable as a sub-number separator?
 *
 * Free text, because which mark a shop writes is its business - but three
 * things genuinely break, rather than merely look odd, because the composite
 * is stored in BalloonNo as text and parsed back out of it:
 *
 *   a DIGIT would merge with the numbers either side: "5" + "1" + "1" reads
 *   as 511, and there is nothing in the text to say otherwise.
 *
 *   WHITESPACE is already skipped around the separator when parsing, so a
 *   space would make "5 1" mean both "child 1 of 5" and a typo for 51.
 *
 *   "_" is INSTANCE_SEPARATOR below: a balloon covering four features lists as
 *   44_1 … 44_4, so "5_1" would mean either the first instance of balloon 5 or
 *   child 1 of balloon 5, with nothing to tell them apart.
 *
 * Everything else round-trips, because parseBalloonNumber reads the separator
 * as "whatever non-digit sits between the two numbers" rather than from a
 * fixed list - so a drawing keeps loading after the setting changes.
 */
export function isValidSubSeparator(value: string | null | undefined): boolean {
    const s = String(value ?? "");
    if (!s || s.length > MAX_SUB_SEPARATOR_LENGTH) return false;
    return !/[\d\s_]/.test(s);
}

/**
 * The separator to print child numbers with.
 *
 * A house convention, not a property of one drawing - which mark this shop
 * writes between a parent and its child. Held in MasterSettings so it is the
 * same mark for every operator; it used to be per browser, which meant two
 * people could write "5-1" and "5.1" on the same sheet.
 *
 * An unusable value falls back to the default rather than being trusted - see
 * isValidSubSeparator for what "unusable" means and why it is only three
 * things.
 */
export function loadSubSeparator(): SubSeparator {
    const saved = getSetting('separator');
    return isValidSubSeparator(saved) ? saved as SubSeparator : DEFAULT_SUB_SEPARATOR;
}

export function saveSubSeparator(separator: SubSeparator): void {
    setSetting('separator', separator);
}

/** The identity fields of a balloon's number. */
export interface BalloonNumber {
    /** Parent integer - the position in the sequence. */
    balloonNumber: number;
    /** 1-based child index, or undefined for a top-level balloon. */
    subNumber?: number;
}

/** "5" or "5-1", as printed on the balloon and stored in BalloonNo. */
export function formatBalloonNumber(
    n: BalloonNumber,
    separator: SubSeparator = DEFAULT_SUB_SEPARATOR
): string {
    const parent = Number.isFinite(n.balloonNumber) ? n.balloonNumber : 0;
    return n.subNumber ? `${parent}${separator}${n.subNumber}` : String(parent);
}

/**
 * Inverse of formatBalloonNumber, whatever separator was used to write it.
 *
 * Reads the separator structurally - "the non-digits between the two numbers"
 * - rather than matching a fixed list. That is what lets the setting be free
 * text: a drawing saved as "5.1" still loads after the shop switches to "~",
 * and one saved as "5~1" still loads after they switch back. A fixed list
 * would turn every drawing written under the old mark into balloon 0 the day
 * the setting changed.
 *
 * "_" is excluded, and only "_": it means an instance, so "44_1" is the first
 * of balloon 44's four features, not a child of 44. Anything else unparseable
 * yields balloonNumber 0, which sorts first and is visibly wrong rather than
 * silently dropped.
 */
export function parseBalloonNumber(text: string | number | null | undefined): BalloonNumber {
    if (typeof text === "number")
        return { balloonNumber: Number.isFinite(text) ? text : 0 };

    const raw = String(text ?? "").trim();
    const m = /^(\d+)\s*([^\d\s_]{1,3})\s*(\d+)$/.exec(raw);
    if (m)
        return { balloonNumber: Number(m[1]), subNumber: Number(m[3]) };

    const n = parseInt(raw, 10);
    return { balloonNumber: Number.isFinite(n) ? n : 0 };
}

/** Orders 5, 5-1, 5-2, 6 - a child immediately after its parent. */
export function compareBalloonNumber(a: BalloonNumber, b: BalloonNumber): number {
    return (a.balloonNumber - b.balloonNumber) || ((a.subNumber ?? 0) - (b.subNumber ?? 0));
}

/** The next unused child index under `parent`, within the supplied set. */
export function nextSubNumber(anns: BalloonNumber[], parent: number): number {
    const used = anns
        .filter(a => a.balloonNumber === parent && a.subNumber)
        .map(a => a.subNumber as number);
    return used.length ? Math.max(...used) + 1 : 1;
}

// ── instances (the quantity multiplier) ─────────────────────────────────────

/**
 * Separates a balloon from its instance number: 44 with quantity 2 lists as
 * 44_1 and 44_2.
 *
 * Deliberately not the sub-number separator. A child (44-1) and an instance
 * (44_1) are different things - one is an extra characteristic added to the
 * print, the other is the same characteristic measured on several features -
 * and an inspector reading the report has to be able to tell them apart.
 */
export const INSTANCE_SEPARATOR = "_";

export interface BalloonInstance<T> {
    ann: T;
    /** 1-based position within this balloon. */
    instance: number;
    /** How many features this balloon covers. 1 when there is no multiplier. */
    count: number;
    /** "44" for a single, "44_1" / "44_2" when the balloon covers several. */
    label: string;
}

/** How many features a balloon covers - its multiplier, or 1. */
export function instanceCount(ann: { quantity?: number }): number {
    const n = Number(ann?.quantity);
    return Number.isFinite(n) && n >= 2 ? Math.floor(n) : 1;
}

/**
 * One entry per feature, for the characteristic list.
 *
 * "4X Ø.250" is ONE balloon on the drawing but FOUR things to measure, and an
 * inspection report has a line for each. The balloon itself is untouched -
 * this only expands how it is listed.
 */
export function expandByQuantity<T extends BalloonNumber & { quantity?: number }>(
    anns: T[],
    separator: SubSeparator = DEFAULT_SUB_SEPARATOR
): BalloonInstance<T>[] {
    const out: BalloonInstance<T>[] = [];
    for (const ann of anns) {
        const base = formatBalloonNumber(ann, separator);
        const count = instanceCount(ann);
        if (count === 1) {
            out.push({ ann, instance: 1, count: 1, label: base });
            continue;
        }
        for (let i = 1; i <= count; i++)
            out.push({
                ann, instance: i, count,
                label: `${base}${INSTANCE_SEPARATOR}${i}`,
            });
    }
    return out;
}

// ── region (the balloon's own grid cell) ─────────────────────────────────────

/** What the model reports when it cannot place an item in the grid. */
export const REGION_UNMATCHED = "UNMATCHED";

export interface GridCell {
    /** The letter part, uppercased. Multi-letter ("AA") is supported. */
    letter: string;
    /** The numeric part. */
    number: number;
    /** True when the label was written number-first ("8D" rather than "D8"). */
    numberFirst: boolean;
}

/**
 * Parse a cell label in either order, or null if it is not a cell.
 *
 * Both orders exist in the wild and the Adjust Grid dialog lets the operator
 * choose which one a sheet uses, so neither can be assumed.
 */
export function parseGridCell(label: string | null | undefined): GridCell | null {
    const raw = String(label ?? "").trim().toUpperCase();
    if (!raw || raw === REGION_UNMATCHED) return null;

    let m = /^([A-Z]+)(\d+)$/.exec(raw);
    if (m) return { letter: m[1], number: Number(m[2]), numberFirst: false };

    m = /^(\d+)([A-Z]+)$/.exec(raw);
    if (m) return { letter: m[2], number: Number(m[1]), numberFirst: true };

    return null;
}

export function formatGridCell(cell: GridCell): string {
    return cell.numberFirst
        ? `${cell.number}${cell.letter}`
        : `${cell.letter}${cell.number}`;
}

/** True when this balloon has no usable grid cell. */
export function isUnmatched(ann: Pick<BalloonAnnotation, "section">): boolean {
    return parseGridCell(ann.section) === null;
}

/**
 * Spreadsheet-style letter ordinal: A=1, Z=26, AA=27.
 *
 * The Python uses a bare ord() on a single character, so it cannot order a
 * sheet that runs past Z. This agrees with it for A-Z and keeps going.
 */
export function letterOrdinal(letters: string): number {
    let n = 0;
    for (const ch of letters.toUpperCase())
        n = n * 26 + (ch.charCodeAt(0) - 64);
    return n;
}

// ── drawing grid (the sheet's extent and direction) ──────────────────────────

export interface GridSystem {
    /** Ordinal of the letter axis at the start corner. */
    letterStart: number;
    /** Value of the number axis at the start corner. */
    numberStart: number;
    /** +1 when the letter axis ascends from start to end, -1 when it descends. */
    letterDirection: 1 | -1;
    /** +1 when the number axis ascends from start to end, -1 when it descends. */
    numberDirection: 1 | -1;
    /** Whether the sheet labels cells number-first. */
    numberFirst: boolean;
}

/**
 * Derive the grid's origin and direction from its two corner labels.
 *
 * Port of GridSorter.parse_grid_system. Start "F2" with end "A1" means the
 * letter axis runs F->A and the number axis 2->1, so both are descending and a
 * balloon in D8 sorts by its distance from F2, not from A1.
 */
export function parseGridSystem(
    start: string | null | undefined,
    end: string | null | undefined
): GridSystem | null {
    const a = parseGridCell(start);
    const b = parseGridCell(end);
    if (!a || !b) return null;

    const letterStart = letterOrdinal(a.letter);
    const letterEnd = letterOrdinal(b.letter);
    return {
        letterStart,
        numberStart: a.number,
        letterDirection: letterEnd >= letterStart ? 1 : -1,
        numberDirection: b.number >= a.number ? 1 : -1,
        numberFirst: a.numberFirst,
    };
}

/** The grid a page declares, read off any balloon on it (they all agree). */
export function pageGridSystem(
    anns: BalloonAnnotation[],
    pageIndex: number
): GridSystem | null {
    const on = anns.find(
        a => a.pageIndex === pageIndex && a.gridStart && a.gridEnd
    );
    return on ? parseGridSystem(on.gridStart, on.gridEnd) : null;
}

// ── grid-order sorting ───────────────────────────────────────────────────────

/**
 * Sort key for one balloon: [viewId, letterIndex, numberIndex, y, x].
 *
 * Port of GridSorter.get_sort_key. An unmatched balloon gets Infinity on both
 * grid axes so it lands after every placed one but still sorts sensibly
 * against its unmatched neighbours by position.
 */
export function gridSortKey(ann: BalloonAnnotation, grid: GridSystem | null): number[] {
    const viewId = ann.viewId ?? 0;
    const cell = parseGridCell(ann.section);

    if (!cell || !grid)
        return [viewId, Infinity, Infinity, ann.rect.y, ann.rect.x];

    const letterOrd = letterOrdinal(cell.letter);
    const letterIdx = grid.letterDirection === 1
        ? letterOrd - grid.letterStart
        : grid.letterStart - letterOrd;
    const numberIdx = grid.numberDirection === 1
        ? cell.number - grid.numberStart
        : grid.numberStart - cell.number;

    return [viewId, letterIdx, numberIdx, ann.rect.y, ann.rect.x];
}

/**
 * Grid position of a cell LABEL alone, for ordering the cells themselves
 * rather than the balloons in them. [Infinity, Infinity] for a label the grid
 * cannot place, so it sorts last exactly as an unmatched balloon does.
 */
export function cellOrderKey(
    label: string | null | undefined,
    grid: GridSystem | null
): number[] {
    const cell = parseGridCell(label);
    if (!cell || !grid) return [Infinity, Infinity];

    const letterOrd = letterOrdinal(cell.letter);
    return [
        grid.letterDirection === 1
            ? letterOrd - grid.letterStart
            : grid.letterStart - letterOrd,
        grid.numberDirection === 1
            ? cell.number - grid.numberStart
            : grid.numberStart - cell.number,
    ];
}

/** Lexicographic comparison of two sort keys. */
export function compareKeys(a: number[], b: number[]): number {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] === b[i]) continue;
        // Infinity - Infinity is NaN, which would make the sort incoherent.
        if (a[i] === Infinity) return b[i] === Infinity ? 0 : 1;
        if (b[i] === Infinity) return -1;
        return a[i] - b[i];
    }
    return 0;
}

/** Balloons in grid reading order - the order Reorder will renumber in. */
export function sortByGrid(
    anns: BalloonAnnotation[],
    grid: GridSystem | null
): BalloonAnnotation[] {
    return anns
        .map(a => ({ a, k: gridSortKey(a, grid) }))
        .sort((p, q) => compareKeys(p.k, q.k))
        .map(p => p.a);
}
