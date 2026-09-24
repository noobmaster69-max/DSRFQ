/**
 * The canvas and the PDF export must size balloons identically.
 *
 * They did not: the canvas returned a flat 2.2 x multiplier while the export
 * derived the size from the annotation boxes and clamped it, so an operator
 * sized the balloons against the screen and the file came out with balloons
 * about a third smaller. This pins the shared helper's behaviour.
 *
 *     node .mssql-scripts/check_balloon_size_shared.mjs
 */

import { build } from '../DSRFQ.Web/node_modules/esbuild/lib/main.js';
import { pathToFileURL } from 'node:url';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
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

const tmp = mkdtempSync(join(tmpdir(), 'bsize-'));
const out = join(tmp, 'mod.mjs');

// computeBalloonSizePct is pure arithmetic, but it lives beside the PDF code.
// Stubbing the PDF packages keeps the bundle self-contained - marking them
// external instead just defers the failure to node's resolver at import time,
// and pdfjs wants a DOM the moment it loads.
const stub = join(tmp, 'stub.js');
writeFileSync(stub,
    'export const PDFDocument={},PDFArray={},PDFDict={},PDFHexString={},' +
    'PDFName={},PDFString={},StandardFonts={};export const rgb=()=>({});' +
    'export const GlobalWorkerOptions={};export const getDocument=()=>({});' +
    'export default {GlobalWorkerOptions:{},getDocument:()=>({})};');

await build({
    entryPoints: [`${DIR}/BallooningMethod.ts`],
    outfile: out, bundle: true,
    plugins: [stubStore], format: 'esm', platform: 'browser',
    logLevel: 'error',
    alias: { 'pdf-lib': stub, 'pdfjs-dist': stub },
});
const M = await import(pathToFileURL(out).href);

const ann = (h) => ({ rect: { x: 0, y: 0, width: 1, height: h } });

console.log('1. the shared helper');
check('exists', typeof M.computeBalloonSizePct === 'function');
check('no annotations falls back to the 1.5 default',
    M.computeBalloonSizePct([], 1) === 1.5, String(M.computeBalloonSizePct([], 1)));
check('follows the SMALLEST box, not the average',
    M.computeBalloonSizePct([ann(1.0), ann(8), ann(8)], 1) === 1.0,
    String(M.computeBalloonSizePct([ann(1.0), ann(8), ann(8)], 1)));
// A box with room to spare gets the balloon pulled in a little.
check('a box over 2% is reduced by 1 before clamping',
    M.computeBalloonSizePct([ann(3)], 1) === 1.5, '3 -> 2, clamped to the 1.5 ceiling');
check('clamped at the 0.8 floor',
    M.computeBalloonSizePct([ann(0.1)], 1) === 0.8, String(M.computeBalloonSizePct([ann(0.1)], 1)));
check('clamped at the 1.5 ceiling',
    M.computeBalloonSizePct([ann(50)], 1) === 1.5, String(M.computeBalloonSizePct([ann(50)], 1)));
check('a box with no height is ignored, not treated as zero',
    M.computeBalloonSizePct([{ rect: {} }, ann(1.2)], 1) === 1.2,
    String(M.computeBalloonSizePct([{ rect: {} }, ann(1.2)], 1)));

console.log('\n2. the operator multiplier scales it');
const base = M.computeBalloonSizePct([ann(1.2)], 1);
check('200% doubles', M.computeBalloonSizePct([ann(1.2)], 2) === base * 2);
check('50% halves', M.computeBalloonSizePct([ann(1.2)], 0.5) === base * 0.5);
check('and is applied AFTER the clamp, so it can exceed the ceiling',
    M.computeBalloonSizePct([ann(50)], 3) === 4.5,
    String(M.computeBalloonSizePct([ann(50)], 3)));

console.log('\n3. nobody computes it privately any more');
const widget = readFileSync(`${DIR}/BallooningWidget.ts`, 'utf8');
const method = readFileSync(`${DIR}/BallooningMethod.ts`, 'utf8');
check('the widget no longer hard-codes 2.2',
    !/2\.2\s*\*\s*this\.balloonSizeMultiplier/.test(widget));
check('the widget delegates to the shared helper',
    /return computeBalloonSizePct\(this\.annotations/.test(widget));
// One definition, and the two callers that used to inline it.
const defs = (method.match(/let globalBalloonSizePct = 1\.5/g) || []).length;
check('no inlined copies remain in the export paths', defs === 0, `${defs} found`);
const uses = (method.match(/computeBalloonSizePct\(annotations/g) || []).length;
check('both export paths call the helper', uses === 2, `${uses} call site(s)`);

rmSync(tmp, { recursive: true, force: true });
console.log(`\n${fails.length ? `${fails.length} FAILED: ${fails.join(', ')}` : 'ALL PASS'}`);
process.exit(fails.length ? 1 : 0);
