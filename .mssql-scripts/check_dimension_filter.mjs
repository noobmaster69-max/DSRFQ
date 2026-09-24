/**
 * Structural dimension filters: do they catch prose without eating dimensions?
 *
 * The expensive failure is a false positive — filtering ".500 THRU" because it
 * contains letters loses a real hole from the inspection report, and nobody
 * notices until the part is measured.
 *
 *   node .mssql-scripts/check_dimension_filter.mjs
 */
import {
    stripQuantityPrefix, isReferenceDimension, looksLikeEngineering,
    resolveEnglishNoise, findStructuralMatches,
} from '../DSRFQ.Web/Modules/Common/Widgets/BallooningWidget/BallooningDimensionFilter.ts';

let fails = 0;
const check = (name, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
    if (!ok) fails++;
};

console.log('1. quantity prefix');
check('4X stripped', stripQuantityPrefix('4X .250').content === '.250');
check('full-width multiply stripped', stripQuantityPrefix('3× .250').content === '.250');
check('bracketed quantity stripped', stripQuantityPrefix('(3×) .250').content === '.250');
// Below 2 is not a repeat; above 99 is a misread dimension.
check('1X is not a quantity', stripQuantityPrefix('1X .250').content === '1X .250');
check('a thread is untouched', stripQuantityPrefix('M8x1').content === 'M8x1');

console.log('\n2. reference dimensions');
check('(50) is a reference', isReferenceDimension('(50)'));
check('full-width brackets too', isReferenceDimension('（50）'));
check('4X (50) is a reference', isReferenceDimension('4X (50)'));
// Brackets around PART of the text are not a reference dimension.
check('.500 (REF ONLY) is not', !isReferenceDimension('.500 (REF ONLY)'));
check('a plain dimension is not', !isReferenceDimension('.500'));
check('empty is not', !isReferenceDimension(''));

console.log('\n3. engineering text is kept');
for (const t of ['.500', '⌀.380', '45°', 'M8x1.25', 'M8x1.25-6H', 'R11.5',
                 'Ra 1.6', '2X ⌀.250 THRU', '.500 TYP', '4X', 'N7',
                 '⌖ ⌀.005 A B C']) {
    check(`kept: ${t}`, looksLikeEngineering(t));
}

console.log('\n4. prose is not');
for (const t of ['ALL AROUND', 'SEE NOTE 4', 'BREAK SHARP EDGES',
                 'MATERIAL PER SPEC', 'DEBURR AND CLEAN']) {
    check(`not engineering: ${t}`, !looksLikeEngineering(t));
}

console.log('\n5. salvage from noise');
const r = resolveEnglishNoise('R11.5 ALL AROUND');
check('R11.5 ALL AROUND salvages R11.5', r.filter === false && r.salvaged === 'R11.5',
      JSON.stringify(r));
// Must not salvage a bare quantity - "6X" alone is a count of nothing.
const q = resolveEnglishNoise('6X TOL NON-ACCUM');
check('6X TOL NON-ACCUM does not salvage a bare 6X', q.salvaged !== '6X', JSON.stringify(q));
check('pure prose is filtered', resolveEnglishNoise('BREAK SHARP EDGES').filter === true);
check('a dimension is never filtered', resolveEnglishNoise('⌀.380').filter === false);
check('no letters is never filtered', resolveEnglishNoise('.500').filter === false);
check('THRU is kept whole',
      resolveEnglishNoise('2X ⌀ 6.10 THRU').filter === false
      && resolveEnglishNoise('2X ⌀ 6.10 THRU').salvaged === undefined);

console.log('\n6. across a selection');
const anns = [
    {id: 'a', content: '.380'},
    {id: 'b', content: '(1.250)'},
    {id: 'c', content: 'BREAK SHARP EDGES'},
    {id: 'd', content: '11. CLEAN PER SPEC', isNote: true},
    {id: 'e', content: 'R11.5 ALL AROUND'},
];
const off = findStructuralMatches(anns, {reference: false, englishNoise: false});
check('nothing matches when both are off', off.length === 0);

const refOnly = findStructuralMatches(anns, {reference: true, englishNoise: false});
check('reference filter catches only the bracketed one',
      refOnly.length === 1 && refOnly[0].id === 'b', JSON.stringify(refOnly));

const both = findStructuralMatches(anns, {reference: true, englishNoise: true});
const ids = both.map(h => h.id).sort();
check('notes are exempt', !ids.includes('d'), JSON.stringify(ids));
check('the real dimension is untouched', !ids.includes('a'));
const salvage = both.find(h => h.id === 'e');
check('the salvageable one is reported as salvage, not removal',
      salvage && salvage.salvaged === 'R11.5', JSON.stringify(salvage));

console.log(`\n${fails ? fails + ' FAILED' : 'ALL PASS'}`);
process.exit(fails ? 1 : 0);
