/**
 * Does the general-tolerance logic agree with One Supply, and does it refuse
 * the things it must refuse?
 *
 * The ISO tables are copied data, so most of this is "does the lookup land in
 * the right band", the custom-scheme rules One Supply defines (decimal places,
 * size ranges, geometric), the five exclusions, and "Update applied" touching
 * only what an earlier apply labelled.
 *
 *   cd .mssql-scripts
 *   node --experimental-strip-types --import ./ts-stub-loader.mjs check_ballooning_tolerance.mjs
 */
import {
    extractNominal, lookupIsoBand, calcIso1, calcIso2, calcDecimal, calcScheme,
    proposeDefaultTolerances, proposeUpdateApplied, ISO_2768_1_LINEAR, DECIMAL_SCHEME_INCH,
    defaultToleranceSettings, newScheme, LEGACY_DECIMAL_SCHEME, isoTablesFor,
    ensureAngleDegree, formatDecimalPlacesLabel, parseDecimalPlacesLabel,
    validateToleranceInput, validateGeometricInput, normalizeTolerancePair,
    standardMatchesScheme, isFastenerOrInstallText, isReferenceForTolerance,
    isTheoreticalDimension, migrateToleranceSettings, sourceFromStandard,
    standardOptions, loadToleranceSettings, saveToleranceSettings, calcForSource,
} from '../DSRFQ.Web/Modules/Common/Widgets/BallooningWidget/BallooningTolerance.ts';

let fails = 0;
const check = (name, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== '' ? '  ' + detail : ''}`);
    if (!ok) fails++;
};
const eq = (name, got, want) =>
    check(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}`);
const ids = out => out.proposals.map(p => p.id).sort();

console.log('1. reading the nominal off a balloon');
eq('plain inch decimal', extractNominal('.380'), { value: 0.38, decimals: 3, isAngle: false });
eq('diameter prefix ignored', extractNominal('⌀.380'), { value: 0.38, decimals: 3, isAngle: false });
eq('quantity prefix stripped', extractNominal('4X .250'), { value: 0.25, decimals: 3, isAngle: false });
eq('angle detected', extractNominal('45°'), { value: 45, decimals: 0, isAngle: true });
eq('thread spec is not a quantity', extractNominal('M8x1'), { value: 8, decimals: 0, isAngle: false });
check('text with no number is refused', extractNominal('SEE NOTE 4') === null);

console.log('\n2. ISO 2768 band lookup (over exclusive, upTo inclusive)');
check('3 falls in 0.5-3, not 3-6', lookupIsoBand(3, ISO_2768_1_LINEAR.m) === 0.1);
check('30.1 falls in 30-120', lookupIsoBand(30.1, ISO_2768_1_LINEAR.m) === 0.3);
check('0.4 takes the first band', lookupIsoBand(0.4, ISO_2768_1_LINEAR.m) === 0.1);
check('beyond the last band is null', lookupIsoBand(99999, ISO_2768_1_LINEAR.m) === null);
eq('120 mm -> +/-0.3', calcIso1({ value: 120, decimals: 0, isAngle: false }, 'm', 'mm'),
   { upper: '+0.3', lower: '-0.3' });
eq('.380 inch -> mm band -> back to inch',
   calcIso1({ value: 0.38, decimals: 3, isAngle: false }, 'm', 'inch'),
   { upper: '+0.0079', lower: '-0.0079' });
eq('edited ISO table is used for the run',
   calcIso1({ value: 120, decimals: 0, isAngle: false }, 'm', 'mm', { linear: [[0, 1000, 0.7]], angular: [] }),
   { upper: '+0.7', lower: '-0.7' });

console.log('\n3. decimal places (match_decimal_tolerance)');
eq('3 places -> +/-.005', calcDecimal({ value: 0.38, decimals: 3, isAngle: false },
   DECIMAL_SCHEME_INCH.dimension), { upper: '+.005', lower: '-.005' });
eq('4 places falls back to the widest', calcDecimal({ value: 0.3805, decimals: 4, isAngle: false },
   DECIMAL_SCHEME_INCH.dimension), { upper: '+.005', lower: '-.005' });
