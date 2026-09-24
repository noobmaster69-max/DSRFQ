/**
 * Classifying balloon text that is not a characteristic to inspect.
 *
 * Ported from One Supply (C:\Aizera\RPA\Bubble):
 *   `utils/dimension_feature_classifier.py` — reference dimensions
 *   `utils/ocr_filter.py` + `ENGINEERING_ANNOTATION_PATTERNS` — English noise
 *
 * Distinct from the keyword filter next door, which matches phrases the
 * operator listed. These are structural: a parenthesised number is a reference
 * dimension by the rules of drafting, whoever drew it, and prose that OCR
 * scraped off a note block is noise on any sheet.
 *
 * Everything here is a CLASSIFIER. Nothing removes anything — the widget shows
 * the counts and the operator decides, the same as the keyword filter. A
 * silent auto-remove would be indistinguishable from recognition having missed
 * the dimension in the first place.
 */

import { getSetting, setSetting } from "./BallooningSettingsStore";

/**
 * A quantity prefix, which is never part of what is being classified.
 *
 * The closing bracket may fall either side of the multiply sign - drawings
 * write both `(3\u00D7)` and `(3)\u00D7`, and OCR reproduces whichever it saw.
 */
const QUANTITY_PREFIX = /^\s*\(?\s*(\d+)\s*(?:\)\s*)?[Xx\u00D7]\s*(?:\)\s*)?/;

/**
 * Strip "4X", "2x", "(3×)" from the front. Port of `strip_quantity_prefix`.
 *
 * One Supply bounds the quantity at 2..99; below 2 is not a repeat and above
 * 99 is far more likely to be a misread dimension than a real count.
 */
export function stripQuantityPrefix(text: string): {quantity: number; content: string} {
    const s = String(text ?? '').trim();
    const m = s.match(QUANTITY_PREFIX);
    if (!m) return {quantity: 1, content: s};
    const q = parseInt(m[1], 10);
    if (!(q >= 2 && q <= 99)) return {quantity: 1, content: s};
    const rest = s.slice(m[0].length).trim();
    if (!rest) return {quantity: 1, content: s};
    return {quantity: q, content: rest};
}

/**
 * A reference dimension: the whole value wrapped in brackets, e.g. `(50)`.
 *
 * Port of `is_reference_dimension_text`, including the full-width brackets -
 * drawings from a CJK CAD seat use （）and the OCR reproduces them.
 *
 * A reference dimension is stated for convenience and is NOT inspected; it is
 * derived from other dimensions on the sheet. Ballooning one produces an
 * inspection line for something nobody measures.
 */
const REFERENCE_PATTERN = /^\s*[(\uFF08].+?[)\uFF09]\s*$/;

export function isReferenceDimension(text: string | null | undefined): boolean {
    const {content} = stripQuantityPrefix(String(text ?? ''));
    return !!content && REFERENCE_PATTERN.test(content);
}

/**
 * Words that belong ON a dimension and must never make it look like prose.
 *
 * From One Supply's suffix whitelist and ENGINEERING_ANNOTATION_PATTERNS. THRU
 * is the one that matters most: `2X ⌀6.10 THRU` is a hole, and dropping it for
 * containing letters would lose a real characteristic.
 */
const ENGINEERING_WORDS = new Set([
    'THRU', 'TYP', 'REF', 'SLOT', 'DIA', 'DEEP', 'DP', 'MIN', 'MAX', 'NOM',
    'CBORE', 'CSK', 'C\u2019BORE', 'PLCS', 'PLACES', 'EACH', 'BOTH', 'SIDES',
    'FULL', 'RAD', 'CHAM', 'NON', 'ACCUM', 'TOL', 'ALL', 'AROUND',
]);

/**
 * Text shapes that are engineering notation, not prose.
 *
 * Ported from ENGINEERING_ANNOTATION_PATTERNS. The first four are the ones that
 * carry letters and would otherwise be filtered as noise.
 */
const ENGINEERING_PATTERNS: RegExp[] = [
    // Threads: M8, M 8, M8X1.25, M8x1.25-6H
    /^M\s*\d+(?:\.\d+)?(?:\s*[Xx\u00D7]\s*\d+(?:\.\d+)?)?(?:\s*-?\s*\d+[A-Za-z]+)?$/i,
    // Radius, and surface roughness Ra/Rz
    /^R\s*\d+(?:\.\d+)?$/i,
    /^R[az]\s*\d+(?:\.\d+)?$/i,
    // Surface grade, or a bare datum letter
    /^N\s*\d*$/i,
    // A bare quantity prefix - often its own OCR box awaiting a merge
    /^\d+\s*[Xx\u00D7]$/,
];

