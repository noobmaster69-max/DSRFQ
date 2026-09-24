/**
 * Batch editing of the One Supply fields added in the second batch:
 * dimension feature, number category, export mode, arrow, characteristic.
 *
 *   cd .mssql-scripts
 *   node --experimental-strip-types --no-warnings --import ./ts-stub-loader.mjs check_ballooning_batch_fields.mjs
 */
import {
    emptyBatchEdit, applyBatch, BATCH_FIELD_LABELS, BATCH_LOCKED_FIELDS, validateBatch,
} from '../DSRFQ.Web/Modules/Common/Widgets/BallooningWidget/BallooningBatch.ts';

let fails = 0;
const check = (name, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== '' ? '  ' + detail : ''}`);
    if (!ok) fails++;
};
const eq = (name, got, want) =>
    check(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}`);

const base = () => [
    { id: 'a', balloonNumber: 1, content: '.380', upperTol: '+.005', lowerTol: '-.005', toleranceStandard: '[Decimal] X', numberCategory: 'bom' },
    { id: 'b', balloonNumber: 2, content: '(1.0)', upperTol: '', lowerTol: '', exportMode: 'screenshot' },
    { id: 'c', balloonNumber: 3, content: '2.0', upperTol: '+.01', lowerTol: '-.01' },
];
const edit = (fields) => {
    const e = emptyBatchEdit();
    for (const [k, v] of Object.entries(fields)) { e.dirty.add(k); e.values[k] = v; }
    return e;
};

console.log('1. every new field has a label');
for (const f of ['dimensionFeature', 'numberCategory', 'exportMode', 'showArrow', 'typeId'])
    check(`${f} is labelled`, !!BATCH_FIELD_LABELS[f], BATCH_FIELD_LABELS[f]);
check('number and sub-number stay locked', BATCH_LOCKED_FIELDS.includes('balloonNumber') && BATCH_LOCKED_FIELDS.includes('subNumber'));

console.log('\n2. dimension feature');
let out = applyBatch(base(), new Set(['a', 'c']), edit({ dimensionFeature: 'reference' }));
const a = out.annotations.find(x => x.id === 'a');
eq('reference clears tolerances and their label', [a.dimensionFeature, a.upperTol, a.lowerTol, a.toleranceStandard], ['reference', '', '', undefined]);
check('unselected balloons are untouched', out.annotations.find(x => x.id === 'b').dimensionFeature === undefined);
out = applyBatch(base(), new Set(['a']), edit({ dimensionFeature: 'theoretical', upperTol: '+.001' }));
eq('a tolerance typed in the same edit is kept', out.annotations[0].upperTol, '+.001');
out = applyBatch(base(), new Set(['a']), edit({ dimensionFeature: '' }));
check('None clears the feature and keeps tolerances', out.annotations[0].dimensionFeature === undefined && out.annotations[0].upperTol === '+.005');

console.log('\n3. category, export mode, arrow, characteristic');
out = applyBatch(base(), new Set(['a', 'b']), edit({ numberCategory: 'notes', exportMode: 'text', showArrow: true, typeId: '12' }));
eq('written to the selection', out.annotations.slice(0, 2).map(x => [x.numberCategory, x.exportMode, x.showArrow, x.typeId]),
   [['notes', 'text', true, 12], ['notes', 'text', true, 12]]);
eq('only the touched fields are reported', out.fields.sort(), ['exportMode', 'numberCategory', 'showArrow', 'typeId']);
out = applyBatch(base(), new Set(['a']), edit({ numberCategory: '' }));
check('an empty category clears it', out.annotations[0].numberCategory === undefined);
out = applyBatch(base(), new Set(['b']), edit({ showArrow: false }));
check('arrow can be switched off explicitly', out.annotations[1].showArrow === false);

console.log('\n4. nothing touched');
check('Apply with nothing changed is refused', !validateBatch(emptyBatchEdit()).ok);

console.log(`\n${fails ? fails + ' FAILED' : 'ALL PASS'}`);
process.exit(fails ? 1 : 0);
