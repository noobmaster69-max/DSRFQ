/**
 * Always-filter keywords - OCR phrases that never belong on a balloon.
 *
 * Ported from the PyQt tool at RPA/Bubble:
 *     utils/ocr_keyword_filter.py       -> normalise, dedupe, sort, match
 *     ui/dialogs/keyword_filter_dialog.py -> the editor
 *
 * Recognition returns every piece of text it finds, and a drawing is full of
 * text that is not a characteristic: view labels ("SECTION A-A", "DETAIL B"),
 * "TYP", "FOR REFERENCE ONLY", the sheet's own boilerplate. Ballooning those
 * gives the inspector a list padded with things that cannot be measured.
 *
 * Matching is a case-insensitive substring test on NFKC-normalised text with
 * runs of whitespace collapsed - so "Break  Out" matches "BREAK OUT", and a
 * full-width character pasted from a Chinese title block matches its ASCII
 * twin. A phrase, not a word: "NOTE" is meant to catch "SEE NOTE 4".
 */

import { getSetting, setSetting } from "./BallooningSettingsStore";

/**
 * The list the original ships with. Everything here is a phrase seen on real
 * drawings that recognition kept picking up.
 */
export const DEFAULT_ALWAYS_FILTER_KEYWORDS: readonly string[] = [
    "TYP",
    "OPEN",
    "SYM",
    "SCALE",
    "MARKED",
    "NOTE",
    "NOTES",
    "SECTION",
    "DETAIL",
    "BREAK-OUT",
    "BREAKOUT",
    "BREAK OUT",
    "FROM DATUM FEATURE C",
    "BREAK-OUT SECTION",
    "FRONT COLUMN",
    "ALIGNMENTMARKER SIDE",
    "ARDCOP ES ARE TO BE CONSIDERED UNCONTROLLED",
    "VIEWS FOR REFERENCE ONLY",
    "ALL BEND DIMENSIONS",
    "FLAT PATTERN",
    "FOR REFERENCE ONLY",
    "3D VIEWS",
    "ALL LOCATIONS LABELED",
];

/**
 * Normalise for display and matching.
 *
 * NFKC folds full-width and compatibility characters onto their plain
 * equivalents, which matters because OCR of a CJK title block emits them and
 * they would otherwise never match a keyword typed on an ASCII keyboard.
 */
export function normalizeKeyword(value: unknown): string {
    return String(value ?? "")
        .normalize("NFKC")
        .replace(/\s+/g, " ")
        .trim();
}

/** Normalise, drop blanks, and drop case-insensitive duplicates. */
export function normalizeKeywordList(values: Iterable<unknown>): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const v of values) {
        const k = normalizeKeyword(v);
        if (!k) continue;
        const key = k.toLowerCase();
        if (seen.has(key)) continue;
        // Keeps the first spelling, as the original does - so a list already
        // holding "Break Out" is not silently recased by a later "BREAK OUT".
        seen.add(key);
        out.push(k);
    }
    return out;
}

/** Normalised, deduplicated and sorted, ignoring case. */
export function sortKeywordList(values: Iterable<unknown>): string[] {
    return normalizeKeywordList(values)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

/**
 * The comparison form: normalised, lowercased, and with ALL spaces removed.
 *
 * Removing spaces rather than merely collapsing them is a deliberate departure
 * from the original, and it exists because of what recognition actually
 * returns. On a real drawing the view labels come back as "SEEVIEWD" and
 * "TOPVIEW" - the engine drops the space entirely - so an operator who types
 * the phrase as it is printed, "SEE VIEW", matches nothing and reasonably
 * concludes the filter is broken.
 *
 * The risk is that two words run together match something they should not.
 * That is slight here: these are deliberate operator-entered phrases, not
 * generated patterns, and the alternative is a filter that fails on exactly
 * the labels it exists to remove.
 */
function comparable(value: unknown): string {
    return normalizeKeyword(value).toLowerCase().replace(/\s+/g, "");
}

/**
 * The first keyword contained in `text`, or null.
 *
 * Returns the keyword rather than a boolean so the UI can say WHICH phrase
 * caught a balloon - without that, a filtered list is unexplainable and the
 * operator cannot tell a good rule from an over-broad one.
 */
export function findMatchingKeyword(
    text: unknown,
    keywords: Iterable<unknown>,
    keywordsNormalized = false
): string | null {
    const haystack = comparable(text);
    if (!haystack) return null;

    const list = keywordsNormalized
        ? (keywords as Iterable<string>)
        : normalizeKeywordList(keywords);
    for (const k of list) {
        const needle = comparable(k);
        if (needle && haystack.includes(needle)) return k;
    }
    return null;
}

// ── persistence ─────────────────────────────────────────────────────────────

/**
 * The list is an application-level setting, not a per-part one - the phrases
 * that are noise on one of this shop's drawings are noise on all of them. The
 * original keeps it in QSettings for the same reason; here it is a column on
 * MasterSettings, so it is the same list for every operator.
 */
export function loadAlwaysFilterKeywords(): string[] {
    try {
        const raw = getSetting('keywords');
        // Never saved is not the same as saved-empty: an operator who clears
        // the list means it, and must not have the defaults handed back.
        if (raw === null) return sortKeywordList(DEFAULT_ALWAYS_FILTER_KEYWORDS);
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? sortKeywordList(parsed) : [];
    } catch {
        return sortKeywordList(DEFAULT_ALWAYS_FILTER_KEYWORDS);
    }
}

export function saveAlwaysFilterKeywords(keywords: Iterable<unknown>): string[] {
    const list = sortKeywordList(keywords);
    setSetting('keywords', JSON.stringify(list));
    return list;
}

// ── applying ────────────────────────────────────────────────────────────────

export interface FilterCandidate {
    id: string;
    content: string;
    isNote?: boolean;
}

export interface FilterHit<T> {
    item: T;
    keyword: string;
}

/**
 * Which balloons a keyword list would catch.
 *
 * Notes are exempt. A note is meant to be prose - "1. IDENTIFY WITH SUPPLIER
 * NAME OR CODE." contains "IDENTIFY" and would be caught by almost any list,
 * and filtering notes is not what this setting is for.
 */
export function findFiltered<T extends FilterCandidate>(
    items: T[], keywords: Iterable<unknown>
): FilterHit<T>[] {
    const list = normalizeKeywordList(keywords);
    const hits: FilterHit<T>[] = [];
    for (const item of items) {
        if (item.isNote) continue;
        const keyword = findMatchingKeyword(item.content, list, true);
        if (keyword) hits.push({ item, keyword });
    }
    return hits;
}