/** Anything that makes a string unmistakably a dimension rather than a sentence. */
const DIMENSION_SIGNALS = /[\u00D8\u2300\u2205\u00B0\u00B1\u2220\u2316\u25B1\u232D\u2312\u2313\u2225\u22A5\u27C2\u25CE\u232F\u2197\u2330\u23E4\u2334]/;

/** True when the text is engineering notation and must be kept whole. */
export function looksLikeEngineering(text: string): boolean {
    const s = String(text ?? '').trim();
    if (!s) return true;
    // No letters at all - a pure number or symbol string is always a dimension.
    if (!/[A-Za-z]/.test(s)) return true;
    if (DIMENSION_SIGNALS.test(s)) return true;

    const {content} = stripQuantityPrefix(s);
    if (ENGINEERING_PATTERNS.some(p => p.test(content))) return true;

    // A number followed only by whitelisted engineering words: ".500 THRU",
    // "2X .250 TYP". Every word has to be on the list, or it is prose.
    const words = content.split(/\s+/).filter(Boolean);
    const hasNumber = words.some(w => /\d/.test(w));
    if (!hasNumber) return false;
    return words.every(w => /^[^A-Za-z]*$/.test(w)
        || ENGINEERING_WORDS.has(w.replace(/[^A-Za-z\u2019]/g, '').toUpperCase()));
}

export interface NoiseVerdict {
    /** The text is prose and carries no characteristic. */
    filter: boolean;
    /**
     * The dimension recovered from the front of a noisy string, when there was
     * one: `R11.5 ALL AROUND` -> `R11.5`. Undefined when nothing was salvaged.
     */
    salvaged?: string;
}

/**
 * Is this English noise, and can a dimension be rescued from it?
 *
 * Port of `resolve_english_noise_filter`. The order is the whole design:
 *
 *   1. Engineering notation is kept whole, letters and all.
 *   2. Otherwise try to salvage a dimension from the FRONT, dropping trailing
 *      words - `R11.5 ALL AROUND` is a real radius with a note stuck to it.
 *   3. Only then call it noise.
 *
 * One Supply's rule that a salvage must not produce a bare quantity is kept:
 * `6X TOL NON-ACCUM` must not become `6X`, which is a count of nothing.
 */
export function resolveEnglishNoise(text: string | null | undefined): NoiseVerdict {
    const s = String(text ?? '').trim();
    if (!s) return {filter: false};
    if (!/[A-Za-z]/.test(s)) return {filter: false};
    if (looksLikeEngineering(s)) return {filter: false};

    // Salvage: drop words from the end while the head still looks like a
    // dimension. Anchored at the front because a dimension leads its note.
    const words = s.split(/\s+/).filter(Boolean);
    for (let take = words.length - 1; take >= 1; take--) {
        const head = words.slice(0, take).join(' ');
        if (/^\d+\s*[Xx\u00D7]$/.test(head)) continue;   // a bare quantity is not a salvage
        if (!/\d/.test(head)) continue;
        if (looksLikeEngineering(head) && head !== s)
            return {filter: false, salvaged: head};
    }
    return {filter: true};
}

/**
 * Datum feature triangles.
 *
 * Ported from One Supply, which classifies on the filled triangle alone
 * (`text_parser.py:380`). The hollow and increment forms are here because OCR
 * substitutes them freely - a filled glyph off a low-contrast scan comes back
 * hollow about as often as not. Kept in step with `feature_symbols.py`
 * DATUM_TRIANGLES in the consumer, which classifies the same thing at insert.
 */
const DATUM_TRIANGLES = ['▲', '△', '∆'];

/** The older ASME marker: a single datum letter between dashes, "-A-". */
const DATUM_DASH = /^\s*-\s*[A-Z]\s*-\s*$/;

/**
 * Does this balloon MARK a datum, rather than measure something?
 *
 * A datum feature symbol declares a surface to BE datum A. It is not a
 * characteristic and nobody measures it - it is the reference the measured
 * things are taken from.
 *
 * Not to be confused with a datum REFERENCE: the "A B C" inside a feature
 * control frame, naming which datums a tolerance is against. Those are parsed
 * out of the frame text elsewhere, and a frame is very much something to
 * inspect - so `⌖ ⌀.005 A B C` must NOT match here.
 */
