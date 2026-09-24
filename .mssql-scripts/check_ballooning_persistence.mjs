/**
 * Save and load (BallooningDatabaseService.ts) against a fake service layer:
 * the new One Supply columns round-trip, defaults are stored as null, removed
 * balloons are written as tombstones, vanished rows are deleted, and a grid
 * row can carry rotation and frame without wiping its lines.
 *
 *   cd .mssql-scripts
 *   node --experimental-strip-types --no-warnings --import ./ts-stub-loader.mjs check_ballooning_persistence.mjs
 */
import {
    rowToAnnotation, annotationToRow, loadBalloons, saveBalloons, loadGridProfiles, saveGridProfile,
} from '../DSRFQ.Web/Modules/Common/Widgets/BallooningWidget/BallooningDatabaseService.ts';

let fails = 0;
const check = (name, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== '' ? '  ' + detail : ''}`);
    if (!ok) fails++;
};
const eq = (name, got, want) =>
    check(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}`);
const svc = globalThis.__svc;
const reset = () => { svc.calls.length = 0; svc.rows = {}; };

const styled = {
    id: '41', balloonNumber: 5, subNumber: 2, pageIndex: 1, balloonX: 30, balloonY: 40,
    rect: { x: 10, y: 20, width: 4, height: 2 }, content: 'Ø.380', originalContent: '2X Ø.380',
    type: 'Dimension', status: 'Pending', auto: false, gridStart: 'F8', gridEnd: 'A1', isNote: false,
    quantity: 2, upperTol: '+.005', lowerTol: '-.005', section: 'C4',
    audited: true, auditedOn: '2026-09-15T01:02:03Z', auditedBy: 'admin',
    balloonColor: '#ff0000', textColor: '#00ff00', balloonShape: 'star', balloonLineWidth: 4,
    balloonStyle: 'warning', showArrow: true, balloonScale: 1.35, boxHidden: true,
    dimensionFeature: 'reference', numberCategory: 'bom', exportMode: 'screenshot', cropRotation: 90,
};

console.log('1. row mapping');
const row = annotationToRow(styled, 12, false, 1.2);
eq('number and page written 1-based', [row.BalloonNo, row.PageNumber], ['5-2', 2]);
eq('audit written', [row.Audited, row.AuditedBy, row.AuditedOn], [true, 'admin', '2026-09-15T01:02:03Z']);
eq('style written', [row.BalloonColor, row.TextColor, row.BalloonShape, row.BalloonLineWidth, row.BalloonStyle, row.ShowArrow, row.BalloonScale, row.BoxHidden],
   ['#ff0000', '#00ff00', 'star', 4, 'warning', true, 1.35, true]);
eq('fields written', [row.DimensionFeature, row.NumberCategory, row.ExportMode, row.CropRotation], ['reference', 'bom', 'screenshot', 90]);
const back = rowToAnnotation({ ...row, Id: 41 });
for (const k of ['balloonNumber', 'subNumber', 'pageIndex', 'audited', 'auditedBy', 'balloonColor', 'textColor', 'balloonShape',
                 'balloonLineWidth', 'balloonStyle', 'showArrow', 'balloonScale', 'boxHidden', 'dimensionFeature',
                 'numberCategory', 'exportMode', 'cropRotation', 'quantity', 'section'])
    check(`${k} round-trips`, JSON.stringify(back[k]) === JSON.stringify(styled[k]), `${JSON.stringify(back[k])}`);

const plain = annotationToRow({ ...styled, audited: false, balloonColor: undefined, textColor: undefined, balloonShape: undefined,
    balloonLineWidth: undefined, balloonStyle: 'default', showArrow: undefined, balloonScale: undefined, boxHidden: false,
    dimensionFeature: '', numberCategory: 'normal', exportMode: 'text', cropRotation: 0 }, 12, false, 1);
eq('defaults are stored as null, so the shop default applies',
   [plain.BalloonColor, plain.BalloonShape, plain.BalloonStyle, plain.ShowArrow, plain.NumberCategory, plain.ExportMode, plain.CropRotation, plain.DimensionFeature],
   [null, null, null, null, null, null, null, null]);
