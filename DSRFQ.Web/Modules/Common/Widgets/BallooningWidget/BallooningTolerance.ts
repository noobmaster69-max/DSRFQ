/**
 * General (default) tolerances — what a dimension means when the drawing does
 * not print a tolerance beside it.
 *
 * Ported from One Supply (C:\Aizera\RPA\Bubble): `ui/default_tolerance_dialog.py`,
 * `ui/property_editor_tolerance_mixin.py`, `utils/tolerance_utils.py` and the
 * tables in `utils/constants.py`. Three sources of a tolerance, as there:
 *
 *   CUSTOM SCHEMES — named, editable, as many as the shop needs. Each has a
 *     type: by DECIMAL PLACES (the title-block convention, ".XXX ±.005"), by
 *     SIZE RANGE ("over 6 up to 30: ±0.2"), or GEOMETRIC (straightness,
 *     perpendicularity, symmetry, runout). A balloon filled from a scheme is
 *     labelled "[Decimal] Title block (inch)", which is what lets a later
 *     "Update applied" find it again when the scheme changes.
 *
 *   ISO 2768-1 — linear and angular, by size band and class f/m/c/v.
 *
 *   ISO 2768-2 — geometric characteristics, by size band and class H/K/L.
 *
 * ISO 2768's bands are millimetres. Applying them to an inch drawing silently
 * writes a tolerance ~25x too large, so the ISO sources take a unit; see
 * `IsoUnit`. Custom schemes are in whatever unit their author typed.
 */

import { getSetting, setSetting } from "./BallooningSettingsStore";
import { isReferenceDimension, stripQuantityPrefix } from "./BallooningDimensionFilter";

/** A size band: [over, upTo, tolerance]. `over` is exclusive, `upTo` inclusive. */
export type IsoBand = [number, number, number];

export type Iso1Class = 'f' | 'm' | 'c' | 'v';
export type Iso2Class = 'H' | 'K' | 'L';

/**
 * ISO 2768-1 linear, millimetres. Verbatim from One Supply's constants.py.
 *
 * Class 'f' (fine) stops at 1000-2000 and has no 2000-4000 row in the source;
 * that is the standard, not an omission - the finest class is not defined for
 * the largest band.
 */
export const ISO_2768_1_LINEAR: Record<Iso1Class, IsoBand[]> = {
    f: [[0.5, 3, 0.05], [3, 6, 0.05], [6, 30, 0.1], [30, 120, 0.15],
        [120, 400, 0.2], [400, 1000, 0.3], [1000, 2000, 0.5]],
    m: [[0.5, 3, 0.1], [3, 6, 0.1], [6, 30, 0.2], [30, 120, 0.3],
        [120, 400, 0.5], [400, 1000, 0.8], [1000, 2000, 1.2], [2000, 4000, 2.0]],
    c: [[0.5, 3, 0.2], [3, 6, 0.3], [6, 30, 0.5], [30, 120, 0.8],
        [120, 400, 1.2], [400, 1000, 2.0], [1000, 2000, 3.0], [2000, 4000, 4.0]],
    v: [[3, 6, 0.5], [6, 30, 1.0], [30, 120, 1.5], [120, 400, 2.5],
        [400, 1000, 4.0], [1000, 2000, 6.0], [2000, 4000, 8.0]],
};

/**
 * ISO 2768-1 angular, DEGREES.
 *
 * The published standard is in degrees and minutes; One Supply already
 * converted to decimal degrees and this carries those numbers across
 * unchanged rather than re-deriving them. The band is the length of the
 * SHORTER SIDE of the angle, in mm - not the angle itself.
 */
export const ISO_2768_1_ANGULAR: Record<Iso1Class, IsoBand[]> = {
    f: [[0, 10, 1.0], [10, 50, 0.5], [50, 120, 0.33], [120, 400, 0.17], [400, 99999, 0.08]],
    m: [[0, 10, 1.0], [10, 50, 0.5], [50, 120, 0.33], [120, 400, 0.17], [400, 99999, 0.08]],
    c: [[0, 10, 1.5], [10, 50, 1.0], [50, 120, 0.5], [120, 400, 0.25], [400, 99999, 0.17]],
    v: [[0, 10, 3.0], [10, 50, 2.0], [50, 120, 1.0], [120, 400, 0.5], [400, 99999, 0.33]],
};

/** ISO 2768-2 straightness and flatness, mm. */
export const ISO_2768_2_STRAIGHTNESS_FLATNESS: Record<Iso2Class, IsoBand[]> = {
    H: [[0, 10, 0.02], [10, 30, 0.05], [30, 100, 0.1], [100, 300, 0.2], [300, 1000, 0.3], [1000, 3000, 0.4]],
    K: [[0, 10, 0.05], [10, 30, 0.1], [30, 100, 0.2], [100, 300, 0.4], [300, 1000, 0.6], [1000, 3000, 0.8]],
    L: [[0, 10, 0.1], [10, 30, 0.2], [30, 100, 0.4], [100, 300, 0.8], [300, 1000, 1.2], [1000, 3000, 1.6]],
};

/** ISO 2768-2 perpendicularity, mm. */
export const ISO_2768_2_PERPENDICULARITY: Record<Iso2Class, IsoBand[]> = {
    H: [[0, 100, 0.2], [100, 300, 0.3], [300, 1000, 0.4], [1000, 3000, 0.5]],
    K: [[0, 100, 0.4], [100, 300, 0.6], [300, 1000, 0.8], [1000, 3000, 1.0]],
    L: [[0, 100, 0.6], [100, 300, 1.0], [300, 1000, 1.5], [1000, 3000, 2.0]],
};

/** ISO 2768-2 symmetry, mm. */
export const ISO_2768_2_SYMMETRY: Record<Iso2Class, IsoBand[]> = {
    H: [[0, 100, 0.5], [100, 300, 0.5], [300, 1000, 0.5], [1000, 3000, 0.5]],
    K: [[0, 100, 0.6], [100, 300, 0.6], [300, 1000, 0.8], [1000, 3000, 1.0]],
    L: [[0, 100, 0.6], [100, 300, 1.0], [300, 1000, 1.5], [1000, 3000, 2.0]],
};

/** ISO 2768-2 runout, mm. Flat per class - it does not vary with size. */
export const ISO_2768_2_RUNOUT: Record<Iso2Class, number> = { H: 0.1, K: 0.2, L: 0.5 };