export function isDatumSymbol(text: string | null | undefined): boolean {
    const s = String(text ?? '').trim();
    if (!s) return false;
    if (DATUM_DASH.test(s)) return true;
    if (!DATUM_TRIANGLES.some(t => s.includes(t))) return false;
    // A triangle inside a feature control frame is a datum reference on a
    // toleranced characteristic, not a standalone datum marker. Anything
    // carrying a tolerance value is the former.
    if (/[⌖▱⌭⌒⌓∥⊥⟂◎⌯↗⌰⏤]/.test(s))
        return false;
    return true;
}

/** Which structural filters are switched on. Remembered per browser. */
export interface DimensionFilterSettings {
    reference: boolean;
    englishNoise: boolean;
    /**
     * One Supply's `generate_datum_annotations`, inverted: there the toggle is
     * "create balloons for datum symbols" and defaults ON, here the switch is
     * "take them out again" and defaults OFF.
     *
     * The generating half is not this widget's to make - by the time a drawing
     * reaches here the consumer has already decided, from
     * Processing.Datums.AddMissing in the RFQ config.yaml, whether to balloon
     * the datums RPA/API found geometrically. That is a per-installation
     * decision; this one is per-drawing, and applies whether the datum came
     * from geometry or from the symbol test.
     */
    datum: boolean;
    /**
     * Basic dimensions - boxed on the drawing (found by OpenCV in RPA/API) or
     * read as [1.250]. Only RPA/API acts on this, when a drawing is ballooned;
     * the consumer reads it from MasterSettings with `reference`. ON by
     * default: RPA/API always dropped them before this was a setting.
     */
    basic: boolean;
}

export const DEFAULT_DIMENSION_FILTERS: DimensionFilterSettings = {
    // All off by default. These remove balloons the model DID find, so
    // switching them on is a decision the operator makes per drawing, not a
    // behaviour that silently ships turned on.
    reference: false,
    englishNoise: false,
    datum: false,
    basic: true,
};

export interface FilterHit {
    id: string;
    /** Which rule caught it, for the summary. */
    rule: 'reference' | 'englishNoise' | 'datum';
    /** What could be kept instead of removing, where the rule salvaged one. */
    salvaged?: string;
}

export interface FilterCandidate {
    id: string;
    content?: string;
    isNote?: boolean;
    /** What the consumer decided at insert, where it did. */
    isDatum?: boolean;
}

/**
 * Everything the enabled structural filters catch.
 *
 * Notes are exempt, exactly as in the keyword filter: a note is prose by
 * definition and is not pretending to be a characteristic.
 */
export function findStructuralMatches(
    annotations: FilterCandidate[], settings: DimensionFilterSettings
): FilterHit[] {
    const hits: FilterHit[] = [];
    for (const a of annotations ?? []) {
        if (a.isNote) continue;
        const text = String(a.content ?? '').trim();
        if (!text) continue;

        // The stored flag wins where the consumer set one: it classified the
        // ORIGINAL symbol, before any hand-editing of the text, so it knows
        // things the current text no longer says.
        if (settings.datum && (a.isDatum ?? isDatumSymbol(text))) {
            hits.push({id: a.id, rule: 'datum'});
            continue;
        }
        if (settings.reference && isReferenceDimension(text)) {
            hits.push({id: a.id, rule: 'reference'});
            continue;
        }
        if (settings.englishNoise) {
            const verdict = resolveEnglishNoise(text);
            if (verdict.filter) hits.push({id: a.id, rule: 'englishNoise'});
            else if (verdict.salvaged)
                hits.push({id: a.id, rule: 'englishNoise', salvaged: verdict.salvaged});
        }
    }
    return hits;
}

export function loadDimensionFilters(): DimensionFilterSettings {
    try {
        const raw = getSetting('filters');
        if (!raw) return {...DEFAULT_DIMENSION_FILTERS};
        return {...DEFAULT_DIMENSION_FILTERS, ...JSON.parse(raw)};
    } catch {
        return {...DEFAULT_DIMENSION_FILTERS};
    }
}

export function saveDimensionFilters(settings: DimensionFilterSettings): void {
    setSetting('filters', JSON.stringify(settings));
}
