/**
 * Batch editing: does it write only what was touched, and refuse what it must?
 *
 * The dangerous failure here is silent — a batch that writes every field it
 * displays looks identical to one that writes only the edited fields, until
 * forty balloons quietly share the primary's symbol.
 *
 *   node .mssql-scripts/check_ballooning_batch.mjs
 */
import {
    emptyBatchEdit, commonValue, validateBatch, applyBatch, resolveSelection,
    BATCH_LOCKED_FIELDS,
} from '../DSRFQ.Web/Modules/Common/Widgets/BallooningWidget/BallooningBatch.ts';

let fails = 0;
const check = (name, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
    if (!ok) fails++;
};
const eq = (name, got, want) =>
    check(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}`);

const anns = [
    {id: 'a', balloonNumber: 1, content: '.380', upperTol: '', lowerTol: '', section: 'D8'},
    {id: 'b', balloonNumber: 2, content: '.500', upperTol: '+.005', lowerTol: '-.005', section: 'D8'},
    {id: 'c', balloonNumber: 3, content: '.750', upperTol: '', lowerTol: '', section: 'A1'},
];

console.log('1. what the selection agrees on');
check('a shared value is reported', commonValue([anns[0], anns[1]], 'section') === 'D8');
check('a differing value is undefined', commonValue(anns, 'section') === undefined);
// '' and undefined must read as agreement, or every unset field shows "(varies)".
check('unset counts as agreement',
      commonValue([anns[0], anns[2]], 'upperTol') === '');

console.log('\n2. only touched fields are written');
const edit = emptyBatchEdit();
edit.values.upperTol = '+.010';
edit.dirty.add('upperTol');
const out = applyBatch(anns, new Set(['a', 'c']), edit);
check('both selected balloons changed', out.changed === 2, out.changed);
check('the touched field was written',
      out.annotations.find(a => a.id === 'a').upperTol === '+.010');
// The critical one: 'c' keeps its own symbol, it does not inherit 'a''s.
check('an untouched field is NOT overwritten',
      out.annotations.find(a => a.id === 'c').content === '.750',
      out.annotations.find(a => a.id === 'c').content);
check('an unselected balloon is untouched',
      out.annotations.find(a => a.id === 'b').upperTol === '+.005');
check('lowerTol was not invented', out.annotations.find(a => a.id === 'a').lowerTol === '');

console.log('\n3. a hand-typed tolerance stops being a general tolerance');
const withStd = [{id: 'a', upperTol: '+.005', lowerTol: '-.005', toleranceStandard: '.XXX'}];
const e2 = emptyBatchEdit();
e2.values.upperTol = '+.002';
e2.dirty.add('upperTol');
check('the standard label is cleared',
      applyBatch(withStd, new Set(['a']), e2).annotations[0].toleranceStandard === undefined);

console.log('\n4. guards');
check('nothing touched is refused', validateBatch(emptyBatchEdit()).ok === false);
const blankRegion = emptyBatchEdit();
blankRegion.values.section = '   ';
blankRegion.dirty.add('section');
check('blanking region across a selection is refused', validateBatch(blankRegion).ok === false,
      validateBatch(blankRegion).message);
const badQty = emptyBatchEdit();
badQty.values.quantity = '0';
badQty.dirty.add('quantity');
check('quantity 0 is refused', validateBatch(badQty).ok === false);
const goodQty = emptyBatchEdit();
goodQty.values.quantity = '4';
goodQty.dirty.add('quantity');
check('quantity 4 is accepted', validateBatch(goodQty).ok === true);
// Numbering is per-balloon by definition and must not even be offered.
check('number and sub-number are locked',
      BATCH_LOCKED_FIELDS.includes('balloonNumber')
      && BATCH_LOCKED_FIELDS.includes('subNumber'));

console.log('\n5. click-to-selection');
const order = ['a', 'b', 'c', 'd', 'e'];
eq('plain click replaces',
   [...resolveSelection(new Set(['a', 'b']), 'a', 'd', order, {}).selected], ['d']);
eq('ctrl adds',
   [...resolveSelection(new Set(['a']), 'a', 'c', order, {ctrl: true}).selected].sort(), ['a', 'c']);
eq('ctrl on a selected one removes it',
   [...resolveSelection(new Set(['a', 'c']), 'a', 'c', order, {ctrl: true}).selected], ['a']);
eq('shift ranges from the anchor',
   [...resolveSelection(new Set(['b']), 'b', 'd', order, {shift: true}).selected], ['b', 'c', 'd']);
// Backwards must work identically, or shift feels broken going up the list.
eq('shift ranges backwards too',
   [...resolveSelection(new Set(['d']), 'd', 'b', order, {shift: true}).selected], ['b', 'c', 'd']);
// Shift replaces rather than unions, so a range can be shrunk.
eq('shift replaces, it does not accumulate',
   [...resolveSelection(new Set(['a', 'b', 'c', 'd']), 'b', 'c', order, {shift: true}).selected],
   ['b', 'c']);
check('ctrl moves the anchor to the last click',
      resolveSelection(new Set(['a']), 'a', 'c', order, {ctrl: true}).anchor === 'c');

console.log(`\n${fails ? fails + ' FAILED' : 'ALL PASS'}`);
process.exit(fails ? 1 : 0);
