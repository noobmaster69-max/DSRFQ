/**
 * Exercises the ported area-sort strategies against hand-checkable layouts.
 *
 *     node .mssql-scripts/check_ballooning_areasort.mjs
 */

import { build } from '../DSRFQ.Web/node_modules/esbuild/lib/main.js';
import { pathToFileURL } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath as __f2p } from 'node:url';
import { dirname as __dn, resolve as __rs } from 'node:path';

// The settings store talks to a Serenity service, which needs a browser. These
// modules only need its values, so the bundle uses the in-memory stub instead.
const stubStore = {
    name: 'stub-settings-store',
    setup(b) {
        const stub = __rs(__dn(__f2p(import.meta.url)), 'stubs', 'BallooningSettingsStore.ts');
        b.onResolve({ filter: /BallooningSettingsStore$/ }, () => ({ path: stub }));
    },
};


const DIR = 'DSRFQ.Web/Modules/Common/Widgets/BallooningWidget';
const fails = [];
const check = (name, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
    if (!ok) fails.push(name);
};

const tmp = mkdtempSync(join(tmpdir(), 'areasort-'));
const load = async (file) => {
    const out = join(tmp, file.replace(/\.ts$/, '.mjs'));
    await build({
        entryPoints: [`${DIR}/${file}`], outfile: out, bundle: true,
    plugins: [stubStore],
        format: 'esm', platform: 'neutral', logLevel: 'warning',
    });
    return import(pathToFileURL(out).href);
};

const S = await load('BallooningAreaSort.ts');
const R = await load('BallooningRegions.ts');
const N = await load('BallooningNumbering.ts');

// A balloon at a point. Percent coordinates, as the widget uses.
const b = (id, x, y, section = '') => ({
    id, balloonNumber: 0, balloonX: x, balloonY: y, section, viewId: 0,
    rect: { x, y, width: 1, height: 1 },
});
const ids = (list) => list.map(a => a.id).join(' ');

// A4/A3 short edge; the tolerance works out at ~1.37% of page height.
const PAGE_H = 11.69;

console.log('1. the row tolerance is a physical distance, not a pixel count');
const tGrid = S.rowTolerancePct('gridCell', PAGE_H);
const tPage = S.rowTolerancePct('page', PAGE_H);
check('grid-cell tolerance ~1.37% on an A3 sheet',
    Math.abs(tGrid - 1.368) < 0.01, tGrid.toFixed(3) + '%');
check('page tolerance is tighter than the in-cell one', tPage < tGrid,
    `${tPage.toFixed(3)}% < ${tGrid.toFixed(3)}%`);
check('a taller sheet gets a smaller percentage',
    S.rowTolerancePct('gridCell', 22) < tGrid,
    S.rowTolerancePct('gridCell', 22).toFixed(3) + '% on a D-size sheet');

console.log('\n2. row clustering anchors on the first member, so rows cannot drift');
// Six balloons each 1% below the last. With a 1.37% tolerance a running
// last-Y comparison would swallow all six into one row; anchoring caps it.
const ladder = Array.from({ length: 6 }, (_, i) => b(`L${i}`, 10, 10 + i * 1.0));
const rows = S.clusterVisualRows(ladder, tGrid);
check('a 1%-per-step ladder does not collapse into one row',
    rows.length > 1, `${rows.length} rows: ${rows.map(r => ids(r)).join(' | ')}`);

const tight = [b('a', 10, 10), b('c', 30, 10.5), b('b', 20, 10.2)];
check('balloons within tolerance form one row',
    S.clusterVisualRows(tight, tGrid).length === 1);

console.log('\n3. reading order vs snake');
// Two rows of three: top row y=10, bottom row y=20.
const twoRows = [
    b('t1', 10, 10), b('t2', 20, 10), b('t3', 30, 10),
    b('b1', 10, 20), b('b2', 20, 20), b('b3', 30, 20),
];
check('reading order: every row left to right',
    ids(S.sortByReadingOrder(twoRows, tGrid)) === 't1 t2 t3 b1 b2 b3',
    ids(S.sortByReadingOrder(twoRows, tGrid)));
check('snake: second row runs back the other way',
    ids(S.sortBySnakeRows(twoRows, tGrid)) === 't1 t2 t3 b3 b2 b1',
    ids(S.sortBySnakeRows(twoRows, tGrid)));

console.log('\n4. the straight-line modes');
const scatter = [b('p1', 30, 20), b('p2', 10, 30), b('p3', 20, 10)];
const m = (mode) => ids(S.sortArea(scatter, { mode, pageHeightInches: PAGE_H }));
check('left_to_right', m('left_to_right') === 'p2 p3 p1', m('left_to_right'));
check('right_to_left', m('right_to_left') === 'p1 p3 p2', m('right_to_left'));
check('top_to_bottom', m('top_to_bottom') === 'p3 p1 p2', m('top_to_bottom'));
check('bottom_to_top', m('bottom_to_top') === 'p2 p1 p3', m('bottom_to_top'));

console.log('\n5. circular sweeps start at 12 o\'clock');
// Four points on a circle about (50,50): N, E, S, W.
const centre = { x: 50, y: 50 };
const compass = [
    b('E', 70, 50), b('S', 50, 70), b('W', 30, 50), b('N', 50, 30),
];
const cw = ids(S.sortArea(compass, { mode: 'clockwise', center: centre }));
check('clockwise reads N E S W', cw === 'N E S W', cw);
const ccw = ids(S.sortArea(compass, { mode: 'counterclockwise', center: centre }));
check('counter-clockwise reads N W S E', ccw === 'N W S E', ccw);
const sweep90 = ids(S.sortArea(compass,
    { mode: 'polar_sweep', startAngle: 90, center: centre }));
