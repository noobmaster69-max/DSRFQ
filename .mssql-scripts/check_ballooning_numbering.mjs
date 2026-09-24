/**
 * Exercises BallooningNumbering.ts against the same cases as the Python side,
 * so the browser's ordering and the server's cannot silently diverge.
 *
 * Compiles the module with the esbuild already in DSRFQ.Web/node_modules -
 * nothing extra to install.
 *
 *     node .mssql-scripts/check_ballooning_numbering.mjs
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


const SRC = 'DSRFQ.Web/Modules/Common/Widgets/BallooningWidget/BallooningNumbering.ts';

const fails = [];
const check = (name, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
    if (!ok) fails.push(name);
};

const dir = mkdtempSync(join(tmpdir(), 'balloonnum-'));
const out = join(dir, 'mod.mjs');

await build({
    entryPoints: [SRC],
    outfile: out,
    bundle: true,
    plugins: [stubStore],
    format: 'esm',
    platform: 'neutral',
    logLevel: 'warning',
});

const M = await import(pathToFileURL(out).href);

console.log('1. formatting and parsing');
check('a plain balloon prints as its integer',
    M.formatBalloonNumber({ balloonNumber: 5 }) === '5');
check('a child prints with the default separator',
    M.formatBalloonNumber({ balloonNumber: 5, subNumber: 1 }) === '5-1');
check('the separator is configurable',
    M.formatBalloonNumber({ balloonNumber: 5, subNumber: 1 }, '.') === '5.1');
check('subNumber 0 is not a child',
    M.formatBalloonNumber({ balloonNumber: 5, subNumber: 0 }) === '5');

const rt = (s) => M.formatBalloonNumber(M.parseBalloonNumber(s));
check('"5" round-trips', rt('5') === '5');
check('"5-1" round-trips', rt('5-1') === '5-1');
check('"5.1" is accepted even under the "-" setting', rt('5.1') === '5-1',
    `got ${rt('5.1')}`);
check('a plain number parses', M.parseBalloonNumber(7).balloonNumber === 7);
check('junk degrades to 0 rather than NaN',
    M.parseBalloonNumber('abc').balloonNumber === 0);
check('null degrades to 0', M.parseBalloonNumber(null).balloonNumber === 0);

console.log('\n2. ordering puts a child straight after its parent');
const nums = [
    { balloonNumber: 6 }, { balloonNumber: 5, subNumber: 2 },
    { balloonNumber: 5 }, { balloonNumber: 5, subNumber: 1 },
];
const ordered = [...nums].sort(M.compareBalloonNumber)
    .map(n => M.formatBalloonNumber(n));
check('5, 5-1, 5-2, 6', JSON.stringify(ordered) === '["5","5-1","5-2","6"]',
    ordered.join(', '));
check('nextSubNumber follows the highest child',
    M.nextSubNumber(nums, 5) === 3, String(M.nextSubNumber(nums, 5)));
check('nextSubNumber starts at 1 for a childless parent',
    M.nextSubNumber(nums, 6) === 1);

console.log('\n2b. a quantity expands into one line per feature');
const q = (n, qty) => ({ balloonNumber: n, quantity: qty });
const labels = (list) => M.expandByQuantity(list).map(x => x.label).join(' ');

check('no multiplier stays a single line',
    labels([q(44, undefined)]) === '44', labels([q(44, undefined)]));
check('quantity 1 stays a single line', labels([q(44, 1)]) === '44');
check('quantity 2 lists 44_1 and 44_2',
    labels([q(44, 2)]) === '44_1 44_2', labels([q(44, 2)]));
check('quantity 4 lists all four',
    labels([q(7, 4)]) === '7_1 7_2 7_3 7_4', labels([q(7, 4)]));
check('mixed set keeps balloon order',
    labels([q(1, undefined), q(2, 2), q(3, undefined)]) === '1 2_1 2_2 3',
    labels([q(1, undefined), q(2, 2), q(3, undefined)]));
// An instance and a sub-number must not look alike: 44-1 is an extra
// characteristic, 44_1 is the same one measured on another feature.
check('a child balloon expands under its own composite number',
    labels([{ balloonNumber: 5, subNumber: 1, quantity: 2 }]) === '5-1_1 5-1_2',
    labels([{ balloonNumber: 5, subNumber: 1, quantity: 2 }]));
check('the instance separator differs from the sub-number one',
    M.INSTANCE_SEPARATOR !== M.DEFAULT_SUB_SEPARATOR,
    `${M.INSTANCE_SEPARATOR} vs ${M.DEFAULT_SUB_SEPARATOR}`);

const ex = M.expandByQuantity([q(44, 2)]);
check('each line knows its position and total',
    ex[1].instance === 2 && ex[1].count === 2);
check('every line points back to the one balloon',
    ex[0].ann === ex[1].ann);
check('instanceCount reads the multiplier',
    M.instanceCount({ quantity: 3 }) === 3 && M.instanceCount({}) === 1);
check('a nonsense quantity counts as one',
    M.instanceCount({ quantity: 0 }) === 1
    && M.instanceCount({ quantity: -2 }) === 1
    && M.instanceCount({ quantity: NaN }) === 1);

console.log('\n3. grid cells parse in either order');
check('"D8" is letter-first',
    JSON.stringify(M.parseGridCell('D8')) ===
    JSON.stringify({ letter: 'D', number: 8, numberFirst: false }));
check('"8D" is number-first', M.parseGridCell('8D')?.numberFirst === true);
check('lowercase is normalised', M.parseGridCell('d8')?.letter === 'D');
check('UNMATCHED is not a cell', M.parseGridCell('UNMATCHED') === null);
check('blank is not a cell', M.parseGridCell('') === null);
check('formatGridCell inverts parseGridCell',
    M.formatGridCell(M.parseGridCell('8D')) === '8D');
check('letterOrdinal: A=1, Z=26, AA=27',
    M.letterOrdinal('A') === 1 && M.letterOrdinal('Z') === 26 &&
    M.letterOrdinal('AA') === 27);

console.log('\n4. grid system agrees with the Python GridSorter');
const g = M.parseGridSystem('F2', 'A1');
check('F2->A1 parses', !!g);
check('both axes descend, as the server reports',
    g.letterDirection === -1 && g.numberDirection === -1,
    JSON.stringify(g));
check('an unparseable pair yields null',
    M.parseGridSystem('', 'A1') === null);

const mk = (id, section, y, x, viewId = 0) => ({
    id, section, viewId, rect: { x, y, width: 1, height: 1 },
});
// The Python returned (0, 2, -6, 5, 5) for D8 under F2->A1.
const key = M.gridSortKey(mk('d8', 'D8', 5, 5), g);
check('D8 gives the same key the server computes',
    JSON.stringify(key) === JSON.stringify([0, 2, -6, 5, 5]),
    JSON.stringify(key));

console.log('\n5. unmatched balloons sort last but stay stable');
const set = [
    mk('u1', 'UNMATCHED', 1, 1),
    mk('p1', 'D8', 5, 5),
    mk('u2', '', 9, 9),
    mk('p2', 'B4', 2, 2),
];
const order = M.sortByGrid(set, g).map(a => a.id);
check('placed balloons come first',
    order.slice(0, 2).every(id => id.startsWith('p')), order.join(', '));
check('unmatched land at the end',
    order.slice(2).every(id => id.startsWith('u')), order.join(', '));
check('unmatched keep positional order among themselves',
    order.indexOf('u1') < order.indexOf('u2'), order.join(', '));
check('isUnmatched agrees',
    M.isUnmatched({ section: '' }) && M.isUnmatched({ section: 'UNMATCHED' }) &&
    !M.isUnmatched({ section: 'D8' }));

console.log('\n6. sorting is coherent when the grid is unknown');
const noGrid = M.sortByGrid(set, null).map(a => a.id);
check('no grid: everything falls back to position, nothing is dropped',
    noGrid.length === 4, noGrid.join(', '));

rmSync(dir, { recursive: true, force: true });

console.log(`\n${fails.length ? `${fails.length} FAILED: ${fails.join(', ')}` : 'ALL PASS'}`);
process.exit(fails.length ? 1 : 0);