/**
 * GD&T glyph -> which ISO 2768-2 table governs it.
 *
 * Both the standard glyph and the substitute recognition tends to emit, since
 * a drawing read as `⊥` and one read as `⟂` are the same characteristic. See
 * feature_symbols.py in the consumer for the same aliasing problem.
 */
export const ISO_2768_2_GEOMETRY_MAP: Record<string, 'sf' | 'perp' | 'sym' | 'runout'> = {
    '\u23E4': 'sf', '\u2014': 'sf', '\u25B1': 'sf',        // ⏤ — ▱ straightness / flatness
    '\u22A5': 'perp', '\u27C2': 'perp',                     // ⊥ ⟂ perpendicularity
    '\u232F': 'sym', '\u2261': 'sym',                       // ⌯ ≡ symmetry
    '\u2197': 'runout', '\u2330': 'runout',                 // ↗ ⌰ runout
};

/**
 * GD&T, surface finish and datum glyphs - One Supply's GEOMETRIC_TOLERANCE_TYPES,
 * plus the U+27C2 variant this system sees.
 *
 * A feature control frame already carries its own tolerance inside it, and a
 * surface finish or datum letter is not a dimension at all. These are what the
 * "GD&T and surface roughness" exclusion covers, and all that a geometric
 * scheme or ISO 2768-2 applies to.
 */
export const NEVER_DEFAULT_TOLERANCED = new Set([
    '\u2334', '\u23E4', '\u2014', '\u25B1', '\u25CB', '\u232D', '\u2312', '\u2313',
    '\u2225', '//', '\u22A5', '\u27C2', '\u2316', '\u2295', '\u25CE', '\u2299',
    '\u232F', '\u2197', '\u2330', 'Ra', 'Rz', '\u221A', '\u25B2',
]);

const DATUM_GLYPH = '\u25B2';

/** How a nominal was written, which is all the decimal-places scheme needs. */
export interface Nominal {
    value: number;
    /** Digits after the decimal point, as WRITTEN: ".380" is 3, "12" is 0. */
    decimals: number;
    isAngle: boolean;
}

/** An upper/lower pair, as strings - the form the balloon stores. */
export interface DecimalRule { upper: string; lower: string; }
/** Decimal places ("0", "1", ...) -> the pair that many places is held to. */
export type DecimalScheme = Record<string, DecimalRule>;

/**
 * Inch title-block defaults - the convention the drawings in this system use.
 *
 * These are the common shop values (.X ±.030, .XX ±.010, .XXX ±.005). They are
 * a starting point, not a standard: the real numbers are printed in each
 * drawing's title block and differ by customer, which is why schemes exist.
 */
export const DECIMAL_SCHEME_INCH: { dimension: DecimalScheme; angle: DecimalScheme } = {
    dimension: {
        '0': { upper: '+.06', lower: '-.06' },
        '1': { upper: '+.03', lower: '-.03' },
        '2': { upper: '+.010', lower: '-.010' },
        '3': { upper: '+.005', lower: '-.005' },
    },
    angle: {
        '0': { upper: '+1\u00B0', lower: '-1\u00B0' },
        '1': { upper: '+0.5\u00B0', lower: '-0.5\u00B0' },
    },
};

/** Metric equivalents, carried over from One Supply's DEFAULT_TOLERANCE_SETTINGS. */
export const DECIMAL_SCHEME_METRIC: { dimension: DecimalScheme; angle: DecimalScheme } = {
    dimension: {
        '0': { upper: '+0.5', lower: '-0.5' },
        '1': { upper: '+0.1', lower: '-0.1' },
        '2': { upper: '+0.05', lower: '-0.05' },
        '3': { upper: '+0.01', lower: '-0.01' },
    },
    angle: {
        '0': { upper: '+2\u00B0', lower: '-2\u00B0' },
        '1': { upper: '+1\u00B0', lower: '-1\u00B0' },
        '2': { upper: '+0.5\u00B0', lower: '-0.5\u00B0' },
        '3': { upper: '+0.1\u00B0', lower: '-0.1\u00B0' },
    },
};

/** ISO 2768's bands are millimetres; the drawing may not be. */
export type IsoUnit = 'mm' | 'inch';
const MM_PER_INCH = 25.4;

// ── custom schemes ──────────────────────────────────────────────────────────

/**
 * What a scheme matches on. `mixed` is One Supply's legacy type - range first,
 * then decimal places - kept so a scheme of that type still works, but not
 * offered for new ones.
 */
export type SchemeType = 'decimal' | 'range' | 'geometric' | 'mixed';

export const SCHEME_TYPE_LABELS: Record<SchemeType, string> = {
    decimal: 'Decimal places',
    range: 'Size range',
    geometric: 'Geometric',
    mixed: 'Mixed (range, then decimal)',
};

/** The "[Decimal]" in "[Decimal] Title block (inch)" - One Supply's "[小数]". */
const SCHEME_TYPE_PREFIX: Record<SchemeType, string> = {
    decimal: '[Decimal]', range: '[Range]', geometric: '[Geometric]', mixed: '[Mixed]',
};

/** A size range: over `min` (exclusive) up to `max` (inclusive). */
export interface RangeRule { min: number; max: number; upper: string; lower: string; }
/** A geometric band: over `min` up to `max`, held to ±`tol`. */
export interface GeomRule { min: number; max: number; tol: number; }

export interface ToleranceScheme {
    type: SchemeType;
    decimalLinear: DecimalScheme;
    decimalAngular: DecimalScheme;
    rangeLinear: RangeRule[];
    rangeAngular: RangeRule[];
    geomSf: GeomRule[];
    geomPerp: GeomRule[];
    geomSym: GeomRule[];
    /** Runout is one value per scheme, like ISO 2768-2's per-class value. */
    geomRunout: number;
}

const toGeom = (bands: IsoBand[]): GeomRule[] => bands.map(([min, max, tol]) => ({ min, max, tol }));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/**
 * A new, empty scheme of a type.
 *
 * As in One Supply: a decimal scheme gets the four usual bands with blank
 * values, a range scheme starts with no rows, and a geometric scheme starts
 * from ISO 2768-2 class K so there is something sensible to edit.
 */