check('an unaudited balloon clears who and when', plain.Audited === false && plain.AuditedBy === null && plain.AuditedOn === null);
// The consumer and the old widget stamped every row green; that is not a choice.
check('the old stamped green loads as "shop default"', rowToAnnotation({ ...row, Id: 1, BalloonColor: '#27DC3C' }).balloonColor === undefined);
eq('a note stores no category (technical requirements is its default)',
   annotationToRow({ ...styled, isNote: true, numberCategory: 'notes' }, 12, false, 1).NumberCategory, null);
eq('a note moved to Normal keeps that choice',
   annotationToRow({ ...styled, isNote: true, numberCategory: 'normal' }, 12, false, 1).NumberCategory, 'normal');
check('a real colour still loads', rowToAnnotation({ ...row, Id: 1, BalloonColor: '#dc2626' }).balloonColor === '#dc2626');

console.log('\n2. load');
reset();
svc.rows.CostingPartBalloons = [
    { ...annotationToRow(styled, 12, false, 1.2), Id: 41 },
    { ...annotationToRow({ ...styled, id: '42', balloonNumber: 6, subNumber: undefined }, 12, true, 1.2), Id: 42 },
];
svc.rows.CostingPartBalloonMaskZones = [{ Id: 7, PageNumber: 1, MaskX1: 1, MaskY1: 2, MaskX2: 11, MaskY2: 12 }];
const loaded = await loadBalloons(12);
eq('live and removed are split', [loaded.annotations.map(a => a.id), loaded.removed.map(a => a.id)], [['41'], ['42']]);
eq('mask read as a rect', loaded.masks[0].rect, { x: 1, y: 2, width: 10, height: 10 });
check('saved balloon size is read back', loaded.balloonSize === 1.2, loaded.balloonSize);

console.log('\n3. save');
reset();
svc.rows.CostingPartBalloons = [{ Id: 41 }, { Id: 43 }];
const fresh = { ...styled, id: 'uuid-1', balloonNumber: 9, subNumber: undefined };
const gone = { ...styled, id: '42' };
await saveBalloons(12, [styled, fresh], [gone], [], 1);
const calls = svc.calls.filter(c => c.service === 'CostingPartBalloons');
check('an existing balloon is updated', calls.some(c => c.method === 'Update' && c.request.EntityId === 41));
check('a new balloon is created', calls.some(c => c.method === 'Create' && c.request.Entity.BalloonNo === '9'));
check('a removed balloon is written as a tombstone', calls.some(c => c.method === 'Update' && c.request.EntityId === 42 && c.request.Entity.RemovedByUser === true));
check('a row that vanished is deleted', calls.some(c => c.method === 'Delete' && c.request.EntityId === 43));
check('the kept row is not deleted', !calls.some(c => c.method === 'Delete' && c.request.EntityId === 41));

console.log('\n4. grid rows: rotation and frame');
reset();
await saveGridProfile(12, 2, null, 55, { rotation: 90 });
const upd = svc.calls.find(c => c.method === 'Update');
check('a rotation-only save does not send lines', upd && upd.request.Entity.XLines === undefined && upd.request.Entity.YLines === undefined);
check('and does send the rotation', upd.request.Entity.Rotation === 90);
reset();
await saveGridProfile(12, 3, { xLines: [0, 50, 100], yLines: [0, 100] }, null, { frame: { x: 5, y: 6, width: 90, height: 80 } });
const cre = svc.calls.find(c => c.method === 'Create');
eq('a new row writes lines and frame corners', [cre.request.Entity.XLines, cre.request.Entity.FrameX2, cre.request.Entity.FrameY2], ['[0,50,100]', 95, 86]);
reset();
svc.rows.CostingPartBalloonGrids = [
    { Id: 1, PageNumber: 1, XLines: null, YLines: null, Rotation: 270 },
    { Id: 2, PageNumber: 2, XLines: '[0,100]', YLines: '[0,100]', FrameX1: 5, FrameY1: 5, FrameX2: 95, FrameY2: 95 },
];
const grids = await loadGridProfiles(12);
eq('a row with only a rotation still loads', [grids.get(1)?.rotation, grids.get(1)?.xLines], [270, null]);
eq('a frame is read as a rect', grids.get(2)?.frame, { x: 5, y: 5, width: 90, height: 90 });

console.log(`\n${fails ? fails + ' FAILED' : 'ALL PASS'}`);
process.exit(fails ? 1 : 0);
