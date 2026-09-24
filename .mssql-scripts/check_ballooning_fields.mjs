/**
 * Balloon styles and the One Supply fields: quantity input, tolerance in the
 * text, categories, symbol filter, PDF export filter, GD&T grouping, audit walk.
 *
 *   cd .mssql-scripts
 *   node --experimental-strip-types --no-warnings --import ./ts-stub-loader.mjs check_ballooning_fields.mjs
 */
import {
    resolveBalloonStyle, shapeSvg, DEFAULT_BUBBLE_STYLE, loadBubbleStyle, saveBubbleStyle,
} from '../DSRFQ.Web/Modules/Common/Widgets/BallooningWidget/BallooningStyle.ts';
import {
    parseQuantityInput, splitTolerance, normalizeCategoryOrder, categoryRank, applySymbolFilter,
    filterForExport, groupGdtWithDimensions, nextUnaudited, isReferenceBalloon, isTheoreticalBalloon,
    DEFAULT_CATEGORY_ORDER, effectiveCategory,
} from '../DSRFQ.Web/Modules/Common/Widgets/BallooningWidget/BallooningFields.ts';
import { renumberAcrossPages } from '../DSRFQ.Web/Modules/Common/Widgets/BallooningWidget/BallooningEditing.ts';
import { exclusionReason, DEFAULT_EXCLUSIONS } from '../DSRFQ.Web/Modules/Common/Widgets/BallooningWidget/BallooningTolerance.ts';

let fails = 0;
const check = (name, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== '' ? '  ' + detail : ''}`);
    if (!ok) fails++;
};
const eq = (name, got, want) =>
    check(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}`);

console.log('1. style');
let s = resolveBalloonStyle({}, DEFAULT_BUBBLE_STYLE);
eq('an unstyled balloon follows the shop', [s.shape, s.stroke, s.arrow, s.scale], ['circle', '#2778b9', false, 1]);
s = resolveBalloonStyle({ balloonShape: 'solid', balloonColor: '#ff0000' });
eq('solid fills with its colour and writes white', [s.fill, s.text], ['#ff0000', '#ffffff']);
s = resolveBalloonStyle({ balloonStyle: 'error' });
check('a preset colours it', s.stroke === '#dc2626');
s = resolveBalloonStyle({ balloonColor: '#00ff00' }, DEFAULT_BUBBLE_STYLE, true);
check('selection overrides colour', s.stroke === '#ff8c00');
check('a bad colour is ignored', resolveBalloonStyle({ balloonColor: 'red;x' }).stroke === '#2778b9');
check('line width levels map to wider strokes',
      resolveBalloonStyle({ balloonLineWidth: 5 }).strokeWidth > resolveBalloonStyle({ balloonLineWidth: 1 }).strokeWidth);
check('triangle and star draw polygons', shapeSvg(resolveBalloonStyle({ balloonShape: 'star' })).startsWith('<polygon'));
saveBubbleStyle({ ...DEFAULT_BUBBLE_STYLE, shape: 'triangle', lineWidth: 4 });
eq('shop style round-trips', [loadBubbleStyle().shape, loadBubbleStyle().lineWidth], ['triangle', 4]);

console.log('\n2. quantity input');
for (const [raw, want] of [['4', 4], ['4x', 4], ['4 X', 4], ['×4', 4], ['(1-4)', 4], ['1-6', 6], ['1', undefined], ['', undefined]])
    eq(`"${raw}"`, parseQuantityInput(raw), { ok: true, quantity: want });
for (const raw of ['abc', '0', '4-1', '(2-4)'])
    check(`"${raw}" refused`, parseQuantityInput(raw).ok === false);

console.log('\n3. tolerance in the text');
eq('Ø.380 ±.005', splitTolerance('Ø.380 ±.005'), { content: 'Ø.380', upper: '+.005', lower: '-.005' });
eq('10 +0.1/-0.05', splitTolerance('10 +0.1/-0.05'), { content: '10', upper: '+0.1', lower: '-0.05' });
eq('25+.002-.000', splitTolerance('25+.002-.000'), { content: '25', upper: '+.002', lower: '-.000' });
eq('45° ±1°', splitTolerance('45° ±1°'), { content: '45°', upper: '+1°', lower: '-1°' });
check('a plain dimension has none', splitTolerance('4X Ø.250') === null);
check('a thread is not a tolerance', splitTolerance('M8x1.25-6H') === null);

console.log('\n4. categories');
eq('order is normalised to every category once', normalizeCategoryOrder(['bom', 'bom', 'x', 'notes']),
   ['bom', 'notes', ...DEFAULT_CATEGORY_ORDER.filter(k => k !== 'bom' && k !== 'notes')]);