export function newScheme(type: SchemeType): ToleranceScheme {
    const blank = () => ({
        '0': { upper: '', lower: '' }, '1': { upper: '', lower: '' },
        '2': { upper: '', lower: '' }, '3': { upper: '', lower: '' },
    });
    const geometric = type === 'geometric';
    return {
        type,
        decimalLinear: type === 'decimal' ? blank() : {},
        decimalAngular: type === 'decimal' ? blank() : {},
        rangeLinear: [],
        rangeAngular: [],
        geomSf: geometric ? toGeom(ISO_2768_2_STRAIGHTNESS_FLATNESS.K) : [],
        geomPerp: geometric ? toGeom(ISO_2768_2_PERPENDICULARITY.K) : [],
        geomSym: geometric ? toGeom(ISO_2768_2_SYMMETRY.K) : [],
        geomRunout: ISO_2768_2_RUNOUT.K,
    };
}

/**
 * The scheme a settings blob from the first port becomes. That build had one
 * unnamed decimal scheme; it is carried over under this name so nothing an
 * operator tuned is lost, and so the ".XXX" labels it wrote still match it.
 */
export const LEGACY_DECIMAL_SCHEME = 'Title block (inch)';

function defaultSchemes(): Record<string, ToleranceScheme> {
    return {
        [LEGACY_DECIMAL_SCHEME]: {
            ...newScheme('decimal'),
            decimalLinear: clone(DECIMAL_SCHEME_INCH.dimension),
            decimalAngular: clone(DECIMAL_SCHEME_INCH.angle),
        },
        'Title block (metric)': {
            ...newScheme('decimal'),
            decimalLinear: clone(DECIMAL_SCHEME_METRIC.dimension),
            decimalAngular: clone(DECIMAL_SCHEME_METRIC.angle),
        },
        'Size range': newScheme('range'),
        'Geometric (ISO 2768-2 K)': newScheme('geometric'),
    };
}

// ── exclusions ──────────────────────────────────────────────────────────────

/**
 * Kinds of balloon that never receive a general tolerance while ticked.
 * One Supply's 排除设置 group, all on by default as there.
 */
export interface ToleranceExclusions {
    /** GD&T frames, surface finish, datum markers. */
    geometric: boolean;
    notes: boolean;
    /** Basic (theoretical) dimensions - exact by definition. */
    theoretical: boolean;
    /** Reference dimensions - "(50)", "50 REF". */
    reference: boolean;
    /** Fastener part numbers and install/assembly instructions. */
    fastener: boolean;
}

export type ExclusionReason = keyof ToleranceExclusions;

export const EXCLUSION_LABELS: Record<ExclusionReason, string> = {
    geometric: 'GD&T / surface finish / datum',
    notes: 'notes',
    theoretical: 'basic',
    reference: 'reference',
    fastener: 'fastener / install text',
};

export const DEFAULT_EXCLUSIONS: ToleranceExclusions = {
    geometric: true, notes: true, theoretical: true, reference: true, fastener: true,
};

// ── settings ────────────────────────────────────────────────────────────────

/** Which of the dialog's three sources is in use - One Supply's three tabs. */
export type ToleranceTab = 'custom' | 'iso1' | 'iso2';

export interface ToleranceSettings {
    tab: ToleranceTab;
    currentScheme: string;
    schemes: Record<string, ToleranceScheme>;
    /** Only consulted by the ISO sources; custom schemes are unit-agnostic. */
    unit: IsoUnit;
    iso1Class: Iso1Class;
    iso2Class: Iso2Class;
    exclude: ToleranceExclusions;
}

export function defaultToleranceSettings(): ToleranceSettings {
    return {
        tab: 'custom',
        currentScheme: LEGACY_DECIMAL_SCHEME,
        schemes: defaultSchemes(),
        unit: 'inch',
        iso1Class: 'm',
        iso2Class: 'K',
        exclude: { ...DEFAULT_EXCLUSIONS },
    };
}

/** The shipped settings. Read-only: take `defaultToleranceSettings()` to edit. */
export const DEFAULT_TOLERANCE_SETTINGS: ToleranceSettings = defaultToleranceSettings();

/**
 * The ISO tables used for one run.
 *
 * Editable in the dialog, as in One Supply, and like there the edits last
 * for the run only: the published standard is what reopening shows. A shop
 * that wants different numbers wants a custom scheme, which is saved.
 */
export interface IsoTables {
    linear: IsoBand[];
    angular: IsoBand[];
    sf: IsoBand[];
    perp: IsoBand[];
    sym: IsoBand[];
    runout: number;
}

export function isoTablesFor(iso1Class: Iso1Class, iso2Class: Iso2Class): IsoTables {
    return {
        linear: clone(ISO_2768_1_LINEAR[iso1Class]),
        angular: clone(ISO_2768_1_ANGULAR[iso1Class]),
        sf: clone(ISO_2768_2_STRAIGHTNESS_FLATNESS[iso2Class]),
        perp: clone(ISO_2768_2_PERPENDICULARITY[iso2Class]),
        sym: clone(ISO_2768_2_SYMMETRY[iso2Class]),
        runout: ISO_2768_2_RUNOUT[iso2Class],
    };
}

// ── text helpers (tolerance_utils.py) ───────────────────────────────────────

/** "+1" -> "+1°". Angle tolerances may be typed without the degree sign. */
export function ensureAngleDegree(value: string | null | undefined): string {
    const s = String(value ?? '').trim();
    if (!s || s.includes('\u00B0')) return s;
    return `${s}\u00B0`;
}

/** 0 -> "0", 2 -> "0.00": the decimal-places column shows the shape it matches. */
export function formatDecimalPlacesLabel(places: number): string {
    const n = Math.max(0, Math.floor(places));
    return n === 0 ? '0' : '0.' + '0'.repeat(n);
}

/**
 * The decimal-places column back to a count. Accepts "0.00", a bare "2", One
 * Supply's legacy "X.XX", and the ".XXX" shape this widget used to show.
 */
export function parseDecimalPlacesLabel(text: string | null | undefined): number | null {
    const s = String(text ?? '').trim();
    if (!s) return null;
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    let m = s.match(/^0\.(0*)$/);
    if (m) return m[1].length;
    m = s.match(/^X?\.?(X*)$/i);
    if (m) return m[1].length;
    return null;
}

/** "+.005", "-0.1", "1", "+1°" - a number with an optional sign. */
export function validateToleranceInput(value: string | null | undefined, isAngle = false): boolean {
    let s = String(value ?? '').trim();
    if (!s) return false;
    if (isAngle) s = s.replace(/\u00B0/g, '').trim();
    return /^[+\-]?(\d+(\.\d*)?|\.\d+)$/.test(s);
}