check('a gap in the middle matches nothing',
      calcDecimal({ value: 1.2, decimals: 1, isAngle: false },
                  { '0': { upper: '+.06', lower: '-.06' }, '3': { upper: '+.005', lower: '-.005' } }) === null);

console.log('\n4. tolerance_utils ports');
eq('degree added to an angle tolerance', ensureAngleDegree('+1'), '+1°');
eq('degree not doubled', ensureAngleDegree('+1°'), '+1°');
eq('places label 2 -> 0.00', formatDecimalPlacesLabel(2), '0.00');
eq('places label 0 -> 0', formatDecimalPlacesLabel(0), '0');
eq('parse 0.00 / 2 / X.XX / .XXX / junk',
   ['0.00', '2', 'X.XX', '.XXX', 'abc'].map(parseDecimalPlacesLabel), [2, 2, 2, 3, null]);
check('+.005 is a valid tolerance (inch, no leading zero)', validateToleranceInput('+.005'));
check('1° is valid as an angle', validateToleranceInput('1°', true));
check('1° is not valid as a length', !validateToleranceInput('1°', false));
check('negative geometric tolerance refused', !validateGeometricInput('-0.1'));
eq('unsigned symmetric pair becomes +/-', normalizeTolerancePair({ upper: '1', lower: '1' }),
   { upper: '+1', lower: '-1' });
eq('upside-down pair is swapped', normalizeTolerancePair({ upper: '-0.1', lower: '+0.2' }),
   { upper: '+0.2', lower: '-0.1' });
check('"[Decimal] A" matches scheme A', standardMatchesScheme('[Decimal] A', 'A'));
check('bare "A" matches scheme A', standardMatchesScheme('A', 'A'));
check('"[Range] B" does not match A', !standardMatchesScheme('[Range] B', 'A'));

console.log('\n5. exclusion classifiers');
for (const t of ['NAS1130-4FL20D', '2X MS20426AD', 'INSTALL THIS SIDE', 'THRU BOTH WALLS'])
    check(`fastener/install: ${t}`, isFastenerOrInstallText(t));
// One Supply's bare THRU would drop every through-hole diameter.
for (const t of ['⌀.250 THRU', 'M8x1', '.380', 'R.25'])
    check(`not fastener: ${t}`, !isFastenerOrInstallText(t));
for (const t of ['(50)', '(Ø10)', '2X (.500)', '50 REF'])
    check(`reference: ${t}`, isReferenceForTolerance(t));
check('plain dimension is not reference', !isReferenceForTolerance('.500'));
for (const t of ['1.250 BSC', '[1.250]', '2X [.750]', '45° BASIC'])
    check(`basic: ${t}`, isTheoreticalDimension(t));
check('plain dimension is not basic', !isTheoreticalDimension('1.250'));

console.log('\n6. Apply, default settings (decimal scheme, inch title block)');
const base = defaultToleranceSettings();
const mix = [
    { id: 'a', content: '.380' },                                        // eligible
    { id: 'b', content: '.500', upperTol: '+.005', lowerTol: '-.000' },  // already toleranced
    { id: 'c', content: '11. CLEAN PER SPEC', isNote: true },            // note
    { id: 'd', content: '⌖ ⌀.005 A B C' },                               // position frame
    { id: 'e', content: '▱ .002' },                                      // flatness
    { id: 'f', content: 'Ra 1.6' },                                      // surface finish
    { id: 'g', content: 'SEE VIEW D' },                                  // no number
    { id: 'h', content: '2X ⌀.250' },                                    // eligible, qty prefix
    { id: 'i', content: '(1.000)' },                                     // reference
    { id: 'j', content: '[2.000]' },                                     // basic
    { id: 'k', content: 'NAS1130-4' },                                   // fastener
    { id: 'l', content: 'A', isDatum: true },                            // datum marker
];
const out = proposeDefaultTolerances(mix, base);
eq('only the two real dimensions are proposed', ids(out), ['a', 'h']);
check('a printed tolerance is never overwritten', out.skippedHasTolerance === 1);
eq('exclusion counts', out.excluded, { geometric: 4, notes: 1, theoretical: 1, reference: 1, fastener: 1 });
check('no number -> no rule', out.skippedNoRule === 1, out.skippedNoRule);
eq('proposal carries the scheme label', out.proposals.find(p => p.id === 'a'),
   { id: 'a', upper: '+.005', lower: '-.005', standard: `[Decimal] ${LEGACY_DECIMAL_SCHEME}` });

