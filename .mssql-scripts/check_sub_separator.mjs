/**
 * The sub-number separator: does changing it stay reversible?
 *
 * The risk is not cosmetic. The composite is stored in BalloonNo as text, so a
 * separator the parser does not know round-trips to balloon 0 - the number is
 * silently lost, and the balloon sorts to the front of the sheet.
 *
 *   node .mssql-scripts/check_sub_separator.mjs
 */
import {
    SUB_SEPARATORS, DEFAULT_SUB_SEPARATOR, INSTANCE_SEPARATOR,
    MAX_SUB_SEPARATOR_LENGTH, isValidSubSeparator,
    formatBalloonNumber, parseBalloonNumber, expandByQuantity,
} from '../DSRFQ.Web/Modules/Common/Widgets/BallooningWidget/BallooningNumbering.ts';

let fails = 0;
const check = (name, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
    if (!ok) fails++;
};

console.log('1. what is suggested');
console.log(`        suggestions: ${JSON.stringify(SUB_SEPARATORS)}  default ${DEFAULT_SUB_SEPARATOR}`);
check('the default is a dash', DEFAULT_SUB_SEPARATOR === '-');
// The collision that makes "_" unusable: it already means "instance".
check('the instance separator is NOT suggested',
      !SUB_SEPARATORS.includes(INSTANCE_SEPARATOR), INSTANCE_SEPARATOR);
check('and it is refused outright', !isValidSubSeparator(INSTANCE_SEPARATOR));

console.log('\n2. it is free text, not a fixed list');
// The three that genuinely break, because the composite lives in BalloonNo as
// text: a digit merges with the numbers, whitespace is skipped when parsing,
// and "_" already means an instance.
for (const bad of ['1', '5', ' ', '_', 'a_b', '-1', '', '----'])
    check(`${JSON.stringify(bad)} is refused`, !isValidSubSeparator(bad));
// Anything else a shop might write.
for (const good of ['-', '.', '/', '~', ':', '|', '::', '--', '·', '→'])
    check(`${JSON.stringify(good)} is allowed`, isValidSubSeparator(good));
check(`nothing longer than ${MAX_SUB_SEPARATOR_LENGTH} characters`,
      !isValidSubSeparator('~'.repeat(MAX_SUB_SEPARATOR_LENGTH + 1)));

console.log('\n3. every allowed separator round-trips');
for (const sep of [...SUB_SEPARATORS, '~', ':', '::', '→']) {
    const text = formatBalloonNumber({balloonNumber: 5, subNumber: 1}, sep);
    const back = parseBalloonNumber(text);
    check(`${sep}  formats as ${text} and parses back`,
          back.balloonNumber === 5 && back.subNumber === 1, JSON.stringify(back));
}

console.log('\n4. switching separator does not orphan existing numbers');
// The scenario that made this free text risky at all: a drawing saved under
// one mark, opened after the setting changed to another. A parser matching a
// fixed list would turn every one of these into balloon 0 - the number lost,
// the balloon sorted to the front of the sheet.
for (const stored of ['5-1', '5.1', '5/1', '5~1', '5:1', '5::1', '5 - 1']) {
    const back = parseBalloonNumber(stored);
    check(`"${stored}" still parses whatever the current setting is`,
          back.balloonNumber === 5 && back.subNumber === 1, JSON.stringify(back));
}
// But an instance is still an instance, not a child.
check('"44_1" is NOT read as a child of 44',
      parseBalloonNumber('44_1').subNumber === undefined,
      JSON.stringify(parseBalloonNumber('44_1')));

console.log('\n5. a plain number is untouched');
check('"7" parses to 7 with no child', (() => {
    const b = parseBalloonNumber('7');
    return b.balloonNumber === 7 && b.subNumber === undefined;
})());
check('unparseable yields 0, visibly wrong rather than dropped',
      parseBalloonNumber('abc').balloonNumber === 0);

console.log('\n6. instances stay distinguishable from children');
// 44 covering 4 features lists as 44_1..44_4. With a sub-number the base is
// "44-1", so an instance of it is "44-1_2" - still unambiguous.
const rows = [
    {balloonNumber: 44, quantity: 4},
    {balloonNumber: 5, subNumber: 1, quantity: 2},
];
for (const sep of [...SUB_SEPARATORS, '~']) {
    const labels = expandByQuantity(rows, sep).map(x => x.label);
    const ok = labels.includes(`44${INSTANCE_SEPARATOR}1`)
        && labels.includes(`5${sep}1${INSTANCE_SEPARATOR}1`);
    check(`with "${sep}" an instance is still tellable from a child`, ok,
          JSON.stringify(labels.slice(0, 6)));
}

console.log(`\n${fails ? fails + ' FAILED' : 'ALL PASS'}`);
process.exit(fails ? 1 : 0);