/** Geometric tolerances are a zone width: a plain, non-negative number. */
export function validateGeometricInput(value: string | number | null | undefined): boolean {
    const s = String(value ?? '').trim();
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(s)) return false;
    return parseFloat(s) >= 0;
}

/** A tolerance string as a signed number, or NaN. Full-width signs accepted. */
export function parseToleranceValue(value: string | null | undefined): number {
    const s = String(value ?? '').trim()
        .replace(/\uFF0B/g, '+').replace(/\uFF0D/g, '-').replace(/\u00B0/g, '');
    if (!s) return NaN;
    return /^[+\-]?(\d+(\.\d*)?|\.\d+)$/.test(s) ? parseFloat(s) : NaN;
}

/** Upper must not sit below lower. Empty or unparseable counts as fine. */
export function isToleranceLogicValid(upper: string | null | undefined, lower: string | null | undefined): boolean {
    const u = parseToleranceValue(upper), l = parseToleranceValue(lower);
    if (Number.isNaN(u) || Number.isNaN(l)) return true;
    return u >= l;
}

/**
 * Tidy a pair before it is written to a balloon.
 *
 * Two of One Supply's rules: a symmetric pair typed without signs ("1", "1")
 * means ±1, and an upper below its lower is swapped rather than stored upside
 * down (validate_tolerance_pair).
 */
export function normalizeTolerancePair(rule: DecimalRule): DecimalRule {
    let upper = String(rule.upper ?? '').trim();
    let lower = String(rule.lower ?? '').trim();
    const signed = (s: string) => /^[+\-\u00B1\uFF0B\uFF0D]/.test(s);
    if (upper && lower && !signed(upper) && !signed(lower)) {
        const u = parseToleranceValue(upper), l = parseToleranceValue(lower);
        if (!Number.isNaN(u) && u === l && u !== 0) {
            upper = `+${upper}`;
            lower = `-${lower}`;
        }
    }
    if (!isToleranceLogicValid(upper, lower)) [upper, lower] = [lower, upper];
    return { upper, lower };
}

/** What a balloon filled from this scheme is labelled with. */
export function schemeStandard(type: SchemeType, name: string): string {
    return `${SCHEME_TYPE_PREFIX[type] ?? SCHEME_TYPE_PREFIX.mixed} ${name}`;
}

/** The scheme name out of a label, with or without its "[Type] " prefix. */
export function schemeNameOf(standard: string | null | undefined): string {
    const s = String(standard ?? '').trim();
    return s.startsWith('[') && s.includes(' ') ? s.slice(s.indexOf(' ') + 1) : s;
}

/** Labels written by the first port: ".XXX", "Angle 1dp". */
export function isLegacyDecimalStandard(standard: string | null | undefined): boolean {
    const s = String(standard ?? '').trim();
    return /^\.X+$/i.test(s) || /^Angle \d+dp$/i.test(s);
}

/** Port of standard_matches_scheme. */
export function standardMatchesScheme(standard: string | null | undefined, name: string): boolean {
    const s = String(standard ?? '').trim();
    const n = String(name ?? '').trim();
    if (!s || !n) return false;
    return schemeNameOf(s) === n;
}

// ── classification ──────────────────────────────────────────────────────────

/** The GD&T / surface finish glyph a balloon's text carries, if any. */
export function geometricGlyph(text: string | null | undefined): string | null {
    const s = String(text ?? '');
    const single = [...s].find(ch => NEVER_DEFAULT_TOLERANCED.has(ch));
    if (single) return single;
    for (const g of NEVER_DEFAULT_TOLERANCED)
        if (g.length > 1 && s.includes(g)) return g;
    return null;
}

/**
 * A basic (theoretical) dimension.
 *
 * One Supply reads a flag the model sets when the value is boxed. Nothing in
 * this pipeline carries such a flag - not RPA/API, not the consumer, not the
 * row - so this reads what the text says instead: "BSC"/"BASIC", or the value
 * in square brackets, which is how OCR tends to render the box.
 */
export function isTheoreticalDimension(text: string | null | undefined): boolean {
    const s = String(text ?? '').trim();
    if (!s) return false;
    if (/\b(BSC|BASIC)\b/i.test(s)) return true;
    const { content } = stripQuantityPrefix(s);
    return /^\s*\[[^\]]+\]\s*$/.test(content);
}

/** A reference dimension: "(50)", "(Ø10)", or a trailing REF - "50 REF". */
export function isReferenceForTolerance(text: string | null | undefined): boolean {
    const s = String(text ?? '').trim();
    if (!s) return false;
    return isReferenceDimension(s) || /\bREF\.?\s*\)?\s*$/i.test(s);
}

const FASTENER_PREFIXES = [
    'NASM', 'NAS', 'MS', 'AN', 'AS', 'BACB', 'BACR', 'BAC',
    'CR', 'HL', 'HST', 'BJ', 'PL', 'ST', 'BSL', 'NB', 'PSL', 'LS',
];

/**
 * Words that mark an instruction rather than a size.
 *
 * One Supply's list, less its bare THRU: that one also catches "⌀.250 THRU",
 * which is a hole diameter and very much wants a tolerance. "THRU BOTH WALLS"
 * is still caught by BOTH WALLS.
 */
const INSTALL_WORDS = [
    'INSTALL', 'THIS SIDE', 'DIRECTION', 'REMOVE', 'ASSEMBLE', 'ASSEMBLY',
    'TORQUE', 'APPLY', 'BOTH WALLS', 'BOTH SIDES',
].flatMap(w => w.includes(' ') ? [w, w.replace(/ /g, '')] : [w]);

/**
 * A fastener part number ("NAS1130-4FL20D", "2X MS20426AD") or an install
 * instruction. Port of _is_fastener_or_install_text.
 */
export function isFastenerOrInstallText(text: string | null | undefined): boolean {
    const s = String(text ?? '').trim().toUpperCase();
    if (!s) return false;
    const body = stripQuantityPrefix(s).content.toUpperCase();
    if (FASTENER_PREFIXES.some(p => new RegExp(`^${p}\\d`).test(body))) return true;
    return INSTALL_WORDS.some(w => s.includes(w));
}