const noRefExcl = { ...base, exclude: { ...base.exclude, reference: false } };
check('un-ticking "reference" lets (1.000) through',
      ids(proposeDefaultTolerances(mix, noRefExcl)).includes('i'));

console.log('\n7. size-range scheme');
const range = { ...newScheme('range'),
    rangeLinear: [{ min: 0, max: 1, upper: '+.01', lower: '-.01' }, { min: 1, max: 10, upper: '+.02', lower: '-.02' }],
    rangeAngular: [{ min: 0, max: 90, upper: '+1', lower: '-1' }] };
const nom = t => extractNominal(t);
eq('.380 -> first row', calcScheme(nom('.380'), range), { upper: '+.01', lower: '-.01' });
eq('5.0 -> second row', calcScheme(nom('5.0'), range), { upper: '+.02', lower: '-.02' });
check('25 is past the last row -> nothing (no decimal fallback)', calcScheme(nom('25'), range) === null);
eq('angle row gets its degree sign', calcScheme(nom('45°'), range), { upper: '+1°', lower: '-1°' });
const blankRow = { ...range, rangeLinear: [{ min: 0, max: 1, upper: '', lower: '' }] };
check('a blank row matches nothing', calcScheme(nom('.380'), blankRow) === null);

console.log('\n8. geometric scheme');
const geoSettings = { ...base, schemes: { ...base.schemes, G: newScheme('geometric') }, currentScheme: 'G' };
const geo = proposeDefaultTolerances([
    { id: 'flat', content: '▱ .002' },
    { id: 'run', content: '↗ .003' },
    { id: 'dim', content: '.380' },
    { id: 'pos', content: '⌖ ⌀.005 A B C' },
], geoSettings);
eq('flatness and runout filled', ids(geo), ['flat', 'run']);
eq('flatness from the K band', geo.proposals.find(p => p.id === 'flat'),
   { id: 'flat', upper: '+0.05', lower: '-0.05', standard: '[Geometric] G' });
check('a plain dimension is not covered by a geometric scheme', geo.skippedNotCovered === 1, geo.skippedNotCovered);
check('position has no 2768-2 row -> no rule', geo.skippedNoRule === 1, geo.skippedNoRule);

console.log('\n9. ISO tabs');
const iso2 = proposeDefaultTolerances([{ id: 'e', content: '▱ .002' }, { id: 'a', content: '.380' }],
    { ...base, tab: 'iso2', unit: 'mm' });
eq('ISO 2768-2 fills the flatness only', ids(iso2), ['e']);
check('and says so', iso2.proposals[0]?.standard === 'ISO 2768-2 K', iso2.proposals[0]?.standard);
for (const g of ['⊥', '⟂']) {
    const r = calcIso2(g, { value: 50, decimals: 0, isAngle: false }, 'K', 'mm');
    check(`perpendicularity ${g.codePointAt(0).toString(16)} resolves`, r !== null, JSON.stringify(r));
}
const iso1 = proposeDefaultTolerances([{ id: 'x', content: '120' }], { ...base, tab: 'iso1', unit: 'mm' },
    { ...isoTablesFor('m', 'K'), linear: [[0, 1000, 0.7]] });
eq('ISO 2768-1 uses the edited table', iso1.proposals[0], { id: 'x', upper: '+0.7', lower: '-0.7', standard: 'ISO 2768-1 m' });