check('no category ranks as normal', categoryRank(DEFAULT_CATEGORY_ORDER, undefined) === DEFAULT_CATEGORY_ORDER.indexOf('normal'));
// One Supply files NOTES under technical requirements, so a reorder starts from them.
eq('a note with no category is a technical requirement', effectiveCategory({ isNote: true }), 'notes');
eq('a dimension with no category is normal', effectiveCategory({ isNote: false }), 'normal');
eq('a chosen category wins over the note default', effectiveCategory({ isNote: true, numberCategory: 'normal' }), 'normal');
{
    const at = (id, x, y, isNote = false) => ({ id, balloonNumber: 0, pageIndex: 0, rect: { x, y, width: 1, height: 1 }, isNote });
    // notes sit bottom-right, as on a title-block sheet; reading order alone would number them last
    const sheet = [at('d1', 10, 10), at('n1', 80, 80, true), at('d2', 50, 20), at('n2', 80, 85, true)];
    renumberAcrossPages(sheet, (_p, onPage) => [...onPage].sort((a, c) => a.rect.y - c.rect.y),
        a => categoryRank(DEFAULT_CATEGORY_ORDER, effectiveCategory(a)));
    eq('renumber with areas: notes take 1 and 2, dimensions follow',
       ['n1', 'n2', 'd1', 'd2'].map(id => sheet.find(a => a.id === id).balloonNumber), [1, 2, 3, 4]);
}

console.log('\n5. symbol filter');
eq('strips symbols', applySymbolFilter('Ø10 ±0.1', ['Ø', '±']), '10 0.1');
eq('a letter only where it touches a number', applySymbolFilter('4x .250 MAX', ['x']), '4 .250 MAX');
eq('mm after a number', applySymbolFilter('25mm', ['mm']), '25');

console.log('\n6. reference / basic, marked or read');
check('marked reference', isReferenceBalloon({ dimensionFeature: 'reference', content: '10' }));
check('read from the text', isReferenceBalloon({ content: '(10)' }));
check('marked None beats the text? (empty = unmarked, so text still counts)', isTheoreticalBalloon({ content: '1.250 BSC' }));
check('tolerance exclusion honours the mark',
      exclusionReason({ id: 'a', content: '12.5', dimensionFeature: 'theoretical' }, DEFAULT_EXCLUSIONS) === 'theoretical');

console.log('\n7. PDF export filter');
const b = (id, n, page, extra = {}) => ({ id, balloonNumber: n, pageIndex: page, rect: { x: 0, y: 0, width: 1, height: 1 }, content: '1', ...extra });
const set = [b('a', 1, 0), b('r', 2, 0, { content: '(5)' }), b('c', 3, 0), b('d', 4, 1, { dimensionFeature: 'theoretical' }), b('e', 5, 1)];
const f = filterForExport(set, { hideReference: true, hideTheoretical: true });
eq('hidden ones go, the rest close up', f.list.map(a => `${a.id}${a.balloonNumber}`), ['a1', 'c2', 'e3']);
check('the drawing keeps its numbers', set[2].balloonNumber === 3 && f.hidden === 2);

console.log('\n8. GD&T group sorting');
const r = (x, y, w = 4, h = 1) => ({ x, y, width: w, height: h });
const dim = b('dim', 1, 0, { content: 'Ø.500', rect: r(10, 10) });
const other = b('other', 2, 0, { content: '.250', rect: r(60, 11) });
const frame = b('frame', 3, 0, { content: '⌖ ⌀.005 A B', rect: r(10, 11.5) });
eq('the frame follows its dimension', groupGdtWithDimensions([dim, other, frame]).map(a => a.id), ['dim', 'frame', 'other']);
const far = b('far', 3, 0, { content: '▱ .002', rect: r(40, 60) });
eq('a lone frame stays put', groupGdtWithDimensions([dim, other, far]).map(a => a.id), ['dim', 'other', 'far']);

console.log('\n9. audit walk');
const list = [{ id: '1', audited: true }, { id: '2' }, { id: '3', audited: true }, { id: '4' }];
eq('next after 2', nextUnaudited(list, '2'), '4');
eq('wraps round', nextUnaudited(list, '4'), '2');
check('none left', nextUnaudited(list.map(a => ({ ...a, audited: true })), '1') === null);

console.log(`\n${fails ? fails + ' FAILED' : 'ALL PASS'}`);
process.exit(fails ? 1 : 0);