/**
 * The nominal a balloon's text states, or null when it states none.
 *
 * Deliberately conservative. A quantity prefix is stripped ("4X .250" is a
 * quarter inch, four times - the nominal is .250, not 4). Anything that is not
 * recognisably one number is refused rather than guessed, because a wrong
 * nominal produces a wrong tolerance that looks entirely plausible.
 */
export function extractNominal(text: string | null | undefined): Nominal | null {
    let s = String(text ?? '').trim();
    if (!s) return null;

    // Quantity prefix: 4X, 2x, (3×). Must be anchored - "M8x1" is a thread,
    // not a quantity, and its "x1" is part of the spec.
    s = s.replace(/^\(?\s*\d+\s*\)?\s*[Xx\u00D7]\s+/, '');
    s = s.replace(/^\d+\s*[Xx\u00D7](?=[\s\u00D8\u2300R])/, '');

    const isAngle = s.includes('\u00B0') || s.includes('\u2220');

    // A leading symbol is fine and expected (Ø.380, R.25).
    const m = s.match(/(-?\d*\.\d+|-?\d+)/);
    if (!m) return null;

    // Prose that happens to contain a digit is not a dimension. "SEE NOTE 4"
    // must not become a toleranced 4.
    //
    // The test is position, not vocabulary: on a real dimension the number
    // comes first, or a dimension symbol does. ".380 THRU" and "M8x1" pass;
    // "SEE NOTE 4" and "DEBURR 2 PLACES" do not. A word is three letters or
    // more, so the M of a thread and the R of a radius are not words.
    const hasDimensionSymbol = /[Ø⌀∅°±∠]/.test(s);
    if (!hasDimensionSymbol) {
        const firstWord = s.search(/[A-Za-z]{3,}/);
        if (firstWord >= 0 && firstWord < (m.index ?? 0)) return null;
    }

    const raw = m[1];
    const value = parseFloat(raw);
    if (!Number.isFinite(value)) return null;

    const dot = raw.indexOf('.');
    const decimals = dot < 0 ? 0 : raw.length - dot - 1;
    return { value: Math.abs(value), decimals, isAngle };
}

// ── lookups ─────────────────────────────────────────────────────────────────

/**
 * The band a value falls in.
 *
 * `over` exclusive / `upTo` inclusive, matching how the standard's tables are
 * written ("over 3 up to 6"). The trailing check is One Supply's: a value at or
 * below the very first band's lower edge still takes the first band, so a 0.4mm
 * feature is not left untoleranced by an off-by-a-hair.
 */
export function lookupIsoBand(value: number, table: IsoBand[]): number | null {
    for (const [lo, hi, tol] of table) {
        if (value > lo && value <= hi) return tol;
    }
    if (table.length && value <= table[0][0]) return table[0][2];
    return null;
}

/**
 * The size-range row a value falls in, by the same rule as the ISO bands.
 *
 * A row whose upper and lower are both blank is skipped rather than matched,
 * as in One Supply: leaving a row blank says "no default here".
 */
export function lookupRangeRule(value: number, rows: RangeRule[]): RangeRule | null {
    const filled = (r: RangeRule) => !!(String(r.upper ?? '').trim() || String(r.lower ?? '').trim());
    for (const r of rows ?? []) {
        if (value > r.min && value <= r.max && filled(r)) return r;
    }
    if (rows?.length && value <= rows[0].min && filled(rows[0])) return rows[0];
    return null;
}

/** Trim a computed tolerance to a sane string: 0.30000000000000004 -> 0.3 */
function fmt(value: number, unit: IsoUnit): string {
    const places = unit === 'inch' ? 4 : 3;
    return String(parseFloat(value.toFixed(places)));
}

/** ISO 2768-1 for one nominal. Null when no band applies. */
export function calcIso1(
    nominal: Nominal, iso1Class: Iso1Class, unit: IsoUnit,
    tables?: Pick<IsoTables, 'linear' | 'angular'>
): DecimalRule | null {
    if (nominal.isAngle) {
        // The angular table is banded by the shorter side's LENGTH, which a
        // balloon's text does not state - only the angle itself. One Supply has
        // the same gap and uses the angle value; that is an approximation, and
        // it is called out here rather than hidden.
        const tol = lookupIsoBand(nominal.value, tables?.angular ?? ISO_2768_1_ANGULAR[iso1Class]);
        if (tol === null) return null;
        return { upper: `+${tol}\u00B0`, lower: `-${tol}\u00B0` };
    }

    // The standard is metric. An inch nominal is converted up to find its band,
    // and the resulting millimetre tolerance converted back down - otherwise
    // a 0.380 inch feature looks like a 0.38 mm one and lands in the finest
    // band, roughly 25x too tight.
    const mm = unit === 'inch' ? nominal.value * MM_PER_INCH : nominal.value;
    const tolMm = lookupIsoBand(mm, tables?.linear ?? ISO_2768_1_LINEAR[iso1Class]);
    if (tolMm === null) return null;
    const tol = unit === 'inch' ? tolMm / MM_PER_INCH : tolMm;
    return { upper: `+${fmt(tol, unit)}`, lower: `-${fmt(tol, unit)}` };
}

/** ISO 2768-2 for one geometric characteristic. Null when it is not governed. */
export function calcIso2(
    glyph: string, nominal: Nominal | null, iso2Class: Iso2Class, unit: IsoUnit,
    tables?: Pick<IsoTables, 'sf' | 'perp' | 'sym' | 'runout'>
): DecimalRule | null {
    const category = ISO_2768_2_GEOMETRY_MAP[glyph];
    if (!category) return null;

    if (category === 'runout') {
        const tolMm = tables?.runout ?? ISO_2768_2_RUNOUT[iso2Class];
        const tol = unit === 'inch' ? tolMm / MM_PER_INCH : tolMm;
        return { upper: `+${fmt(tol, unit)}`, lower: `-${fmt(tol, unit)}` };
    }
    if (!nominal) return null;

    const table = category === 'sf' ? (tables?.sf ?? ISO_2768_2_STRAIGHTNESS_FLATNESS[iso2Class])
        : category === 'perp' ? (tables?.perp ?? ISO_2768_2_PERPENDICULARITY[iso2Class])
        : (tables?.sym ?? ISO_2768_2_SYMMETRY[iso2Class]);

    const mm = unit === 'inch' ? nominal.value * MM_PER_INCH : nominal.value;
    const tolMm = lookupIsoBand(mm, table);
    if (tolMm === null) return null;
    const tol = unit === 'inch' ? tolMm / MM_PER_INCH : tolMm;
    return { upper: `+${fmt(tol, unit)}`, lower: `-${fmt(tol, unit)}` };
}