check('polar sweep from 90 deg starts at East', sweep90 === 'E S W N', sweep90);
const sweep180 = ids(S.sortArea(compass,
    { mode: 'polar_sweep', startAngle: 180, center: centre }));
check('polar sweep from 180 deg starts at South', sweep180 === 'S W N E', sweep180);

console.log('\n6. same direction, near before far');
const radial = [
    b('far', 50, 20), b('near', 50, 40), b('mid', 50, 30),
];
const rad = ids(S.sortArea(radial, { mode: 'clockwise', center: centre }));
check('three points due north come out nearest first',
    rad === 'near mid far', rad);

console.log('\n7. partition follows the grid, unmatched last');
const grid = N.parseGridSystem('A1', 'H8');   // both axes ascending
const celled = [
    b('c_b2', 80, 80, 'B2'), b('un', 5, 5, ''), b('c_a1', 10, 10, 'A1'),
    b('c_a2', 40, 12, 'A2'),
];
const part = ids(S.sortArea(celled,
    { mode: 'partition', grid, pageHeightInches: PAGE_H }));
check('cells walk in grid order and unmatched trails',
    part === 'c_a1 c_a2 c_b2 un', part);
check('no grid degrades to the page snake, losing nobody',
    S.sortArea(celled, { mode: 'partition', grid: null }).length === 4);

console.log('\n8. removed modes still open');
check('boundary_clockwise falls back to reading order',
    S.normalizeSortMode('boundary_clockwise') === 'reading_order');
check('view_surround falls back too',
    S.normalizeSortMode('view_surround') === 'reading_order');
check('an empty mode is the partition default',
    S.normalizeSortMode('') === 'partition');

console.log('\n9. regions claim balloons once, in their own order');
const mkRegion = (id, order, x, y, w, h, mode) => ({
    regionId: id, pageIndex: 0, orderIndex: order,
    rect: { x, y, width: w, height: h },
    color: '#000', label: id, sortMode: mode, startAngle: 0,
});
// Region 2 is drawn first but ordered second.
const regions = [
    mkRegion('R2', 2, 0, 50, 100, 50, 'left_to_right'),
    mkRegion('R1', 1, 0, 0, 100, 40, 'right_to_left'),
];
const page = [
    b('top_l', 10, 10), b('top_r', 90, 10),
    b('bot_l', 10, 60), b('bot_r', 90, 60),
    b('loose', 50, 45),
];
const ordered = R.orderByRegions(page, regions, { grid: null, pageHeightInches: PAGE_H });
check('R1 first (right-to-left), then R2 (left-to-right), leftovers last',
    ids(ordered) === 'top_r top_l bot_l bot_r loose', ids(ordered));
check('nobody is numbered twice', new Set(ordered.map(a => a.id)).size === 5);
check('no regions at all is just reading order',
    R.orderByRegions(page, [], { grid: null }).length === 5);

console.log('\n9b. reordering the areas changes which balloons number first');
// R1 currently owns the top strip. Swap the two and the bottom strip should
// take the low numbers instead.
const swapped = R.resequenceRegions([
    mkRegion('R2', 2, 0, 50, 100, 50, 'left_to_right'),
    mkRegion('R1', 1, 0, 0, 100, 40, 'right_to_left'),
]);
check('resequence renumbers and relabels from list position',
    swapped.map(r => `${r.orderIndex}:${r.label}`).join(' ') === '1:Area 1 2:Area 2',
    swapped.map(r => `${r.orderIndex}:${r.label}`).join(' '));
check('colour follows position, so the palette stays in step',
    swapped[0].color !== swapped[1].color,
    `${swapped[0].color} / ${swapped[1].color}`);
const afterSwap = R.orderByRegions(page, swapped, { grid: null, pageHeightInches: PAGE_H });
check('the bottom strip is now numbered first',
    ids(afterSwap) === 'bot_l bot_r top_r top_l loose', ids(afterSwap));
check('nobody was lost in the swap', afterSwap.length === 5);

console.log('\n10. numbering keeps children off the sequence');
const withKids = [
    { ...b('p1', 10, 10), balloonNumber: 4 },
    { ...b('p1a', 11, 10), balloonNumber: 4, subNumber: 1 },
    { ...b('p2', 20, 10), balloonNumber: 9 },
];
const used = R.applyNumbering(withKids, 1);
check('two parents consumed two numbers', used === 2, String(used));
check('parents renumbered 1 and 2',
    withKids[0].balloonNumber === 1 && withKids[2].balloonNumber === 2,
    withKids.map(a => `${a.id}=${a.balloonNumber}${a.subNumber ? '-' + a.subNumber : ''}`).join(' '));
check('child followed its parent to 1',
    withKids[1].balloonNumber === 1 && withKids[1].subNumber === 1);

const orphan = [{ ...b('o', 10, 10), balloonNumber: 77, subNumber: 1 }];
R.applyNumbering(orphan, 1);
check('an orphan keeps its own number', orphan[0].balloonNumber === 77);

console.log('\n11. start id is honoured');
const three = [b('x', 10, 10), b('y', 20, 10), b('z', 30, 10)]
    .map(a => ({ ...a, balloonNumber: 0 }));
R.applyNumbering(three, 10);
check('numbering can start at 10',
    three.map(a => a.balloonNumber).join(' ') === '10 11 12',
    three.map(a => a.balloonNumber).join(' '));

rmSync(tmp, { recursive: true, force: true });
console.log(`\n${fails.length ? `${fails.length} FAILED: ${fails.join(', ')}` : 'ALL PASS'}`);
process.exit(fails.length ? 1 : 0);
