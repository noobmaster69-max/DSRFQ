/**
 * Areas and the renumber that walks them (BallooningRegions.ts).
 *
 *   cd .mssql-scripts
 *   node --experimental-strip-types --no-warnings --import ./ts-stub-loader.mjs check_ballooning_regions.mjs
 */
import {
    makeRegion, resequenceRegions, regionContains, rectsOverlap, orderByRegions, applyNumbering,
    regionColor, REGION_PALETTE,
} from '../DSRFQ.Web/Modules/Common/Widgets/BallooningWidget/BallooningRegions.ts';

let fails = 0;
const check = (name, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== '' ? '  ' + detail : ''}`);
    if (!ok) fails++;
};
const eq = (name, got, want) =>
    check(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}`);

const b = (id, x, y, n = 0, sub) => ({
    id, balloonNumber: n, subNumber: sub, pageIndex: 0,
    rect: { x, y, width: 2, height: 1 }, balloonX: x + 3, balloonY: y,
});

console.log('1. making and ordering areas');
const r1 = makeRegion(0, { x: 0, y: 0, width: 50, height: 50 }, 0);
const r2 = makeRegion(0, { x: 50, y: 0, width: 50, height: 50 }, 1);
eq('first area is numbered 1, labelled, coloured', [r1.orderIndex, r1.label, r1.color], [1, 'Area 1', REGION_PALETTE[0]]);
check('each area gets its own id', r1.regionId !== r2.regionId);
check('palette cycles', regionColor(REGION_PALETTE.length) === REGION_PALETTE[0]);
const reseq = resequenceRegions([r2, r1]);
eq('resequencing renumbers, relabels and recolours in the new order',
   reseq.map(r => [r.regionId === r2.regionId ? 'r2' : 'r1', r.orderIndex, r.label]), [['r2', 1, 'Area 1'], ['r1', 2, 'Area 2']]);

console.log('\n2. overlap and containment');
check('side-by-side areas do not overlap', !rectsOverlap(r1.rect, r2.rect));
check('overlapping areas are detected', rectsOverlap(r1.rect, { x: 40, y: 40, width: 20, height: 20 }));
check('a balloon inside is contained', regionContains(r1, b('in', 10, 10)));
check('a balloon outside is not', !regionContains(r1, b('out', 80, 80)));

console.log('\n3. renumber order');
const noAreas = [b('low', 10, 40), b('high', 10, 5), b('right', 60, 5)];
eq('no areas: reading order (top row left to right, then down)',
   orderByRegions(noAreas, [], { grid: null }).map(a => a.id), ['high', 'right', 'low']);
// Area 1 is the RIGHT half, so what is in it is numbered first.
const right = { ...r2, orderIndex: 1 }, left = { ...r1, orderIndex: 2 };
const mixed = [b('L1', 10, 10), b('R1', 60, 10), b('R2', 60, 30), b('stray', 10, 80)];
const leftSmall = { ...left, rect: { x: 0, y: 0, width: 50, height: 50 } };
eq('areas are walked in area order; leftovers go last',
   orderByRegions(mixed, [leftSmall, right], { grid: null }).map(a => a.id), ['R1', 'R2', 'L1', 'stray']);

console.log('\n4. applying numbers');
const seq = [b('a', 0, 0, 7), b('a1', 0, 0, 7, 1), b('c', 0, 0, 3), b('orphan', 0, 0, 99, 2)];
const parents = applyNumbering(seq, 10);
eq('parents numbered from the start value', [seq[0].balloonNumber, seq[2].balloonNumber], [10, 11]);
check('a child follows its parent to the new number', seq[1].balloonNumber === 10 && seq[1].subNumber === 1);
check('an orphan child keeps its number', seq[3].balloonNumber === 99);
check('returns how many parents were numbered', parents === 2, parents);

console.log(`\n${fails ? fails + ' FAILED' : 'ALL PASS'}`);
process.exit(fails ? 1 : 0);
