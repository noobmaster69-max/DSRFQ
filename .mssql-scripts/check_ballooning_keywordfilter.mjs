/**
 * Exercises the always-filter keyword logic.
 *
 *     node .mssql-scripts/check_ballooning_keywordfilter.mjs
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


const fails = [];
const check = (name, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
    if (!ok) fails.push(name);
};

// localStorage is not in plain node; the module only touches it inside
// try/catch, but a stub lets the persistence path be tested properly.
const store = new Map();
globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
};

const tmp = mkdtempSync(join(tmpdir(), 'kw-'));
const out = join(tmp, 'mod.mjs');
await build({
    entryPoints: ['DSRFQ.Web/Modules/Common/Widgets/BallooningWidget/BallooningKeywordFilter.ts'],
    outfile: out, bundle: true,
    plugins: [stubStore], format: 'esm', platform: 'neutral', logLevel: 'warning',
});
const K = await import(pathToFileURL(out).href);

console.log('1. normalising');
check('trims', K.normalizeKeyword('  TYP  ') === 'TYP');
check('collapses inner whitespace',
    K.normalizeKeyword('BREAK   OUT') === 'BREAK OUT', K.normalizeKeyword('BREAK   OUT'));
check('newlines and tabs count as whitespace',
    K.normalizeKeyword('FOR\tREFERENCE\nONLY') === 'FOR REFERENCE ONLY');
// NFKC is why an OCR'd CJK title block can match an ASCII keyword.
check('NFKC folds full-width to ASCII',
    K.normalizeKeyword('ＴＹＰ') === 'TYP', K.normalizeKeyword('ＴＹＰ'));
check('null is empty', K.normalizeKeyword(null) === '');

console.log('\n2. list hygiene');
const list = K.normalizeKeywordList(['TYP', ' typ ', '', 'SYM', 'Typ']);
check('case-insensitive duplicates dropped',
    JSON.stringify(list) === '["TYP","SYM"]', JSON.stringify(list));
check('the first spelling is what survives',
    K.normalizeKeywordList(['Break Out', 'BREAK OUT'])[0] === 'Break Out');
check('blanks dropped', K.normalizeKeywordList(['', '  ', null]).length === 0);
const sorted = K.sortKeywordList(['zeta', 'Alpha', 'beta']);
check('sorted ignoring case',
    JSON.stringify(sorted) === '["Alpha","beta","zeta"]', JSON.stringify(sorted));

console.log('\n3. matching is a case-insensitive substring, and names the phrase');
const kws = ['TYP', 'FOR REFERENCE ONLY', 'SECTION'];
check('exact', K.findMatchingKeyword('TYP', kws) === 'TYP');
check('substring inside a longer string',
    K.findMatchingKeyword('4X Ø.250 TYP', kws) === 'TYP');
check('case-insensitive', K.findMatchingKeyword('section a-a', kws) === 'SECTION');
check('extra spaces in the text still match',
    K.findMatchingKeyword('FOR   REFERENCE   ONLY', kws) === 'FOR REFERENCE ONLY');
check('a real dimension is untouched', K.findMatchingKeyword('Ø10.5', kws) === null);
check('empty text matches nothing', K.findMatchingKeyword('', kws) === null);
check('an empty list matches nothing', K.findMatchingKeyword('TYP', []) === null);

console.log('\n3b. OCR drops spaces, so matching ignores them');
// These are the exact strings on part 12 page 1. An operator typing the phrase
// as it is PRINTED on the drawing must catch what the engine actually emitted.
check('"SEE VIEW" catches "SEEVIEWD"',
    K.findMatchingKeyword('SEEVIEWD', ['SEE VIEW']) === 'SEE VIEW');
check('"TOP VIEW" catches "TOPVIEW"',
    K.findMatchingKeyword('TOPVIEW', ['TOP VIEW']) === 'TOP VIEW');
check('"BREAK OUT" catches "BREAKOUT"',
    K.findMatchingKeyword('BREAKOUT SECTION', ['BREAK OUT']) === 'BREAK OUT');
check('it still matches when the text HAS the space',
    K.findMatchingKeyword('SEE VIEW D', ['SEE VIEW']) === 'SEE VIEW');
check('a keyword with no space still works',
    K.findMatchingKeyword('4X Ø.250 TYP', ['TYP']) === 'TYP');
// The one it cannot help with: OCR read W as V. No literal filter fixes that;
// a shorter fragment does.
check('a garbled character still defeats the full phrase',
    K.findMatchingKeyword('SEEVIEVD', ['SEE VIEW']) === null,
    'SEEVIEVD has V where W should be');
check('...but a shorter fragment catches both spellings',
    K.findMatchingKeyword('SEEVIEVD', ['SEEVIE']) === 'SEEVIE'
    && K.findMatchingKeyword('SEEVIEWD', ['SEEVIE']) === 'SEEVIE');
check('a real dimension is still untouched',
    K.findMatchingKeyword('Ø10.5', ['SEE VIEW', 'TOP VIEW']) === null);

console.log('\n4. applying to balloons');
const balloons = [
    { id: 'a', content: '4X Ø.250 TYP' },
    { id: 'b', content: 'Ø10.5' },
    { id: 'c', content: 'SECTION A-A' },
    { id: 'd', content: '1. IDENTIFY WITH SUPPLIER NAME OR CODE.', isNote: true },
];
const hits = K.findFiltered(balloons, ['TYP', 'SECTION', 'IDENTIFY']);
check('two balloons caught', hits.length === 2, hits.map(h => h.item.id).join(','));
check('the dimension is untouched', !hits.some(h => h.item.id === 'b'));
// A note is prose and will contain almost any word; filtering notes is not
// what this setting is for.
check('the note is exempt even though it matches IDENTIFY',
    !hits.some(h => h.item.id === 'd'));
check('each hit names the phrase that caught it',
    hits.find(h => h.item.id === 'a').keyword === 'TYP',
    JSON.stringify(hits.map(h => [h.item.id, h.keyword])));

console.log('\n5. persistence');
store.clear();
check('never saved yields the shipped defaults',
    K.loadAlwaysFilterKeywords().length === K.DEFAULT_ALWAYS_FILTER_KEYWORDS.length,
    `${K.loadAlwaysFilterKeywords().length}`);
K.saveAlwaysFilterKeywords(['ZULU', 'alpha', 'alpha']);
const back = K.loadAlwaysFilterKeywords();
check('round-trips, normalised and sorted',
    JSON.stringify(back) === '["alpha","ZULU"]', JSON.stringify(back));
// Deliberately empty is a real state and must not be mistaken for "unset".
K.saveAlwaysFilterKeywords([]);
check('an emptied list stays empty rather than reverting to defaults',
    K.loadAlwaysFilterKeywords().length === 0,
    `${K.loadAlwaysFilterKeywords().length}`);
// Settings now live in MasterSettings via the settings store (stubbed here),
// not in localStorage - so the corrupt value is planted there.
globalThis.__ballooningSettings.set('keywords', '{not json');
check('corrupt storage falls back to the defaults, not a crash',
    K.loadAlwaysFilterKeywords().length === K.DEFAULT_ALWAYS_FILTER_KEYWORDS.length);

console.log('\n6. the shipped defaults');
check('non-empty', K.DEFAULT_ALWAYS_FILTER_KEYWORDS.length > 0,
    `${K.DEFAULT_ALWAYS_FILTER_KEYWORDS.length} phrases`);
check('no duplicates in the shipped list',
    K.normalizeKeywordList(K.DEFAULT_ALWAYS_FILTER_KEYWORDS).length
        === K.DEFAULT_ALWAYS_FILTER_KEYWORDS.length);
check('catches a view label', !!K.findMatchingKeyword('DETAIL B', K.DEFAULT_ALWAYS_FILTER_KEYWORDS));
check('leaves a plain dimension alone',
    K.findMatchingKeyword('12.700', K.DEFAULT_ALWAYS_FILTER_KEYWORDS) === null);

rmSync(tmp, { recursive: true, force: true });
console.log(`\n${fails.length ? `${fails.length} FAILED: ${fails.join(', ')}` : 'ALL PASS'}`);
process.exit(fails.length ? 1 : 0);