console.log('\n10. Update applied');
const edited = defaultToleranceSettings();
edited.schemes[LEGACY_DECIMAL_SCHEME].decimalLinear['3'] = { upper: '+.004', lower: '-.004' };
const applied = [
    { id: 'p', content: '.380', upperTol: '+.005', lowerTol: '-.005', toleranceStandard: `[Decimal] ${LEGACY_DECIMAL_SCHEME}` },
    { id: 'q', content: '.750', upperTol: '+.005', lowerTol: '-.005', toleranceStandard: '.XXX' },   // first-port label
    { id: 'r', content: '.380', upperTol: '+.003', lowerTol: '-.001' },                             // typed by hand
    { id: 's', content: 'SEE NOTE', upperTol: '+.005', lowerTol: '-.005', toleranceStandard: `[Decimal] ${LEGACY_DECIMAL_SCHEME}` },
];
const upd = proposeUpdateApplied(applied, edited);
eq('recalculates the labelled balloons, including the legacy label', ids(upd), ['p', 'q']);
check('both change', upd.changed === 2, upd.changed);
check('the hand-typed one is not touched', !ids(upd).includes('r'));
check('a labelled balloon that no longer matches is left and counted', upd.unmatched === 1, upd.unmatched);
eq('new values', upd.proposals.find(p => p.id === 'p'),
   { id: 'p', upper: '+.004', lower: '-.004', standard: `[Decimal] ${LEGACY_DECIMAL_SCHEME}` });
const isoUpd = proposeUpdateApplied(
    [{ id: 'm', content: '120', upperTol: '+0.3', lowerTol: '-0.3', toleranceStandard: 'ISO 2768-1 m' }],
    { ...base, tab: 'iso1', iso1Class: 'f', unit: 'mm' });
eq('an ISO class change relabels', isoUpd.proposals[0], { id: 'm', upper: '+0.15', lower: '-0.15', standard: 'ISO 2768-1 f' });

console.log('\n11. per-balloon "Tolerance from"');
check('ISO 2768-1 c resolves', sourceFromStandard('ISO 2768-1 c', base)?.cls === 'c');
check('a scheme label resolves', sourceFromStandard('[Range] Size range', base)?.name === 'Size range');
check('a legacy label resolves to the migrated scheme', sourceFromStandard('.XXX', base)?.name === LEGACY_DECIMAL_SCHEME);
check('an unknown label does not', sourceFromStandard('nonsense', base) === null);
eq('recalculates one balloon', calcForSource(sourceFromStandard('ISO 2768-1 m', { ...base, unit: 'mm' }), '120'),
   { upper: '+0.3', lower: '-0.3' });
const opts = standardOptions(base);
check('options list the ISO classes and every scheme',
      opts.includes('ISO 2768-1 m') && opts.includes('ISO 2768-2 K') && opts.includes(`[Decimal] ${LEGACY_DECIMAL_SCHEME}`),
      opts.length);

console.log('\n12. settings: migration and round trip');
const v1 = migrateToleranceSettings({ mode: 'decimal', unit: 'inch', iso1Class: 'c', iso2Class: 'L', applyIso2: true,
    scheme: { dimension: { '3': { upper: '+.004', lower: '-.004' } }, angle: {} } });
check('first-port scheme kept under the legacy name',
      v1.schemes[LEGACY_DECIMAL_SCHEME].decimalLinear['3'].upper === '+.004');
check('first-port classes kept', v1.iso1Class === 'c' && v1.iso2Class === 'L');
check('other default schemes still present', Object.keys(v1.schemes).length >= 4);
check('first-port ISO mode -> ISO 2768-1 tab', migrateToleranceSettings({ mode: 'iso2768' }).tab === 'iso1');
check('garbage -> defaults', migrateToleranceSettings('nope').currentScheme === LEGACY_DECIMAL_SCHEME);
check('an unknown current scheme falls back to the first',
      migrateToleranceSettings({ schemes: { X: { type: 'range' } }, currentScheme: 'Y' }).currentScheme === 'X');
const mine = defaultToleranceSettings();
mine.schemes['Shop A'] = { ...newScheme('range'), rangeLinear: [{ min: 0, max: 6, upper: '+.1', lower: '-.1' }] };
mine.currentScheme = 'Shop A';
mine.exclude.fastener = false;
saveToleranceSettings(mine);
const back = loadToleranceSettings();
check('saved scheme reads back', back.schemes['Shop A']?.rangeLinear[0]?.upper === '+.1');
check('current scheme and exclusions read back', back.currentScheme === 'Shop A' && back.exclude.fastener === false);

console.log(`\n${fails ? fails + ' FAILED' : 'ALL PASS'}`);
process.exit(fails ? 1 : 0);