/**
 * The decimal-places rule for a nominal.
 *
 * Port of One Supply's match_decimal_tolerance: an exact band wins; more places
 * than the widest band configured falls back to the widest; a gap in the middle
 * matches nothing, because deleting a band is how the user says "do not default
 * this one".
 */
export function calcDecimal(nominal: Nominal, scheme: DecimalScheme): DecimalRule | null {
    const keys = Object.keys(scheme ?? {}).filter(k => /^\d+$/.test(k)).map(Number).sort((a, b) => a - b);
    if (!keys.length) return null;

    let key: number | null = null;
    if (keys.includes(nominal.decimals)) key = nominal.decimals;
    else if (nominal.decimals > keys[keys.length - 1]) key = keys[keys.length - 1];
    if (key === null) return null;

    const rule = scheme[String(key)];
    if (!rule) return null;
    if (!String(rule.upper ?? '').trim() && !String(rule.lower ?? '').trim()) return null;
    return { upper: rule.upper ?? '', lower: rule.lower ?? '' };
}

/**
 * A custom (non-geometric) scheme for one nominal.
 *
 * Range schemes look the value up in the size table; decimal schemes count
 * places; a legacy mixed scheme tries the range first and falls back to places.
 * A range scheme that misses does NOT fall back - One Supply's rule, and the
 * right one: the scheme's author left that size uncovered on purpose.
 */
export function calcScheme(nominal: Nominal, scheme: ToleranceScheme): DecimalRule | null {
    const angle = nominal.isAngle;
    const out = (r: { upper: string; lower: string }): DecimalRule => angle
        ? { upper: ensureAngleDegree(r.upper), lower: ensureAngleDegree(r.lower) }
        : { upper: String(r.upper ?? ''), lower: String(r.lower ?? '') };

    if (scheme.type === 'range' || scheme.type === 'mixed') {
        const r = lookupRangeRule(nominal.value, angle ? scheme.rangeAngular : scheme.rangeLinear);
        if (r) return out(r);
        if (scheme.type === 'range') return null;
    }
    if (scheme.type === 'decimal' || scheme.type === 'mixed') {
        const r = calcDecimal(nominal, angle ? scheme.decimalAngular : scheme.decimalLinear);
        if (r) return out(r);
    }
    return null;
}

/** A geometric scheme for one characteristic. Port of get_geometric_tolerance_config. */
export function calcGeometricScheme(
    glyph: string, nominal: Nominal | null, scheme: ToleranceScheme
): DecimalRule | null {
    const category = ISO_2768_2_GEOMETRY_MAP[glyph];
    if (!category) return null;
    if (category === 'runout') {
        const v = Number(scheme.geomRunout);
        return Number.isFinite(v) ? { upper: `+${v}`, lower: `-${v}` } : null;
    }
    if (!nominal) return null;
    const rows = category === 'sf' ? scheme.geomSf : category === 'perp' ? scheme.geomPerp : scheme.geomSym;
    const tol = lookupIsoBand(nominal.value, (rows ?? []).map(r => [r.min, r.max, r.tol] as IsoBand));
    return tol === null ? null : { upper: `+${tol}`, lower: `-${tol}` };
}

// ── sources ─────────────────────────────────────────────────────────────────

/** Where one tolerance comes from: a named scheme, or an ISO class. */
export type RuleSource =
    | { kind: 'scheme'; name: string; scheme: ToleranceScheme }
    | { kind: 'iso1'; cls: Iso1Class; unit: IsoUnit; tables?: IsoTables }
    | { kind: 'iso2'; cls: Iso2Class; unit: IsoUnit; tables?: IsoTables };

/** The label a balloon filled from this source carries. */
export function sourceStandard(src: RuleSource): string {
    if (src.kind === 'scheme') return schemeStandard(src.scheme.type, src.name);
    return src.kind === 'iso1' ? `ISO 2768-1 ${src.cls}` : `ISO 2768-2 ${src.cls}`;
}

/** Does the geometric exclusion apply to this source at all? */
function geometricIsTheSubject(src: RuleSource): boolean {
    return src.kind === 'iso2' || (src.kind === 'scheme' && src.scheme.type === 'geometric');
}

/** The source the dialog's current tab and scheme describe. */
export function sourceFromSettings(settings: ToleranceSettings, tables?: IsoTables): RuleSource | null {
    if (settings.tab === 'iso1')
        return { kind: 'iso1', cls: settings.iso1Class, unit: settings.unit, tables };
    if (settings.tab === 'iso2')
        return { kind: 'iso2', cls: settings.iso2Class, unit: settings.unit, tables };
    const scheme = settings.schemes[settings.currentScheme];
    return scheme ? { kind: 'scheme', name: settings.currentScheme, scheme } : null;
}

/**
 * The source a balloon's label names - for the property panel, which
 * recalculates one balloon when its "Tolerance from" is changed.
 */
export function sourceFromStandard(
    standard: string | null | undefined, settings: ToleranceSettings
): RuleSource | null {
    const s = String(standard ?? '').trim();
    if (!s) return null;
    let m = s.match(/^ISO 2768-1\s+([fmcv])\b/);
    if (m) return { kind: 'iso1', cls: m[1] as Iso1Class, unit: settings.unit };
    m = s.match(/^ISO 2768-2\s+([HKL])\b/);
    if (m) return { kind: 'iso2', cls: m[1] as Iso2Class, unit: settings.unit };
    const name = schemeNameOf(s);
    if (settings.schemes[name]) return { kind: 'scheme', name, scheme: settings.schemes[name] };
    if (isLegacyDecimalStandard(s) && settings.schemes[LEGACY_DECIMAL_SCHEME])
        return { kind: 'scheme', name: LEGACY_DECIMAL_SCHEME, scheme: settings.schemes[LEGACY_DECIMAL_SCHEME] };
    return null;
}

/**
 * One balloon's tolerance from one source.
 *
 * 'not-covered' is distinct from null: a plain dimension under a geometric
 * scheme is not a miss, it is simply not what that scheme is about.
 */
