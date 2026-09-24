/**
 * Undo history, delete-and-close-the-gap, cross-page renumbering, list order
 * and crop geometry - the rules behind the widget's editing, tested bare.
 *
 *   cd .mssql-scripts
 *   node --experimental-strip-types --no-warnings --import ./ts-stub-loader.mjs check_ballooning_editing.mjs
 */
import {
    UndoHistory, deleteBalloons, renumberAcrossPages, listOrder, cropGeometry,
} from '../DSRFQ.Web/Modules/Common/Widgets/BallooningWidget/BallooningEditing.ts';

let fails = 0;
const check = (name, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== '' ? '  ' + detail : ''}`);
    if (!ok) fails++;
};
const eq = (name, got, want) =>
    check(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}`);

const b = (id, n, page = 0, sub, extra = {}) => ({
    id, balloonNumber: n, subNumber: sub, pageIndex: page,
    rect: { x: 10, y: 10, width: 5, height: 2 }, ...extra,
});
const nums = list => list.map(a => a.subNumber ? `${a.balloonNumber}-${a.subNumber}` : `${a.balloonNumber}`);
const byId = (list, id) => list.find(a => a.id === id);

console.log('1. undo history');
const h = new UndoHistory(3);
h.reset('A');
check('nothing to undo after a load', !h.canUndo && !h.canRedo);
check('recording the same state is not a step', h.record('A') === false && !h.canUndo);
h.record('B'); h.record('C');
eq('undo walks back', [h.undo(), h.undo()], ['B', 'A']);
check('and stops at the load', h.undo() === null);
eq('redo walks forward', [h.redo(), h.redo()], ['B', 'C']);
h.undo();
h.record('D');
check('a new edit after undo drops the redo branch', !h.canRedo);
h.record('E'); h.record('F'); h.record('G');
check('the stack is capped', h.undoDepth === 3, h.undoDepth);

console.log('\n2. delete closes the gap');
const six = [1, 2, 3, 4, 5, 6].map(n => b(`b${n}`, n));
let out = deleteBalloons(six, new Set(['b3']));
eq('deleting 3 of 1..6 gives 1..5', nums(out.kept), ['1', '2', '3', '4', '5']);
check('three balloons were renumbered', out.renumbered === 3, out.renumbered);
check('the input array is untouched', six[3].balloonNumber === 4);
out = deleteBalloons(six, new Set(['b2', 'b5']));
eq('deleting 2 and 5 gives 1..4', nums(out.kept), ['1', '2', '3', '4']);
eq('the removed come back for the tombstones', out.removed.map(a => a.id), ['b2', 'b5']);

console.log('\n3. parents and children');
const fam = [b('p4', 4), b('p5', 5), b('c51', 5, 0, 1), b('c52', 5, 0, 2), b('p6', 6)];
out = deleteBalloons(fam, new Set(['p5']));
eq('a deleted parent hands its number to its first child', nums(out.kept), ['4', '5', '5-1', '6']);
check('no gap opened, nothing after moved', byId(out.kept, 'p6').balloonNumber === 6);
out = deleteBalloons(fam, new Set(['c51']));
eq('a deleted child closes its siblings up', nums(out.kept), ['4', '5', '5-1', '6']);
check('the survivor is the old 5-2', byId(out.kept, 'c52').subNumber === 1);

console.log('\n4. per-page vs continuous numbering');
const perPage = [b('a1', 1, 0), b('a2', 1, 1), b('a3', 2, 0), b('a4', 2, 1), b('a5', 3, 1)];
out = deleteBalloons(perPage, new Set(['a1']));
eq('pages that each start at 1: only page 1 closes up', out.kept.map(a => `${a.pageIndex}:${a.balloonNumber}`),
   ['1:1', '0:1', '1:2', '1:3']);
const continuous = [b('c1', 1, 0), b('c2', 2, 0), b('c3', 3, 1), b('c4', 4, 1)];
out = deleteBalloons(continuous, new Set(['c1']));
eq('continuous numbering closes up across pages', out.kept.map(a => `${a.pageIndex}:${a.balloonNumber}`),
   ['0:1', '1:2', '1:3']);

console.log('\n5. renumber across pages');
// orderPage stands in for the areas/reading order: here, by rect.y.
const drawing = [
    b('p0a', 7, 0, undefined, { rect: { x: 0, y: 50, width: 1, height: 1 } }),
    b('p0b', 3, 0, undefined, { rect: { x: 0, y: 10, width: 1, height: 1 } }),
    b('p0b1', 3, 0, 1, { rect: { x: 0, y: 11, width: 1, height: 1 } }),
    b('p1a', 1, 1, undefined, { rect: { x: 0, y: 20, width: 1, height: 1 } }),
    b('p1b', 2, 1, undefined, { rect: { x: 0, y: 5, width: 1, height: 1 } }),
];
const r = renumberAcrossPages(drawing, (_p, onPage) => [...onPage].sort((a, c) => a.rect.y - c.rect.y));
eq('page 2 carries on from page 1', ['p0b', 'p0b1', 'p0a', 'p1b', 'p1a'].map(id => nums([byId(drawing, id)])[0]),
   ['1', '1-1', '2', '3', '4']);
eq('outcome', r, { parents: 4, children: 1, pages: 2, last: 4 });

console.log('\n6. list order');
const mixed = [b('x', 2, 1), b('y', 1, 0), b('z', 1, 1), b('w', 1, 0, 1)];
eq('all pages: page then number, child after parent', listOrder(mixed, true, 0).map(a => a.id), ['y', 'w', 'z', 'x']);
eq('one page: just that page', listOrder(mixed, false, 1).map(a => a.id), ['z', 'x']);

console.log('\n7. crop geometry');
const g = cropGeometry({ x: 10, y: 20, width: 10, height: 2 }, 1.5, 100, 50, 0);
check('keeps the box aspect (10% x 1.5 wide : 2% tall = 7.5)', Math.abs(g.width / g.height - 7.5) < 0.2, `${g.width}x${g.height}`);
eq('background scaled so the box fills the crop', g.size, '1000% 5000%');
eq('and positioned on the box', g.position, '11.111% 20.408%');
const tall = cropGeometry({ x: 0, y: 0, width: 1, height: 30 }, 1.414);
check('a tall box is fitted by height', tall.height === 52 && tall.width < 20, `${tall.width}x${tall.height}`);

console.log(`\n${fails ? fails + ' FAILED' : 'ALL PASS'}`);
process.exit(fails ? 1 : 0);
