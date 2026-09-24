/**
 * Changing a balloon's number moves it in the sequence, and the balloons it
 * passes slide along one - like dragging a row in a list.
 *
 * Before this, typing a number into the property panel just stamped it on the
 * balloon: two balloon 3s, and a hole where the old number had been.
 *
 *   cd .mssql-scripts
 *   node --experimental-strip-types --no-warnings --import ./ts-stub-loader.mjs check_ballooning_move_number.mjs
 */
import { moveBalloonNumber, deleteBalloons } from
    '../DSRFQ.Web/Modules/Common/Widgets/BallooningWidget/BallooningEditing.ts';

let fails = 0;
const check = (name, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== '' ? '  ' + detail : ''}`);
    if (!ok) fails++;
};
const eq = (name, got, want) =>
    check(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}`);

const b = (id, n, page = 0, sub) => ({
    id, balloonNumber: n, subNumber: sub, pageIndex: page,
    rect: { x: 10, y: 10, width: 5, height: 2 },
});
const label = a => a.subNumber ? `${a.balloonNumber}-${a.subNumber}` : `${a.balloonNumber}`;
/** The ids in number order - what the list shows, top to bottom. */
const order = list => [...list]
    .sort((a, c) => (a.balloonNumber - c.balloonNumber) || ((a.subNumber ?? 0) - (c.subNumber ?? 0)))
    .map(a => `${a.id}=${label(a)}`);
const seven = () => ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id, i) => b(id, i + 1));
const unique = list => {
    const tops = list.filter(a => !a.subNumber).map(a => `${a.pageIndex}:${a.balloonNumber}`);
    return new Set(tops).size === tops.length;
};

console.log('1. moving up the list');
let L = seven();
let r = moveBalloonNumber(L, 'f', 3);
eq('6 -> 3: it takes 3, and 3,4,5 step down to 4,5,6', order(L),
   ['a=1', 'b=2', 'f=3', 'c=4', 'd=5', 'e=6', 'g=7']);
eq('the outcome says so', [r.moved, r.from, r.to, r.shifted, r.clamped], [true, 6, 3, 3, false]);
check('no number is used twice', unique(L));
check('nothing past the old place moved', L.find(a => a.id === 'g').balloonNumber === 7);

console.log('\n2. moving down the list');
L = seven();
r = moveBalloonNumber(L, 'b', 5);
eq('2 -> 5: it takes 5, and 3,4,5 step up to 2,3,4', order(L),
   ['a=1', 'c=2', 'd=3', 'e=4', 'b=5', 'f=6', 'g=7']);
eq('three others moved', r.shifted, 3);
check('still no duplicates, still no gap', unique(L)
      && L.map(a => a.balloonNumber).sort((x, y) => x - y).join() === '1,2,3,4,5,6,7');

console.log('\n3. the ends');
L = seven();
r = moveBalloonNumber(L, 'c', 99);
eq('past the end goes to the end', order(L).slice(-1), ['c=7']);
check('and says it was pulled in', r.clamped && r.to === 7);
L = seven();
r = moveBalloonNumber(L, 'e', 0);
eq('below 1 goes to 1', order(L)[0], 'e=1');
check('and says so', r.clamped && r.to === 1);
L = seven();
r = moveBalloonNumber(L, 'c', 3);
check('the same number is not a move', !r.moved && r.shifted === 0);
L = seven();
r = moveBalloonNumber(L, 'g', 50);
check('already last and asked for later: nothing moves', !r.moved && /last/.test(r.reason ?? ''), r.reason);

console.log('\n4. children travel with their parent');
L = [b('p1', 1), b('p2', 2), b('p2a', 2, 0, 1), b('p2b', 2, 0, 2), b('p3', 3), b('p4', 4), b('p4a', 4, 0, 1)];
r = moveBalloonNumber(L, 'p4', 2);
eq('4 (with 4-1) -> 2: the family moves as one', order(L),
   ['p1=1', 'p4=2', 'p4a=2-1', 'p2=3', 'p2a=3-1', 'p2b=3-2', 'p3=4']);
eq('only parents are counted as moved', r.shifted, 2);
L = [b('p1', 1), b('p2', 2), b('p2a', 2, 0, 1), b('p3', 3)];
r = moveBalloonNumber(L, 'p2a', 1);
check('a child is refused', !r.moved, r.reason);
check('with a reason that says what to do instead', /parent/.test(r.reason ?? ''), r.reason);
eq('and nothing changed', order(L), ['p1=1', 'p2=2', 'p2a=2-1', 'p3=3']);

console.log('\n5. pages');
// Continuous: page 2 carries on from page 1.
L = [b('a', 1, 0), b('b', 2, 0), b('c', 3, 0), b('d', 4, 1), b('e', 5, 1), b('f', 6, 1)];
r = moveBalloonNumber(L, 'e', 2);
eq('continuous numbering: a page-2 balloon can move before page-1 ones', order(L),
   ['a=1', 'e=2', 'b=3', 'c=4', 'd=5', 'f=6']);
check('still one sequence with no repeats', unique(L));
// Per page: every page starts at 1.
L = [b('a', 1, 0), b('b', 2, 0), b('c', 3, 0), b('x', 1, 1), b('y', 2, 1), b('z', 3, 1)];
r = moveBalloonNumber(L, 'c', 1);
eq('numbered per page: page 1 reorders', order(L.filter(a => a.pageIndex === 0)), ['c=1', 'a=2', 'b=3']);
eq('and page 2 is not touched', order(L.filter(a => a.pageIndex === 1)), ['x=1', 'y=2', 'z=3']);
r = moveBalloonNumber(L, 'z', 99);
check('per page, "the end" is the end of that page', !r.moved || r.to === 3, r.to);

console.log('\n6. a drawing that already has a duplicate');
// From a hand edit before this function existed: two balloon 3s.
L = [b('a', 1), b('b', 2), b('c', 3), b('c2', 3), b('d', 4)];
r = moveBalloonNumber(L, 'c', 1);
check('only the chosen balloon moves, not everything numbered 3',
      L.find(a => a.id === 'c').balloonNumber === 1 && L.find(a => a.id === 'c2').balloonNumber === 3);

console.log('\n7. it composes with delete');
L = seven();
moveBalloonNumber(L, 'f', 2);
const after = deleteBalloons(L, new Set(['a']));
eq('move then delete still leaves 1..6 with no gap',
   after.kept.map(a => a.balloonNumber).sort((x, y) => x - y), [1, 2, 3, 4, 5, 6]);
eq('in the moved order', order(after.kept), ['f=1', 'b=2', 'c=3', 'd=4', 'e=5', 'g=6']);

console.log('\n8. unknown input');
L = seven();
check('an unknown id changes nothing', !moveBalloonNumber(L, 'nope', 2).moved
      && order(L).join() === order(seven()).join());
check('NaN changes nothing', !moveBalloonNumber(L, 'c', NaN).moved);
check('a fraction rounds', moveBalloonNumber(L, 'c', 1.4).to === 1);

console.log(`\n${fails ? fails + ' FAILED' : 'ALL PASS'}`);
process.exit(fails ? 1 : 0);