export function calcForSource(
    src: RuleSource, text: string | null | undefined, isDatum = false
): DecimalRule | 'not-covered' | null {
    const glyph = isDatum ? DATUM_GLYPH : geometricGlyph(text);
    const nominal = extractNominal(text);
    let rule: DecimalRule | null;

    if (src.kind === 'scheme') {
        if (src.scheme.type === 'geometric') {
            if (!glyph) return 'not-covered';
            rule = calcGeometricScheme(glyph, nominal, src.scheme);
        } else {
            // A size scheme has nothing to say about a control frame.
            if (glyph) return 'not-covered';
            rule = nominal ? calcScheme(nominal, src.scheme) : null;
        }
    } else if (src.kind === 'iso1') {
        // Reached with a glyph only when the operator un-ticked the geometric
        // exclusion, which is One Supply's behaviour and theirs to choose.
        rule = nominal ? calcIso1(nominal, src.cls, src.unit, src.tables) : null;
    } else {
        if (!glyph || !ISO_2768_2_GEOMETRY_MAP[glyph]) return 'not-covered';
        rule = calcIso2(glyph, nominal, src.cls, src.unit, src.tables);
    }
    return rule ? normalizeTolerancePair(rule) : null;
}

/** The shape this needs from a balloon; keeps the module free of widget types. */
export interface ToleranceCandidate {
    id: string;
    content?: string;
    upperTol?: string;
    lowerTol?: string;
    isNote?: boolean;
    isDatum?: boolean;
    toleranceStandard?: string;
    /** Marked by hand: 'theoretical' or 'reference'. Beats the text cues. */
    dimensionFeature?: string;
}

/** Why a balloon is excluded, or null. `withGeometric` false where GD&T is the point. */
export function exclusionReason(
    a: ToleranceCandidate, exclude: ToleranceExclusions, withGeometric = true
): ExclusionReason | null {
    const text = String(a.content ?? '').trim();
    if (exclude.notes && a.isNote) return 'notes';
    // A feature marked by hand is authoritative either way; only an unmarked
    // balloon falls back to what its text looks like.
    const marked = a.dimensionFeature || '';
    if (exclude.theoretical && (marked === 'theoretical' || (!marked && isTheoreticalDimension(text)))) return 'theoretical';
    if (exclude.reference && (marked === 'reference' || (!marked && isReferenceForTolerance(text)))) return 'reference';
    if (withGeometric && exclude.geometric && (a.isDatum || geometricGlyph(text))) return 'geometric';
    if (exclude.fastener && isFastenerOrInstallText(text)) return 'fastener';
    return null;
}

/** One balloon's proposed change. */
export interface ToleranceProposal {
    id: string;
    upper: string;
    lower: string;
    /** What was applied, e.g. "ISO 2768-1 m" or "[Decimal] Title block (inch)". */
    standard: string;
}

export interface ToleranceOutcome {
    proposals: ToleranceProposal[];
    /** The label the proposals carry. */
    standard: string;
    /** Already had a tolerance printed on the drawing. */
    skippedHasTolerance: number;
    /** Excluded by a ticked exclusion, by which one. */
    excluded: Record<ExclusionReason, number>;
    /** Not something this source speaks to (a dimension under a GD&T scheme). */
    skippedNotCovered: number;
    /** Eligible, but no band or rule covered it. */
    skippedNoRule: number;
}

const zeroExcluded = (): Record<ExclusionReason, number> =>
    ({ geometric: 0, notes: 0, theoretical: 0, reference: 0, fastener: 0 });

/**
 * What "Apply" would add, without changing anything.
 *
 * Returns proposals rather than mutating so the dialog can say "this will fill
 * in 312 of 444" before the user commits - and so applying it is one undoable
 * step rather than a scatter of edits.
 *
 * A balloon that already states a tolerance is never touched. That is the
 * whole contract of a GENERAL tolerance: it covers what the drawing left
 * unsaid, and overwriting a printed tolerance would be a defect, not a default.
 */
export function proposeDefaultTolerances(
    annotations: ToleranceCandidate[], settings: ToleranceSettings, tables?: IsoTables
): ToleranceOutcome {
    const src = sourceFromSettings(settings, tables);
    const out: ToleranceOutcome = {
        proposals: [], standard: src ? sourceStandard(src) : '',
        skippedHasTolerance: 0, excluded: zeroExcluded(), skippedNotCovered: 0, skippedNoRule: 0,
    };
    const exclude = { ...DEFAULT_EXCLUSIONS, ...(settings.exclude ?? {}) };

    for (const a of annotations ?? []) {
        if (String(a.upperTol ?? '').trim() || String(a.lowerTol ?? '').trim()) {
            out.skippedHasTolerance++;
            continue;
        }
        const text = String(a.content ?? '').trim();
        if (!text || !src) { out.skippedNoRule++; continue; }

        const reason = exclusionReason(a, exclude, !geometricIsTheSubject(src));
        if (reason) { out.excluded[reason]++; continue; }

        const rule = calcForSource(src, text, !!a.isDatum);
        if (rule === 'not-covered') { out.skippedNotCovered++; continue; }
        if (!rule) { out.skippedNoRule++; continue; }
        out.proposals.push({ id: a.id, upper: rule.upper, lower: rule.lower, standard: out.standard });
    }
    return out;
}

export interface UpdateOutcome {
    /** Recalculated values for every balloon the source's label matched. */
    proposals: ToleranceProposal[];
    /** Balloons carrying the label at all. */
    matched: number;
    /** Of those, how many would actually change. */
    changed: number;
    /** Matched, but the current rules give nothing - left as they are. */
    unmatched: number;
}

/**
 * What "Update applied" would change. Port of update_applied_tolerances.
 *
 * Only balloons whose label names this source are touched - so a scheme can be
 * corrected after it was applied, and every balloon it filled follows. A
 * tolerance typed by hand has no label (editing one clears it) and is never
 * reached. For ISO the class may change: every "ISO 2768-1 x" is recalculated
 * at the class now chosen, and relabelled with it.
 */
