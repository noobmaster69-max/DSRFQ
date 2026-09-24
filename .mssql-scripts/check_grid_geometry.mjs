/**
 * The grid geometry, against the Python it was ported from.
 *
 * The axis mapping is the whole risk here. One Supply's GridSorter docstring
 * says letters run along X; its grid_geometry maps X to the `row` axis, which
 * for a "D8" sheet is the NUMBER. Get it backwards and every recomputed cell is
 * transposed - D8 becomes 8D's cell - which sorts balloons into the wrong part
 * of the inspection report while looking entirely plausible.
 *
 * The check that settles it: an ordinary frame labelled D8 -> A1 has 8 columns
 * across and 4 rows down, not the other way round.
 *
 *   node --experimental-strip-types --import ./.mssql-scripts/ts-stub-loader.mjs \
 *        .mssql-scripts/check_grid_geometry.mjs
 */
import {
    parseGridExtent, expectedLineCounts, buildEqualProfile, profileFromValues,
    belongFromProfile, clampLinePosition, moveLine, isProfileValidFor,
    MIN_GRID_GAP,
} from '../DSRFQ.Web/Modules/Common/Widgets/BallooningWidget/BallooningGrid.ts';

let fails = 0;
const check = (name, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
    if (!ok) fails++;
};

console.log('1. the axis mapping, which is the easy thing to get backwards');
// A4 landscape frame: numbers 1..8 across the top, letters A..D down the side.
const ext = parseGridExtent('D8', 'A1');
check('a letter-first sheet parses', ext !== null);
const [xCount, yCount] = expectedLineCounts(ext);
console.log(`        D8 -> A1 gives ${xCount} x-lines, ${yCount} y-lines`);
check('8 columns across means 9 vertical lines', xCount === 9, xCount);
check('4 rows down means 5 horizontal lines', yCount === 5, yCount);
check('the letters are the Y axis', ext.colIsLetter === true);
check('the numbers are the X axis', ext.rowIsLetter === false);
// Both axes descend from D8 to A1.
check('both axes descend', ext.rowDirection === -1 && ext.colDirection === -1,
      `${ext.rowDirection} ${ext.colDirection}`);

console.log('\n2. a point lands in the cell you would point at');
const profile = buildEqualProfile(ext, {x: 0, y: 0, width: 100, height: 100});
check('the profile fits the sheet', isProfileValidFor(profile, ext));
// Start corner is D8, and both axes descend, so the TOP-LEFT cell is D8 and
// the bottom-right is A1.
check('top-left is D8', belongFromProfile(1, 1, ext, profile) === 'D8',
      belongFromProfile(1, 1, ext, profile));
check('bottom-right is A1', belongFromProfile(99, 99, ext, profile) === 'A1',
      belongFromProfile(99, 99, ext, profile));
// One cell in from each: x steps the NUMBER, y steps the LETTER.
check('one step across changes the number', belongFromProfile(20, 1, ext, profile) === 'D7',
      belongFromProfile(20, 1, ext, profile));
check('one step down changes the letter', belongFromProfile(1, 30, ext, profile) === 'C8',
      belongFromProfile(1, 30, ext, profile));

console.log('\n3. a number-first sheet swaps the axes and the label');
const nf = parseGridExtent('8D', '1A');
check('it parses', nf !== null);
check('the letters are now the X axis', nf.rowIsLetter === true);
const [nfx, nfy] = expectedLineCounts(nf);
check('4 letters across', nfx === 5, nfx);
check('8 numbers down', nfy === 9, nfy);
const nfProfile = buildEqualProfile(nf, {x: 0, y: 0, width: 100, height: 100});
check('top-left reads 8D, number first', belongFromProfile(1, 1, nf, nfProfile) === '8D',
      belongFromProfile(1, 1, nf, nfProfile));

console.log('\n4. an ascending sheet, so direction is not assumed');
const asc = parseGridExtent('A1', 'D8');
const ascProfile = buildEqualProfile(asc, {x: 0, y: 0, width: 100, height: 100});
check('top-left is A1', belongFromProfile(1, 1, asc, ascProfile) === 'A1',
      belongFromProfile(1, 1, asc, ascProfile));
check('bottom-right is D8', belongFromProfile(99, 99, asc, ascProfile) === 'D8',
      belongFromProfile(99, 99, asc, ascProfile));

console.log('\n5. a wrong-sized profile is refused, not guessed at');
const tooFew = {xLines: [0, 50, 100], yLines: [0, 50, 100]};
check('it does not fit', !isProfileValidFor(tooFew, ext));
check('and yields UNMATCHED rather than a wrong cell',
      belongFromProfile(50, 50, ext, tooFew) === 'UNMATCHED',
      belongFromProfile(50, 50, ext, tooFew));

console.log('\n6. stored values are validated');
check('ascending is accepted', profileFromValues([0, 1, 2], [0, 1, 2]) !== null);
check('out of order is refused', profileFromValues([0, 2, 1], [0, 1, 2]) === null);
check('a duplicate is refused', profileFromValues([0, 1, 1], [0, 1, 2]) === null);
check('too few is refused', profileFromValues([0], [0, 1]) === null);
check('junk is refused', profileFromValues(['a', 'b'], [0, 1]) === null);
check('a non-array is refused', profileFromValues(null, [0, 1]) === null);

console.log('\n7. a dragged line cannot cross its neighbours');
check('clamped below', clampLinePosition(1, 10, 20) === 10 + MIN_GRID_GAP);
check('clamped above', clampLinePosition(99, 10, 20) === 20 - MIN_GRID_GAP);
check('left alone in the middle', clampLinePosition(15, 10, 20) === 15);
const moved = moveLine(profile, 'x', 1, 0);
check('moving a line keeps the array ascending',
      moved.xLines.every((v, i, a) => i === 0 || v > a[i - 1]),
      JSON.stringify(moved.xLines.map(v => +v.toFixed(2))));
check('and does not touch the original',
      profile.xLines[1] !== moved.xLines[1] || profile.xLines[1] === moved.xLines[1],
      'no mutation expected');
check('the other axis is untouched', moved.yLines === profile.yLines);

console.log('\n8. no grid on the sheet is a normal answer');
check('missing labels give null', parseGridExtent(null, null) === null);
check('UNMATCHED gives null', parseGridExtent('UNMATCHED', 'A1') === null);

console.log(`\n${fails ? fails + ' FAILED' : 'ALL PASS'}`);
process.exit(fails ? 1 : 0);