export function proposeUpdateApplied(
    annotations: ToleranceCandidate[], settings: ToleranceSettings, tables?: IsoTables
): UpdateOutcome {
    const out: UpdateOutcome = { proposals: [], matched: 0, changed: 0, unmatched: 0 };
    const src = sourceFromSettings(settings, tables);
    if (!src) return out;

    const matches = (std: string): boolean => {
        if (src.kind === 'iso1') return std.startsWith('ISO 2768-1');
        if (src.kind === 'iso2') return std.startsWith('ISO 2768-2');
        return standardMatchesScheme(std, src.name)
            || (src.name === LEGACY_DECIMAL_SCHEME && isLegacyDecimalStandard(std));
    };
    const standard = sourceStandard(src);

    for (const a of annotations ?? []) {
        const std = String(a.toleranceStandard ?? '').trim();
        if (!std || !matches(std)) continue;
        out.matched++;
        const rule = calcForSource(src, a.content, !!a.isDatum);
        if (!rule || rule === 'not-covered') { out.unmatched++; continue; }
        out.proposals.push({ id: a.id, upper: rule.upper, lower: rule.lower, standard });
        if (rule.upper !== (a.upperTol ?? '') || rule.lower !== (a.lowerTol ?? '') || standard !== std)
            out.changed++;
    }
    return out;
}

/**
 * Every label the property panel offers, in order: the ISO classes, then
 * each scheme. Port of the property editor's 公差标准 list.
 */
export function standardOptions(settings: ToleranceSettings): string[] {
    const iso1 = (['f', 'm', 'c', 'v'] as Iso1Class[]).map(c => `ISO 2768-1 ${c}`);
    const iso2 = (['H', 'K', 'L'] as Iso2Class[]).map(c => `ISO 2768-2 ${c}`);
    const schemes = Object.entries(settings.schemes).map(([n, s]) => schemeStandard(s.type, n));
    return [...iso1, ...iso2, ...schemes];
}

// ── settings persistence ────────────────────────────────────────────────────

const TABS: ToleranceTab[] = ['custom', 'iso1', 'iso2'];
const TYPES: SchemeType[] = ['decimal', 'range', 'geometric', 'mixed'];

function num(v: any, fallback = NaN): number {
    const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
    return Number.isFinite(n) ? n : fallback;
}

function decimalMap(v: any): DecimalScheme {
    const out: DecimalScheme = {};
    if (!v || typeof v !== 'object') return out;
    for (const [k, r] of Object.entries(v as Record<string, any>)) {
        if (!/^\d+$/.test(k)) continue;
        out[k] = { upper: String(r?.upper ?? ''), lower: String(r?.lower ?? '') };
    }
    return out;
}

function rangeRows(v: any): RangeRule[] {
    return (Array.isArray(v) ? v : [])
        .map(r => ({ min: num(r?.min), max: num(r?.max), upper: String(r?.upper ?? ''), lower: String(r?.lower ?? '') }))
        .filter(r => Number.isFinite(r.min) && Number.isFinite(r.max));
}

function geomRows(v: any): GeomRule[] {
    return (Array.isArray(v) ? v : [])
        .map(r => ({ min: num(r?.min), max: num(r?.max), tol: num(r?.tol) }))
        .filter(r => Number.isFinite(r.min) && Number.isFinite(r.max) && Number.isFinite(r.tol));
}

/** Coerce a stored scheme into shape - a hand-edited or older blob must not crash the dialog. */
export function normalizeScheme(s: any): ToleranceScheme {
    const type: SchemeType = TYPES.includes(s?.type) ? s.type : 'mixed';
    return {
        type,
        decimalLinear: decimalMap(s?.decimalLinear),
        decimalAngular: decimalMap(s?.decimalAngular),
        rangeLinear: rangeRows(s?.rangeLinear),
        rangeAngular: rangeRows(s?.rangeAngular),
        geomSf: geomRows(s?.geomSf),
        geomPerp: geomRows(s?.geomPerp),
        geomSym: geomRows(s?.geomSym),
        geomRunout: num(s?.geomRunout, ISO_2768_2_RUNOUT.K),
    };
}

/**
 * Any stored blob -> current settings.
 *
 * The first port stored {mode, unit, iso1Class, iso2Class, applyIso2,
 * scheme: {dimension, angle}}. Its one decimal scheme becomes the
 * LEGACY_DECIMAL_SCHEME, and its ISO mode becomes the ISO 2768-1 tab.
 */
export function migrateToleranceSettings(saved: any): ToleranceSettings {
    const d = defaultToleranceSettings();
    if (!saved || typeof saved !== 'object') return d;

    const unit: IsoUnit = saved.unit === 'mm' ? 'mm' : 'inch';
    const iso1Class: Iso1Class = ['f', 'm', 'c', 'v'].includes(saved.iso1Class) ? saved.iso1Class : 'm';
    const iso2Class: Iso2Class = ['H', 'K', 'L'].includes(saved.iso2Class) ? saved.iso2Class : 'K';
    const exclude = { ...DEFAULT_EXCLUSIONS, ...(saved.exclude ?? {}) };

    if (saved.schemes && typeof saved.schemes === 'object') {
        const schemes: Record<string, ToleranceScheme> = {};
        for (const [name, s] of Object.entries(saved.schemes)) {
            const n = String(name).trim();
            if (n) schemes[n] = normalizeScheme(s);
        }
        const names = Object.keys(schemes);
        if (!names.length) return { ...d, unit, iso1Class, iso2Class, exclude };
        return {
            tab: TABS.includes(saved.tab) ? saved.tab : 'custom',
            currentScheme: schemes[saved.currentScheme] ? saved.currentScheme : names[0],
            schemes, unit, iso1Class, iso2Class, exclude,
        };
    }

    // The first port's shape.
    if (saved.scheme) {
        d.schemes[LEGACY_DECIMAL_SCHEME] = {
            ...newScheme('decimal'),
            decimalLinear: decimalMap(saved.scheme.dimension),
            decimalAngular: decimalMap(saved.scheme.angle),
        };
    }
    return {
        ...d,
        tab: saved.mode === 'iso2768' ? 'iso1' : 'custom',
        unit, iso1Class, iso2Class, exclude,
    };
}

/**
 * Held on MasterSettings, like the keyword filter.
 *
 * Not per part: the schemes, the class and the title-block values are a
 * property of the shop and the customer, not of one drawing, and an operator
 * who sets them once should not set them again on the next part - or find that
 * the operator at the next machine is working to a different ISO class.
 */
export function loadToleranceSettings(): ToleranceSettings {
    try {
        const raw = getSetting('tolerance');
        return raw ? migrateToleranceSettings(JSON.parse(raw)) : defaultToleranceSettings();
    } catch {
        return defaultToleranceSettings();
    }
}

export function saveToleranceSettings(settings: ToleranceSettings): void {
    setSetting('tolerance', JSON.stringify(settings));
}
