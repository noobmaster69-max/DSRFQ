import {Criteria, htmlEncode, LookupEditor, notifyError, notifySuccess} from "@serenity-is/corelib";
import {CostingPartsRow} from "@/ServerTypes/Costing/CostingPartsRow";
import {CostingPartsService} from "@/ServerTypes/Costing/CostingPartsService";
import {CostingPartDocumentsRow} from "@/ServerTypes/Costing/CostingPartDocumentsRow";
import {CostingPartDocumentsService} from "@/ServerTypes/Costing/CostingPartDocumentsService";
import {CostingPartDocumentImagesService} from "@/ServerTypes/Costing/CostingPartDocumentImagesService";
import {CostingPartStageTimingsRow} from "@/ServerTypes/Costing/CostingPartStageTimingsRow";
import {CostingPartStageTimingsService} from "@/ServerTypes/Costing/CostingPartStageTimingsService";
import {Viewer2DWidget} from "@/Common/Widgets/Viewer2D/Viewer2DWidget";
import {Viewer2DCss} from "@/Common/Widgets/Viewer2D/Viewer2DCss";
import {Viewer3DWidget} from "@/Common/Widgets/Viewer3D/Viewer3DWidget";
import {Viewer3DCss} from "@/Common/Widgets/Viewer3D/Viewer3DCss";
import {cacheGlbWhenReady, hasCachedGlb, needsOcct, resolve3DSource} from "@/Common/Widgets/Viewer3D/GlbCache";
import {BallooningWidget} from "@/Common/Widgets/BallooningWidget/BallooningWidget";
import {CostingPartCostingResultsRow} from "@/ServerTypes/Costing/CostingPartCostingResultsRow";
import {CostingPartMachineOptionsRow} from "@/ServerTypes/Costing/CostingPartMachineOptionsRow";
import {CostingPartMachineOptionsService} from "@/ServerTypes/Costing/CostingPartMachineOptionsService";
import {CostingPartCostingResultsService} from "@/ServerTypes/Costing/CostingPartCostingResultsService";
import {CostingPartBomResultsRow} from "@/ServerTypes/Costing/CostingPartBomResultsRow";
import {CostingPartBomResultsService} from "@/ServerTypes/Costing/CostingPartBomResultsService";
import {CostingPartSpecialProcessResultsRow} from "@/ServerTypes/Costing/CostingPartSpecialProcessResultsRow";
import {CostingPartSpecialProcessResultsService} from "@/ServerTypes/Costing/CostingPartSpecialProcessResultsService";
import {CostingWorkspaceCss} from "@/Costing/Workspace/CostingWorkspaceCss";
import {
    DOC_TYPE_CAD, DOC_TYPE_LABEL,
    MODE_LABEL, modesForDocument, SheetVariant, StageMode, StatusChip,
    TimingRun, TimingRunKind
} from "@/Costing/Workspace/WorkspaceTypes";

/**
 * Full-page workspace for one costing part.
 *
 * Replaces the fixed 1200x850 CostingResultDialog layout. One stage renders the
 * selected document; the mode switch decides whether that is the flat drawing,
 * the solid model, or the ballooning editor.
 *
 * Each mode owns its host element and is mounted lazily, then shown and hidden
 * rather than rebuilt — so a trip through 3D and back leaves the 2D pan and zoom
 * exactly where the user left them.
 */
export class CostingWorkspace {
    private host: HTMLElement;
    private costingPartId: number;

    private part: CostingPartsRow | null = null;
    private documents: CostingPartDocumentsRow[] = [];
    private costing: CostingPartCostingResultsRow[] = [];
    private bom: CostingPartBomResultsRow[] = [];
    private specialProcess: CostingPartSpecialProcessResultsRow[] = [];
    private trayTab: 'costing' | 'bom' | 'process' = 'costing';
    /** Detail edits not yet written back, keyed by CostingParts column. */
    private pendingEdits: Record<string, any> = {};
    private isSaving = false;
    private selectedDocId: number | null = null;
    private mode: StageMode = '2d';
    /** Which sheet the 2D viewer is showing: as-uploaded, or post-conversion. */
    private sheet: SheetVariant = 'original';
    /** Steps of the most recent processing run, in execution order. */
    private timings: CostingPartStageTimingsRow[] = [];
    /**
     * The "Priced as" picker.
     *
     * Costing prices raw material off CostingParts.MaterialID, not off the
     * Material text -- so a drawing whose title block says "SEE BOM", or that
     * OCR read as "4.", produces a quote with machining hours and no material
     * at all. The consumer will not guess: a fuzzy match below its threshold is
     * refused rather than pricing a part as titanium because the title block
     * said "4.". This picker is how a person supplies the answer instead.
     *
     * Held so it can be destroyed before renderInspector replaces the HTML it
     * lives in; a widget whose element is thrown away still has its listeners
     * and its lookup subscription.
     */
    private materialEditor: LookupEditor | null = null;

    /**
     * Candidate machines per cost line.
     *
     * new_tsh reports one machine per process and its selection cannot be
     * relied on -- its axis filter compares a row against a value it has just
     * written into that row, and every candidate is scored at one flat rate, so
     * the "cheapest suitable machine" is really just the first row of the
     * equipment table. Showing the whole field and letting a person choose is
     * the honest answer, and choosing is a manufacturing judgement anyway.
     */
    private machineOptions: CostingPartMachineOptionsRow[] = [];
    /** Cost line whose machine picker is open, if any. */
    private pickerLineId: number | null = null;

    private viewer2d: Viewer2DWidget | null = null;
    private viewer3d: Viewer3DWidget | null = null;
    private ballooning: BallooningWidget | null = null;

    private stage2dEl!: HTMLElement;
    private stage3dEl!: HTMLElement;
    private stageBalloonEl!: HTMLElement;

    /** Document ids whose page images have already been pushed into the 2D viewer. */
    private loaded2dDocId: number | null = null;
    private loaded3dDocId: number | null = null;
    private loadedBalloonDocId: number | null = null;

    constructor(host: HTMLElement, costingPartId: number) {
        this.host = host;
        this.costingPartId = costingPartId;
        this.renderShell();
        this.load();
    }

    // ─── Data ────────────────────────────────────────────────────────────

    /**
     * Re-reads the part row on its own.
     *
     * Not load(): that also re-fetches documents and stage timings, neither of
     * which a material change touches, and re-running it would rebuild the
     * document rail and the 3D viewer for nothing.
     */
    private reloadPart() {
        CostingPartsService.Retrieve({EntityId: this.costingPartId}, response => {
            this.part = response.Entity;
            this.renderHeader();
            this.renderInspector();
        }, {blockUI: false});
    }

    private load() {
        CostingPartsService.Retrieve({EntityId: this.costingPartId}, response => {
            this.part = response.Entity;
            this.renderHeader();
            this.renderInspector();
            this.loadResults();
            this.loadTimings();
        }, {
            // A bad id in the URL is a normal thing to hit — say so in the page
            // rather than letting Serenity throw its modal alert over the shell.
            blockUI: false,
            onError: () => {
                (this.host.querySelector('.cw-header') as HTMLElement).innerHTML =
                    `<div class="cw-title"><h1>Part ${this.costingPartId} not found</h1></div>`;
                this.setStageMessage('This costing part does not exist, or you do not have permission to see it.');
                return true;   // handled — suppresses Serenity's own alert dialog
            }
        });

        CostingPartDocumentsService.List({
            Criteria: Criteria.and(
                Criteria("IsActive").eq("1"),
                Criteria("CostingPartID").eq(this.costingPartId)),
            Sort: ["Type ASC"]
        }, response => {
            this.documents = response.Entities ?? [];
            this.renderRail();

            // Open on the first document that the stage can actually render.
            const first = this.documents.find(d => modesForDocument(d).length > 0);
            if (first) this.selectDocument(first.Id!);
            else this.renderStage();
        });
    }

    /** Costing, BOM and special-process results all render in the tray. */
    /**
     * Cost lines in the order the work actually happens.
     *
     * Sorted here rather than relied on from the insert order, because the
     * stored order is whatever the pipeline happened to write -- roughing,
     * finishing, THEN semi-finishing, which reads as a mistake -- and because
     * a line an estimator adds by hand later would otherwise land at the end
     * whatever it is. Anything unrecognised keeps its relative position after
     * the known steps rather than being dropped or forced to the top.
     */
    private inProcessOrder(lines: CostingPartCostingResultsRow[]) {
        const rank = (name: string) => {
            const n = (name ?? '').toLowerCase();
            if (n.includes('material')) return 0;
            if (n.includes('setup') || n.includes('clamp')) return 1;
            if (n.includes('rough')) return 2;
            if (n.includes('semi')) return 3;      // before the plain finishing test
            if (n.includes('finish')) return 4;
            if (n.includes('turning')) return 5;
            return 6;
        };
        return lines
            .map((line, i) => ({ line, i, rank: rank(line.Name) }))
            .sort((a, b) => a.rank - b.rank || a.i - b.i)
            .map(x => x.line);
    }

    private loadResults() {
        const forThisPart = Criteria.and(
            Criteria("IsActive").eq("1"),
            Criteria("CostingPartID").eq(this.costingPartId));

        CostingPartCostingResultsService.List({
            Criteria: forThisPart,
            // Asked for by name because Serenity leaves [Origin] fields out of
            // a List response unless requested -- MachineId and MachineName are
            // plain columns and arrive anyway, but everything joined from
            // dbo.Machines came back null, which is why the machine had a name
            // and no picture. Scoped here rather than forced on the row, so
            // other callers of this service keep the lighter payload.
            IncludeColumns: [
                'MachineRealName', 'MachinePicture', 'MachineAxisNumber',
                'MachinePrecision', 'MachineCost', 'MachineDescription',
                'MachineWorkEnvelopeX', 'MachineWorkEnvelopeY',
                'MachineWorkEnvelopeZ', 'MachineWeightLimit'
            ]
        }, r => {
            this.costing = this.inProcessOrder(r.Entities ?? []);
            this.renderHeader();
            this.renderTray();
            this.renderRailMachines();
            this.loadMachineOptions();
        });
        CostingPartBomResultsService.List({Criteria: forThisPart}, r => {
            this.bom = r.Entities ?? [];
            this.renderTray();
        });
        CostingPartSpecialProcessResultsService.List({Criteria: forThisPart}, r => {
            this.specialProcess = r.Entities ?? [];
            this.renderTray();
        });
    }

    private costingTotal(): number {
        return this.costing.reduce((sum, c) => sum + (Number(c.Total) || 0), 0);
    }

    private currencyCode(): string {
        return this.costing.find(c => !!c.CurrencyCode)?.CurrencyCode ?? '';
    }

    private get selectedDoc(): CostingPartDocumentsRow | null {
        return this.documents.find(d => d.Id === this.selectedDocId) ?? null;
    }

    // ─── Selection ───────────────────────────────────────────────────────

    private selectDocument(docId: number) {
        // Balloon edits live in memory until Save, and ballooning another
        // document reloads the widget from the database - which used to throw
        // the edits away without a word. Ask first.
        if (docId !== this.selectedDocId && this.loadedBalloonDocId !== null
            && docId !== this.loadedBalloonDocId && this.ballooning?.hasUnsavedChanges()
            && !confirm('You have unsaved balloon changes. Open the other document and discard them?\n\n'
                + 'Cancel to stay here and Save first.')) {
            this.paintRailSelection();
            return;
        }
        this.selectedDocId = docId;
        const doc = this.selectedDoc;
        const modes = doc ? modesForDocument(doc) : [];

        // Keep the current mode when the new document supports it — switching
        // from one 2D sheet to another should not throw the user back to a
        // different view.
        if (!modes.includes(this.mode)) this.mode = modes[0] ?? '2d';

        this.paintRailSelection();
        this.renderStage();
    }

    private setMode(mode: StageMode) {
        if (this.mode === mode) return;
        this.mode = mode;
        this.renderStage();
    }

    // ─── Stage ───────────────────────────────────────────────────────────

    private renderStage() {
        const doc = this.selectedDoc;
        const modes = doc ? modesForDocument(doc) : [];

        this.renderModeSwitch(modes);
        this.renderSheetSwitch();

        // Ballooning wants every pixel it can get for the drawing, so the mode
        // is put on the root and the layout answers in CSS: the balloon list
        // and property editor move into the rail, the machine cards give up
        // their half of it, and the tray closes entirely. Doing it here rather
        // than with inline styles keeps the rule in one place.
        this.host.querySelector('.cw-root')
            ?.classList.toggle('is-balloon', this.mode === 'balloon');

        const show2d = this.mode === '2d';
        this.stage2dEl.style.display = show2d ? '' : 'none';
        this.stage3dEl.style.display = this.mode === '3d' ? '' : 'none';
        this.stageBalloonEl.style.display = this.mode === 'balloon' ? '' : 'none';

        if (!doc) {
            this.setStageMessage('Select a document to view it here.');
            return;
        }
        if (modes.length === 0) {
            this.setStageMessage(`${doc.FileName ?? 'This file'} cannot be previewed — download it to open in CAD.`);
            return;
        }
        this.setStageMessage(null);

        if (show2d) this.mount2d(doc);
        if (this.mode === '3d') this.mount3d(doc);
        if (this.mode === 'balloon') this.mountBalloon(doc);
        // The tray swaps between costing and the balloon panels with mode.
        this.renderTray();
    }

    private mount2d(doc: CostingPartDocumentsRow) {
        if (!this.viewer2d) this.viewer2d = new Viewer2DWidget(this.stage2dEl);

        if (this.loaded2dDocId === doc.Id) {
            // Already showing this document — just re-fit, because the stage may
            // have had no size while another mode was visible.
            this.viewer2d.resize();
            return;
        }
        this.loaded2dDocId = doc.Id!;
        this.load2dPages(doc);
    }

    /**
     * Load a document's page images for the current sheet variant.
     *
     * Original = 1 is the drawing as uploaded; Original = 0 is the converted
     * sheet, with the customer title block and logo replaced by ours. Both are
     * kept, and the user picks between them -- comparing the two is the whole
     * point of reviewing a conversion.
     */
    private load2dPages(doc: CostingPartDocumentsRow) {
        const wantOriginal = this.sheet === 'original';

        CostingPartDocumentImagesService.List({
            Criteria: Criteria.and(
                Criteria("IsActive").eq("1"),
                Criteria("CostingPartDocumentID").eq(doc.Id),
                Criteria("Original").eq(wantOriginal ? 1 : 0)),
            Sort: ["Page ASC"]
        }, response => {
            const pages = (response.Entities ?? []).map(e => ({
                fileDirectory: e.FileDirectory!,
                page: e.Page ?? 0
            }));
            this.viewer2d!.setPages(pages);
            this.renderSheetSwitch();

            // The user may have moved on while this was in flight; only speak up
            // if we are still looking at this document in a 2D-backed mode.
            const stillCurrent = this.selectedDocId === doc.Id &&
                (this.mode === '2d' || this.mode === 'balloon');
            if (pages.length === 0 && stillCurrent)
                this.setStageMessage(wantOriginal
                    ? 'This document has no page images yet — conversion may still be running.'
                    : 'No converted pages yet — the drawing conversion has not finished for this document.');
        });
    }

    /** Switch between the original and converted sheets and reload the viewer. */
    private setSheet(sheet: SheetVariant) {
        if (sheet === this.sheet) return;
        this.sheet = sheet;
        const doc = this.documents.find(d => d.Id === this.loaded2dDocId);
        if (doc) this.load2dPages(doc);
        else this.renderSheetSwitch();
    }

    private mount3d(doc: CostingPartDocumentsRow) {
        if (!this.viewer3d) this.viewer3d = new Viewer3DWidget(this.stage3dEl);

        if (this.loaded3dDocId === doc.Id) {
            this.viewer3d.resize();
            return;
        }

        const src = resolve3DSource(doc);
        if (!src) {
            this.setStageMessage('This 3D document has no file to load.');
            return;
        }
        this.loaded3dDocId = doc.Id!;
        this.viewer3d.loadFromUrl(src);

        // Only worth caching when the source needed the external importer and we
        // are not already looking at the cached result.
        if (!hasCachedGlb(doc) && needsOcct(doc.FileName || doc.FileDirectory || ''))
            cacheGlbWhenReady(this.viewer3d, doc);
    }

    private mountBalloon(doc: CostingPartDocumentsRow) {
        if (!this.ballooning)
            this.ballooning = new BallooningWidget(this.stageBalloonEl, this.costingPartId);
        // For the check sheet's Unit column; the widget knows balloons, not parts.
        this.ballooning.partUnit = this.part?.Uom ?? '';

        if (this.loadedBalloonDocId === doc.Id) {
            this.ballooning.resize();
            return;
        }
        this.loadedBalloonDocId = doc.Id!;

        // The PDF behind the page images, so Export annotates the real
        // document rather than a picture of it.
        this.ballooning.setSource(
            doc.FileDirectory ? `/upload/${doc.FileDirectory}` : null,
            doc.FileName || 'drawing.pdf');

        CostingPartDocumentImagesService.List({
            Criteria: Criteria.and(
                Criteria("IsActive").eq("1"),
                Criteria("CostingPartDocumentID").eq(doc.Id),
                Criteria("Original").eq(1)),
            Sort: ["Page ASC"]
        }, response => {
            const pages = (response.Entities ?? []).map(e => `/upload/${e.FileDirectory}`);
            this.ballooning!.setPages(pages);
            if (pages.length === 0 && this.selectedDocId === doc.Id && this.mode === 'balloon')
                this.setStageMessage('This document has no page images yet, so there is nothing to balloon.');
        });
    }

    private setStageMessage(message: string | null) {
        const el = this.host.querySelector('.cw-stage-message') as HTMLElement;
        el.textContent = message ?? '';
        el.style.display = message ? '' : 'none';
    }

    // ─── Rendering ───────────────────────────────────────────────────────

    private renderShell() {
        this.host.innerHTML = `
            ${CostingWorkspaceCss()}
            ${Viewer2DCss()}
            ${Viewer3DCss()}
            <div class="cw-root">
                <header class="cw-header"></header>
                <div class="cw-body">
                    <aside class="cw-rail">
                        <div class="cw-rail-docs"></div>
                        <div class="cw-rail-balloon"></div>
                        <div class="cw-rail-machines"></div>
                        <div class="cw-rail-resizer" role="separator" aria-orientation="vertical"
                             title="Drag to resize the balloon list. Double-click to reset."></div>
                    </aside>
                    <aside class="cw-balloon-editor"></aside>
                    <section class="cw-main">
                        <div class="cw-modes"></div>
                        <div class="cw-sheet"></div>
                        <div class="cw-stage">
                            <div class="cw-stage-2d"></div>
                            <div class="cw-stage-3d"></div>
                            <div class="cw-stage-balloon"></div>
                            <p class="cw-stage-message"></p>
                        </div>
                        <div class="cw-tray"></div>
                    </section>
                    <aside class="cw-inspector">
                        <div class="cw-inspector-body"></div>
                        <div class="cw-timings"></div>
                    </aside>
                </div>
            </div>`;

        this.stage2dEl = this.host.querySelector('.cw-stage-2d')!;
        this.stage3dEl = this.host.querySelector('.cw-stage-3d')!;
        this.stageBalloonEl = this.host.querySelector('.cw-stage-balloon')!;
        this.wireRailResizer();
    }

    /**
     * Drag the rail's left edge to widen the balloon list (the rail is on the
     * right in balloon mode).
     *
     * Balloon mode only - the handle is hidden otherwise and costing keeps its
     * fixed rail. Remembered per browser rather than per part: how much of the
     * screen the list deserves depends on the monitor, not the drawing.
     */
    private wireRailResizer() {
        const body = this.host.querySelector('.cw-body') as HTMLElement | null;
        const rail = this.host.querySelector('.cw-rail') as HTMLElement | null;
        const handle = this.host.querySelector('.cw-rail-resizer') as HTMLElement | null;
        if (!body || !rail || !handle) return;

        const KEY = 'dsrfq.workspace.balloonRailWidth';
        const apply = (w: number) => body.style.setProperty('--cw-balloon-rail', `${w}px`);
        // The stage must re-fit the drawing to its new width.
        const reflow = () => window.dispatchEvent(new Event('resize'));
        try {
            const saved = Number(localStorage.getItem(KEY));
            if (saved >= 280) apply(saved);
        } catch { /* private browsing: default width */ }

        handle.addEventListener('pointerdown', (e: PointerEvent) => {
            e.preventDefault();
            const startX = e.clientX;
            const startW = rail.getBoundingClientRect().width;
            // Never so wide the drawing is left a sliver.
            const max = Math.max(320, Math.floor(body.clientWidth * 0.6));
            handle.setPointerCapture(e.pointerId);
            body.classList.add('is-resizing');

            const move = (ev: PointerEvent) =>
                // The rail sits on the right in balloon mode: dragging its
                // left edge leftwards widens it.
                apply(Math.round(Math.max(280, Math.min(max, startW - (ev.clientX - startX)))));
            const up = () => {
                handle.removeEventListener('pointermove', move);
                handle.removeEventListener('pointerup', up);
                handle.removeEventListener('pointercancel', up);
                body.classList.remove('is-resizing');
                try { localStorage.setItem(KEY, String(Math.round(rail.getBoundingClientRect().width))); } catch { }
                reflow();
            };
            handle.addEventListener('pointermove', move);
            handle.addEventListener('pointerup', up);
            handle.addEventListener('pointercancel', up);
        });
        handle.addEventListener('dblclick', () => {
            body.style.removeProperty('--cw-balloon-rail');
            try { localStorage.removeItem(KEY); } catch { }
            reflow();
        });
    }

    private statusChips(): StatusChip[] {
        const p = this.part;
        if (!p) return [];
        return [
            {label: 'Conversion', value: p.DrawingConversionStatusName!, color: p.DrawingConversionStatusColor!},
            {label: 'OCR', value: p.OcrStatusName!, color: p.OcrStatusColor!},
            {label: 'Balloon', value: p.BalloonStatusName!, color: p.BalloonStatusColor!},
            {label: 'Costing', value: p.CostingStatusName!, color: p.CostingStatusColor!}
        ].filter(c => !!c.value);
    }

    private renderHeader() {
        const p = this.part;
        const el = this.host.querySelector('.cw-header') as HTMLElement;
        if (!p) { el.innerHTML = ''; return; }

        const chips = this.statusChips().map(c => `
            <span class="cw-chip" title="${this.escape(c.label)}">
                <b style="color:${this.escape(c.color ?? '#6c757d')}">&#9679;</b>
                <span class="cw-chip-label">${this.escape(c.label)}</span>
                ${this.escape(c.value)}
            </span>`).join('');

        const total = this.costingTotal();
        el.innerHTML = `
            <div class="cw-title">
                <h1>${this.escape(p.PartNumber ?? 'Untitled part')}</h1>
                ${p.Revision ? `<span class="cw-rev">Rev ${this.escape(p.Revision)}</span>` : ''}
                ${p.CustomerName ? `<span class="cw-customer">${this.escape(p.CustomerName)}</span>` : ''}
            </div>
            <div class="cw-header-right">
                <div class="cw-chips">${chips}</div>
                <div class="cw-total" title="Sum of all costing lines">
                    <span class="cw-total-cur">${this.escape(this.currencyCode())}</span>
                    <span class="cw-total-val">${total.toFixed(2)}</span>
                </div>
                <button class="cw-save" id="cw-save" ${this.isSaving ? 'disabled' : ''}>
                    ${this.isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>`;

        el.querySelector('#cw-save')?.addEventListener('click', () => this.handleSave());
    }

    /** Writes back whatever the detail fields changed. */
    private async handleSave() {
        if (this.isSaving) return;
        if (!Object.keys(this.pendingEdits).length) {
            notifySuccess('Nothing to save.');
            return;
        }
        // Whether "Priced as" moved has to be read before pendingEdits is
        // cleared, and compared against what the part carried on the way in.
        const materialChanged = 'MaterialId' in this.pendingEdits
            && this.pendingEdits.MaterialId !== this.part?.MaterialId;
        const chosenMaterial = this.pendingEdits.MaterialId ?? null;

        this.isSaving = true;
        this.renderHeader();
        try {
            await CostingPartsService.Update({
                EntityId: this.costingPartId,
                Entity: {...this.pendingEdits}
            });
            Object.assign(this.part!, this.pendingEdits);
            this.pendingEdits = {};
            notifySuccess('Part detail saved.');

            if (materialChanged)
                await this.applyMaterialToCosting(chosenMaterial);
        } catch (e) {
            console.error('Part save failed', e);
            notifyError('Could not save the part detail.');
        } finally {
            this.isSaving = false;
            this.renderHeader();
            this.renderInspector();
        }
    }

    /**
     * Re-prices the material line for the material just chosen.
     *
     * Run on save rather than on every change of the picker: the rest of the
     * detail pane batches into Save, and writing cost lines while someone is
     * still scrolling a type-ahead would put rows in the database for materials
     * they never picked.
     *
     * Its own try/catch so a pricing problem does not read as a failed save.
     * The part detail is already committed by this point, and the two failures
     * need different words -- "no raw material cost for Ti 6Al-4V" is a data
     * gap the operator can go and fill, not a lost edit.
     */
    private async applyMaterialToCosting(materialId: number | null) {
        try {
            const r = await CostingPartsService.ApplyMaterial({
                CostingPartId: this.costingPartId,
                MaterialId: materialId
            });
            notifySuccess(r.Message ?? 'Material cost updated.');
            // Gross and net weight were recomputed from the new density, so the
            // detail pane is stale as well as the cost lines.
            this.reloadPart();
            this.loadResults();
        } catch (e: any) {
            console.error('Material pricing failed', e);
            notifyError(e?.Message ??
                'Saved the part, but could not price the material. ' +
                'Check that it has a density and a raw material cost.');
        }
    }

    private renderRail() {
        // Its own container, not the whole rail: the machines section below is
        // a sibling and must survive a document re-render.
        const el = this.host.querySelector('.cw-rail-docs') as HTMLElement;
        if (!this.documents.length) {
            el.innerHTML = `<p class="cw-placeholder">No documents uploaded.</p>`;
            return;
        }

        const host = window.location.protocol + "//" + window.location.host;
        el.innerHTML = `
            <h2 class="cw-rail-title">Documents</h2>
            <div class="cw-doc-list">
            ${this.documents.map(d => {
                const meta = DOC_TYPE_LABEL[d.Type!] ?? DOC_TYPE_LABEL[DOC_TYPE_CAD];
                const viewable = modesForDocument(d).length > 0;
                return `
                <div class="cw-doc ${viewable ? '' : 'is-unviewable'}" data-doc="${d.Id}">
                    <span class="cw-doc-type" style="background:${meta.color}">${meta.label}</span>
                    <span class="cw-doc-name" title="${this.escape(d.FileName ?? '')}">${this.escape(d.FileName ?? '')}</span>
                    <a class="cw-doc-dl" href="${host}/upload/${this.escape(d.FileDirectory ?? '')}"
                       target="_blank" rel="noopener noreferrer" title="Download original">&#8595;</a>
                </div>`;
            }).join('')}
            </div>`;

        el.querySelectorAll('[data-doc]').forEach(row => {
            row.addEventListener('click', e => {
                if ((e.target as HTMLElement).closest('.cw-doc-dl')) return;
                const id = Number((row as HTMLElement).dataset.doc);
                const doc = this.documents.find(d => d.Id === id);
                if (!doc) return;
                if (modesForDocument(doc).length === 0) {
                    notifyError('This file type cannot be previewed. Use the download arrow to open it in CAD.');
                    return;
                }
                this.selectDocument(id);
            });
        });
        this.paintRailSelection();
    }

    /**
     * The machine section of the left rail: which machines the part is costed
     * on, and the picker when a process is open for changing.
     *
     * In the rail rather than under the cost table because it is reference
     * material about the part, like the documents above it -- and because the
     * tray is already carrying a nine-column table that a 460px card and a
     * 35-row picker were squeezing off the bottom of the screen.
     */
    private renderRailMachines() {
        const el = this.host.querySelector('.cw-rail-machines') as HTMLElement;
        if (!el) return;

        const cards = this.renderMachinesUsed();
        const picker = this.renderMachinePicker();
        el.innerHTML = (cards || picker)
            ? `<h2 class="cw-rail-title">Machines</h2>${cards}${picker}`
            : '';

        el.querySelector('.cw-picker-close')?.addEventListener('click', () => {
            this.pickerLineId = null;
            this.renderRailMachines();
        });

        el.querySelectorAll('.cw-pick').forEach(b => {
            b.addEventListener('click', () => {
                const btn = b as HTMLButtonElement;
                this.applyMachine(Number(btn.dataset.line), Number(btn.dataset.machine), btn);
            });
        });
    }

    private paintRailSelection() {
        this.host.querySelectorAll('.cw-doc').forEach(row => {
            row.classList.toggle('is-selected',
                Number((row as HTMLElement).dataset.doc) === this.selectedDocId);
        });
    }

    private renderModeSwitch(modes: StageMode[]) {
        const el = this.host.querySelector('.cw-modes') as HTMLElement;
        if (modes.length < 2) { el.innerHTML = ''; return; }

        el.innerHTML = modes.map(m => `
            <button class="cw-mode ${m === this.mode ? 'is-active' : ''}" data-mode="${m}">${MODE_LABEL[m]}</button>
        `).join('');

        el.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', () =>
                this.setMode((btn as HTMLElement).dataset.mode as StageMode));
        });
    }

    /**
     * Load this part's recorded steps and render them.
     *
     * Rows arrive newest-run-first and cover every pipeline; timingRuns() picks
     * the latest run of each. The Take has to cover more than one run's worth
     * of steps for that reason, but still bounds a runaway.
     */
    /**
     * Load the alternative machines, building them first if they are missing.
     *
     * Built on demand rather than by the consumer: DSRFQ has dbo.Machines and
     * the part's dimensions locally, so it can work out what fits without
     * asking new_tsh -- whose own answer is the thing being second-guessed.
     * Build is a no-op once options exist.
     */
    private loadMachineOptions() {
        const machining = this.costing.some(c => c.MachineId != null);
        if (!machining) return;

        const load = () => CostingPartMachineOptionsService.List({
            Criteria: Criteria.and(
                Criteria('IsActive').eq(1),
                Criteria('CostingPartID').eq(this.costingPartId)),
            IncludeColumns: [
                'MachineName', 'MachinePicture', 'MachineAxisNumber',
                'MachinePrecision', 'MachineWorkEnvelopeX', 'MachineWorkEnvelopeY',
                'MachineWorkEnvelopeZ', 'MachineWeightLimit', 'ProcessName', 'ProcessHours'
            ]
        }, r => {
            this.machineOptions = r.Entities ?? [];
            this.renderTray();
            this.renderRailMachines();
        }, { blockUI: false, onError: () => true });

        CostingPartMachineOptionsService.Build({CostingPartId: this.costingPartId},
            () => load(),
            // A failed build should not cost the user the costing table; the
            // machine cell just stays unclickable.
            { blockUI: false, onError: () => { load(); return true; } });
    }

    private loadTimings() {
        if (!this.costingPartId) return;

        CostingPartStageTimingsService.List({
            Criteria: Criteria.and(
                Criteria("IsActive").eq("1"),
                Criteria("CostingPartID").eq(this.costingPartId)),
            // Newest run first, then execution order within it.
            Sort: ["StartTime DESC", "Sequence ASC"],
            // Generous: a run is a handful of steps, and this bounds a runaway.
            Take: 200
        }, response => {
            this.timings = response.Entities ?? [];
            this.renderTimings();
        });
    }

    /**
     * Which pipeline produced a run.
     *
     * Costing rides on `costing-*` stages (plus part-picture, which the costing
     * chain records through the same timer); ballooning on `ballooning*`.
     * Anything else came off the conversion/OCR queue.
     */
    private static runKind(steps: CostingPartStageTimingsRow[]): TimingRunKind {
        const stages = steps.map(s => s.Stage ?? '');
        if (stages.some(s => s.startsWith('ballooning'))) return 'ballooning';
        if (stages.some(s => s.startsWith('costing-'))) return 'costing';
        return 'conversion';
    }

    /**
     * Group the rows into one panel per pipeline, newest run of each.
     *
     * A part accumulates runs of different kinds -- conversion/OCR arrives on
     * one queue, costing on another, ballooning on a third -- and they are not
     * alternatives to each other. Ranking every run on one newest-first list
     * meant a costing run pushed the conversion/OCR timings out of the panel,
     * which reads as costing having overwritten them. Each pipeline gets its
     * own section instead, so running one never hides another.
     *
     * Sections are ordered by where they sit in the pipeline rather than by
     * time, so the panel does not reshuffle itself as re-runs land.
     */
    private timingRuns(): TimingRun[] {
        const byRun = new Map<string, CostingPartStageTimingsRow[]>();
        for (const row of this.timings) {
            const key = row.RunId ?? '';
            if (!byRun.has(key)) byRun.set(key, []);
            byRun.get(key)!.push(row);
        }

        const labels: Record<TimingRunKind, string> = {
            conversion: 'Conversion & OCR',
            ballooning: 'Ballooning',
            costing: 'Costing'
        };

        // Newest run wins its section; earlier attempts stay in the table.
        const latest = new Map<TimingRunKind, TimingRun>();
        for (const [runId, steps] of byRun) {
            steps.sort((a, b) => (a.Sequence ?? 0) - (b.Sequence ?? 0));
            const kind = CostingWorkspace.runKind(steps);
            const run: TimingRun = {
                runId, kind, label: labels[kind], started: steps[0]?.StartTime, steps
            };
            const held = latest.get(kind);
            if (!held || String(run.started ?? '') > String(held.started ?? ''))
                latest.set(kind, run);
        }

        return (['conversion', 'ballooning', 'costing'] as TimingRunKind[])
            .map(kind => latest.get(kind))
            .filter((r): r is TimingRun => !!r);
    }

    private renderTimings() {
        const el = this.host.querySelector('.cw-timings') as HTMLElement;
        if (!el) return;

        const runs = this.timingRuns();
        if (!runs.length) {
            el.innerHTML = `<div class="cw-timing-empty">No processing run recorded for this part yet.</div>`;
            return;
        }

        const fmt = (ms: number | null | undefined) => {
            if (ms == null) return '—';
            if (ms < 1000) return `${ms} ms`;
            const s = ms / 1000;
            return s < 60 ? `${s.toFixed(1)}s`
                          : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
        };

        el.innerHTML = runs.map(run => {
            // Bars are scaled within their own run, so each run's bottleneck is
            // readable rather than being flattened by a slower sibling run.
            const slowest = Math.max(...run.steps.map(s => s.DurationMs ?? 0), 1);
            const total = run.steps.reduce((sum, s) => sum + (s.DurationMs ?? 0), 0);

            return `
            <section class="cw-timing-group" data-kind="${run.kind}">
            <div class="cw-timing-head">
                <span>${this.escape(run.label)}</span>
                <span class="cw-timing-total">${fmt(total)} total</span>
            </div>
            ${run.steps.map(s => {
                const ms = s.DurationMs ?? 0;
                const pct = Math.max(2, Math.round((ms / slowest) * 100));
                const status = (s.Status ?? '').toLowerCase();
                const share = total > 0 && ms > 0 ? Math.round((ms / total) * 100) : 0;
                return `
                <div class="cw-timing-row is-${this.escape(status)}"
                     title="${this.escape(s.Detail ?? '')}">
                    <span class="cw-timing-name">${this.escape(s.Label ?? s.Stage ?? '')}</span>
                    <span class="cw-timing-bar"><i style="width:${pct}%"></i></span>
                    <span class="cw-timing-ms">${
                        status === 'skipped' ? 'skipped'
                        : status === 'running' ? 'running…'
                        : fmt(s.DurationMs)}</span>
                    <span class="cw-timing-share">${share ? share + '%' : ''}</span>
                </div>`;
            }).join('')}
            </section>`;
        }).join('');
    }

    /**
     * Original / Converted switch plus a download for the converted PDF --
     * the three actions the previous result dialog exposed as "View Original",
     * "View Converted" and "Download Converted".
     *
     * Only shown in the 2D-backed modes; there is no converted variant of a
     * STEP model to switch to.
     */
    private renderSheetSwitch() {
        const el = this.host.querySelector('.cw-sheet') as HTMLElement;
        if (!el) return;

        const doc = this.documents.find(d => d.Id === this.loaded2dDocId);
        const showFor2d = this.mode === '2d' || this.mode === 'balloon';
        if (!doc || !showFor2d) { el.innerHTML = ''; return; }

        // Nothing to download until the pipeline has written the converted PDF.
        const converted = doc.ConvertedFileDirectory;

        el.innerHTML = `
            <div class="cw-sheet-group" role="group" aria-label="Drawing sheet">
                <button class="cw-sheet-btn ${this.sheet === 'original' ? 'is-active' : ''}"
                        data-sheet="original">Original</button>
                <button class="cw-sheet-btn ${this.sheet === 'converted' ? 'is-active' : ''}"
                        data-sheet="converted">Converted</button>
            </div>
            <a class="cw-sheet-dl ${converted ? '' : 'is-disabled'}"
               ${converted ? `href="${this.escape(`/upload/${converted}`)}" download` : ''}
               title="${converted
                   ? 'Download the converted PDF'
                   : 'The converted PDF is not available yet'}">Download converted</a>
        `;

        el.querySelectorAll('[data-sheet]').forEach(btn => {
            btn.addEventListener('click', () =>
                this.setSheet((btn as HTMLElement).dataset.sheet as SheetVariant));
        });
    }

    private renderInspector() {
        const p = this.part;
        // Writes into its own container: the timings panel is a sibling inside
        // .cw-inspector and must survive an inspector re-render.
        const el = this.host.querySelector('.cw-inspector-body') as HTMLElement;

        // Before the HTML underneath it is replaced. Dropping the element alone
        // would leave the widget's listeners and its lookup subscription live,
        // and every re-render would add another.
        this.materialEditor?.destroy();
        this.materialEditor = null;

        if (!p) { el.innerHTML = ''; return; }

        // *UnitCode are join expressions onto the Master*Units lookups; when
        // those are unpopulated fall back to the plain-text column on the row.
        const weight = p.WeightUnitCode ?? (p as any).WeightUnit ?? '';
        const volume = p.VolumeUnitCode ?? (p as any).VolumeUnit ?? '';
        const val = (k: string, fallback: any) =>
            this.escape(this.pendingEdits[k] ?? fallback ?? '');

        // Editable field; edits collect in pendingEdits and flush on Save.
        const field = (label: string, key: string, current: any) => `
            <label class="cw-field cw-field-edit">
                <span class="cw-field-k">${label}</span>
                <input class="cw-input" data-field="${key}" value="${val(key, current)}" />
            </label>`;

        const ro = (label: string, value: string) => `
            <div class="cw-field"><span class="cw-field-k">${label}</span>
                 <span class="cw-field-v">${value}</span></div>`;

        // What the process analysis said in WORDS, as opposed to the numbers
        // above. Omitted entirely when empty rather than shown as a blank row:
        // "the analysis had no advice" and "we never captured it" look
        // identical once you print an empty field, and they are not the same.
        const notesBlock = (label: string, text: string | null | undefined) => {
            const t = String(text ?? '').trim();
            if (!t) return '';
            const lines = t.split('\n').map(l => l.trim()).filter(Boolean);
            return `
                <div class="cw-notes">
                  <div class="cw-notes-k">${label}</div>
                  <ul class="cw-notes-list">${lines
                      .map(l => `<li>${htmlEncode(l)}</li>`).join('')}</ul>
                </div>`;
        };

        // The material the part is actually priced against, as opposed to the
        // Material text above it, which is only what the title block said.
        //
        // Just the slot here: a LookupEditor is a widget, not markup, so it is
        // constructed into this container once the HTML is in the document --
        // see mountMaterialEditor.
        const materialPicker = () => `
            <label class="cw-field cw-field-edit">
                <span class="cw-field-k">Priced as</span>
                <div class="cw-material-editor"></div>
            </label>
            <div class="cw-material-warn"></div>`;

        // The machine the price was actually calculated on. Flagged when new_tsh
        // found nothing that fits and fell back to its flat 35/45 per hour
        // defaults - a quote priced on a default is not the same claim as one
        // priced on a real machine, and this is the operator's only sight of it.
        const machineRow = () => {
            const name = (p as any).CostingMachineName as string | undefined;
            if (!name) return ro('Machine', '\u2014');
            const fellBack = /^Default rates/i.test(name);
            return `<div class="cw-field">
                <span class="cw-field-k">Machine</span>
                <span class="cw-field-v${fellBack ? ' cw-machine-default' : ''}"
                      title="${this.escape(name)}">${this.escape(name)}</span>
            </div>`;
        };

        const num = (v?: number, unit?: string) => v == null ? '\u2014' : `${v} ${unit ?? ''}`.trim();
        const diff = (a?: number, b?: number, unit?: string) =>
            (a != null && b != null) ? `${(a - b).toFixed(2)} ${unit ?? ''}`.trim() : '\u2014';

        el.innerHTML = `
            <h2 class="cw-rail-title">Part detail</h2>
            ${this.partPictureHtml(p.PartPicture)}
            ${field('Part number', 'PartNumber', p.PartNumber)}
            ${field('Revision', 'Revision', p.Revision)}
            ${field('Description', 'Description', p.Description)}
            ${field('Customer', 'CustomerName', p.CustomerName)}
            ${field('Material', 'Material', p.Material)}
            ${materialPicker()}
            ${field('Unit', 'Uom', p.Uom)}
            <div class="cw-dims">
                ${['Length', 'Width', 'Height'].map(k => `
                    <label class="cw-dim">
                        <input class="cw-input" data-field="${k}" value="${val(k, (p as any)[k])}" />
                        <span>${k}</span>
                    </label>`).join('')}
            </div>
            ${ro('Gross volume', num(p.GrossVolume, volume))}
            ${ro('Net volume', num(p.NetVolume, volume))}
            ${ro('Removed volume', diff(p.GrossVolume, p.NetVolume, volume))}
            ${ro('Gross weight', num(p.GrossWeight, weight))}
            ${ro('Net weight', num(p.NetWeight, weight))}
            ${ro('Removed weight', diff(p.GrossWeight, p.NetWeight, weight))}
            ${ro('Faces', num(p.NumberOfFace))}
            ${ro('Holes', num(p.NumberOfHole))}
            ${machineRow()}
            ${notesBlock('Process recommendations', p.ProcessRecommendations)}
            ${notesBlock('Quality control', p.QualityControlNotes)}`;

        el.querySelectorAll('input[data-field]').forEach(input => {
            input.addEventListener('change', () => {
                const i = input as HTMLInputElement;
                const key = i.getAttribute('data-field')!;
                // Dimensions are numeric columns; blank clears rather than sending "".
                const numeric = ['Length', 'Width', 'Height'].includes(key);
                this.pendingEdits[key] = numeric
                    ? (i.value.trim() === '' ? null : Number(i.value))
                    : i.value;
                this.renderHeader();
            });
        });

        this.mountMaterialEditor();
    }

    /**
     * Build the Materials picker into the slot renderInspector just laid out.
     *
     * A LookupEditor rather than a hand-rolled select: it comes with the
     * type-ahead, the clear button, the lookup fetch and the theme's styling,
     * and it stays consistent with every other Serenity lookup in the app. The
     * cost is that it is a widget, so it has to be constructed after the
     * surrounding HTML exists and torn down before that HTML is replaced.
     */
    private mountMaterialEditor() {
        const host = this.host.querySelector('.cw-material-editor') as HTMLElement;
        if (!host) return;

        this.materialEditor = new LookupEditor({
            element: el => host.appendChild(el),
            lookupKey: 'Materials',
            // So "no material" stays reachable: a part whose drawing says
            // "SEE BOM" is legitimately unpriced, and the operator has to be
            // able to put it back to that.
            allowClear: true
        });

        const current = this.chosenMaterialId();
        this.materialEditor.value = current == null ? '' : String(current);
        this.renderMaterialWarning();

        this.materialEditor.domNode.addEventListener('change', () => {
            const raw = this.materialEditor?.value;
            // MaterialID is an int column; the editor hands back '' when cleared.
            this.pendingEdits.MaterialId = raw ? Number(raw) : null;
            this.renderHeader();
            // Only the warning depends on this, and re-rendering the whole
            // inspector would destroy the editor the user is still using.
            this.renderMaterialWarning();
        });
    }

    /**
     * Says when a quote will have no material cost.
     *
     * Worth stating outright: a quote missing its material line looks like a
     * complete quote, just a cheaper one. Costing prices raw material off
     * MaterialID, and the consumer refuses to guess one from text like
     * "SEE BOM" rather than pricing the part as something it is not.
     */
    /**
     * The material currently in force: the unsaved edit if there is one, else
     * what the part carries.
     *
     * Deliberately `in` rather than `??`. Clearing the picker records
     * MaterialId: null, and `??` treats that as "no edit" and falls back to the
     * stored id -- so clearing a material left the warning hidden and the
     * picker re-showing the old value on the next render, even though the save
     * itself was correct.
     */
    private chosenMaterialId(): number | null | undefined {
        return 'MaterialId' in this.pendingEdits
            ? this.pendingEdits.MaterialId
            : this.part?.MaterialId;
    }

    private renderMaterialWarning() {
        const el = this.host.querySelector('.cw-material-warn') as HTMLElement;
        if (!el) return;

        const chosen = this.chosenMaterialId();
        el.innerHTML = chosen
            ? ''
            : `<p class="cw-warn cw-warn-block">
                   No material set, so this quote has no material cost &mdash;
                   only machining. Pick one above if the drawing does not name it
                   (&ldquo;SEE BOM&rdquo;), then re-run costing.
               </p>`;
    }

    /**
     * The part picture slot. Always rendered, even when there is no picture, so
     * the panel keeps a stable shape and it is obvious that a picture is
     * something this part can have — the field is populated by the conversion
     * pipeline, so an empty slot usually means it has not run yet.
     */
    private partPictureHtml(picture?: string): string {
        if (!picture) {
            return `<div class="cw-part-image is-empty">
                        <span>No part picture</span>
                    </div>`;
        }
        const src = `/upload/${this.escape(picture)}`;
        return `<a class="cw-part-image" href="${src}" target="_blank" rel="noopener noreferrer"
                   title="Open the full-size picture">
                    <img src="${src}" alt="Part picture" />
                </a>`;
    }

    // -- Tray: costing, BOM, special process ------------------------------

    private renderTray() {
        const el = this.host.querySelector('.cw-tray') as HTMLElement;

        const railBalloon = this.host.querySelector('.cw-rail-balloon') as HTMLElement;

        // In balloon mode the editor's two panels move OUT of the tray and into
        // the rail, stacked. They used to sit across the bottom, which cost the
        // drawing a full tray's height on a stage that is already the tightest
        // thing on the page - and a balloon list is a tall narrow thing anyway,
        // so a column suits it better than a strip.
        // The property editor gets its own column on the LEFT of the drawing,
        // the list stays on the right: the two are used together, and stacked
        // in one column each squeezed the other.
        const editor = this.host.querySelector('.cw-balloon-editor') as HTMLElement;
        if (this.mode === 'balloon' && this.ballooning) {
            el.innerHTML = '';
            railBalloon.innerHTML = `
                <h2 class="cw-rail-title">Balloons</h2>
                <div class="cw-balloon-table"></div>`;
            editor.innerHTML = `<div class="cw-balloon-props"></div>`;
            this.ballooning.attachPanels(
                railBalloon.querySelector('.cw-balloon-table') as HTMLElement,
                editor.querySelector('.cw-balloon-props') as HTMLElement);
            return;
        }
        // Leaving anything here would keep the rail's balloon column open in
        // costing mode, where :empty is what hides it.
        railBalloon.innerHTML = '';
        editor.innerHTML = '';

        const tab = (key: string, label: string, count: number) => `
            <button class="cw-traytab ${this.trayTab === key ? 'is-active' : ''}" data-tab="${key}">
                ${label} <span class="cw-count">${count}</span>
            </button>`;

        el.innerHTML = `
            <div class="cw-traytabs">
                ${tab('costing', 'Costing', this.costing.length)}
                ${tab('bom', 'BOM', this.bom.length)}
                ${tab('process', 'Special process', this.specialProcess.length)}
            </div>
            <div class="cw-traybody">${this.renderTrayBody()}</div>`;

        el.querySelectorAll('[data-tab]').forEach(b => {
            b.addEventListener('click', () => {
                this.trayTab = (b as HTMLElement).dataset.tab as any;
                this.pickerLineId = null;
                this.renderTray();
            });
        });

        // The cell stays here; what it opens is rendered in the rail.
        el.querySelectorAll('.cw-machine-pick').forEach(b => {
            b.addEventListener('click', () => {
                const id = Number((b as HTMLElement).dataset.line);
                // Clicking the open line's cell again closes it.
                this.pickerLineId = this.pickerLineId === id ? null : id;
                this.paintPickedLine();
                this.renderRailMachines();
            });
        });

        this.paintPickedLine();
    }

    /** Marks which line's picker is open, so the cell and the rail agree. */
    private paintPickedLine() {
        this.host.querySelectorAll('.cw-machine-pick').forEach(b =>
            b.classList.toggle('is-open',
                Number((b as HTMLElement).dataset.line) === this.pickerLineId));
    }

    /**
     * Move one process onto another machine and re-price it.
     *
     * Persisted, not a preview: the point is to correct a quote whose machine
     * was chosen badly, and a correction that vanishes on refresh is not one.
     * The server records it as a user choice so a later re-cost can tell it
     * apart from the pipeline's own pick.
     */
    private applyMachine(lineId: number, machineId: number, button: HTMLButtonElement) {
        button.disabled = true;
        CostingPartMachineOptionsService.Apply(
            {CostingPartCostingResultId: lineId, MachineId: machineId},
            response => {
                notifySuccess(response.Message ?? 'Machine changed.');
                this.pickerLineId = null;
                // Re-read rather than patching in place: the line's machine,
                // rate, total, the part total and every option's "current"
                // marker all move together.
                this.loadResults();
            },
            {
                onError: response => {
                    button.disabled = false;
                    notifyError(response?.Error?.Message ?? 'Could not change the machine.');
                    return true;
                }
            });
    }

    /**
     * The machine a cost line was priced on.
     *
     * Blank rather than a dash for material and special-process lines: those
     * are not machine time, so an em dash would read as "machine unknown" when
     * the truth is "no machine applies". A dash is reserved for a machining
     * line that genuinely has no machine recorded, which is worth noticing.
     */
    /** True when new_tsh found no machine and fell back to its default rates. */
    private isDefaultRate(name?: string): boolean {
        return /^Default rates/i.test(name ?? '');
    }

    /**
     * What to call a machine on screen.
     *
     * Prefers dbo.Machines.Name. MachineName is new_tsh's composite label --
     * "MAKINO A61NX-5XR 3-axis 720x650x800" -- which packs the axis count and
     * the envelope into the name and is unreadable in a cell. It stays the
     * fallback, because it is the only name available when no machine matched.
     */
    private machineLabel(line: CostingPartCostingResultsRow): string {
        return line?.MachineRealName || line?.MachineName || '';
    }

    private machineCell(line: CostingPartCostingResultsRow): string {
        const label = this.machineLabel(line);
        if (!label) return '';
        if (this.isDefaultRate(line.MachineName))
            return `<span class="cw-machine-default" title="${this.escape(line.MachineName!)}">
                        ${this.escape(label)}</span>`;

        // The thumbnail is the fast way to tell two lines apart on a turn-mill
        // part, where the only difference is which machine cut them. The full
        // new_tsh label stays on the tooltip rather than in the cell.
        const pic = line.MachinePicture
            ? `<img class="cw-machine-thumb" src="/upload/${this.escape(line.MachinePicture)}" alt="" />`
            : '';
        // Clickable: the pipeline's choice is not reliable enough to be the
        // final word, so every machining line offers the alternatives.
        const alternatives = this.optionsFor(line.Id).length;
        return `<button type="button" class="cw-machine-name cw-machine-pick"
                        data-line="${line.Id}"
                        title="${this.escape(line.MachineName ?? label)} — click to change">
                    ${pic}<span>${this.escape(label)}</span>
                    ${alternatives > 1 ? `<i class="cw-machine-alt">${alternatives}</i>` : ''}
                </button>`;
    }

    /** Candidate machines for one cost line, cheapest first. */
    private optionsFor(lineId?: number): CostingPartMachineOptionsRow[] {
        if (lineId == null) return [];
        return this.machineOptions
            .filter(o => o.CostingPartCostingResultId === lineId)
            .sort((a, b) => (a.HourlyRate ?? 0) - (b.HourlyRate ?? 0));
    }

    /**
     * The distinct machines this part was costed on, with the lines each priced.
     *
     * Grouped by machine rather than listed per line because a turn-mill part
     * has two machines across four or five rows, and repeating the same
     * specifications on every row buries the one fact worth reading: which two
     * machines, and do they actually suit the part.
     *
     * Keyed by id, falling back to the name so the "no machine matched" case
     * still gets a card -- that case is the one most worth surfacing, because
     * a quote priced on default rates means nothing in the shop could make it.
     */
    private machinesUsed(): (CostingPartCostingResultsRow & { lines: string[] })[] {
        const byKey = new Map<string, CostingPartCostingResultsRow & { lines: string[] }>();
        for (const line of this.costing) {
            if (!line.MachineName) continue;
            const key = String(line.MachineId ?? line.MachineName);
            if (!byKey.has(key))
                byKey.set(key, {...line, lines: []});
            byKey.get(key)!.lines.push(line.Name ?? '');
        }
        return [...byKey.values()];
    }

    /**
     * A card per machine: picture, name, and the specifications that explain
     * why this machine and not another.
     */
    private renderMachinesUsed(): string {
        const machines = this.machinesUsed();
        if (!machines.length) return '';

        const num = (v: any, unit = '') =>
            v == null ? null : `${v}${unit ? ' ' + unit : ''}`;

        return `<div class="cw-machines">
            ${machines.map(m => {
                if (this.isDefaultRate(m.MachineName)) {
                    return `<div class="cw-machine-card is-default">
                        <div class="cw-machine-card-body">
                            <div class="cw-machine-card-name">${this.escape(m.MachineName)}</div>
                            <p class="cw-machine-note">
                                No machine in the catalogue fits this part, so it was
                                priced at fallback rates. Treat the total as indicative
                                until a machine is confirmed.
                            </p>
                            <div class="cw-machine-lines">${this.escape(m.lines.join(', '))}</div>
                        </div>
                    </div>`;
                }

                // Trailing zeros on a decimal column make "720.0000 mm" out of
                // 720; the numbers are the point of this card, so they are
                // trimmed rather than shown as the database stores them.
                const n = (v: any) => v == null ? null : String(Number(v));
                const envelope = [m.MachineWorkEnvelopeX, m.MachineWorkEnvelopeY,
                                  m.MachineWorkEnvelopeZ].every(v => v != null)
                    ? `${n(m.MachineWorkEnvelopeX)} × ${n(m.MachineWorkEnvelopeY)} × ${n(m.MachineWorkEnvelopeZ)} mm`
                    : null;

                const specs: [string, string | null][] = [
                    ['Axes', n(m.MachineAxisNumber)],
                    ['Work envelope', envelope],
                    ['Precision', m.MachinePrecision == null ? null : `${n(m.MachinePrecision)} mm`],
                    ['Max weight', m.MachineWeightLimit == null ? null : `${n(m.MachineWeightLimit)} kg`],
                    ['Rate', m.MachineCost == null ? null
                        : `${n(m.MachineCost)} ${this.currencyCode() || ''}/h`.replace('  ', ' ')]
                ];

                const pic = m.MachinePicture
                    ? `<a class="cw-machine-pic" href="/upload/${this.escape(m.MachinePicture)}"
                          target="_blank" rel="noopener noreferrer" title="Open the full-size picture">
                           <img src="/upload/${this.escape(m.MachinePicture)}" alt="" /></a>`
                    : `<div class="cw-machine-pic is-empty"><span>No picture</span></div>`;

                return `<div class="cw-machine-card">
                    ${pic}
                    <div class="cw-machine-card-body">
                        <div class="cw-machine-card-name"
                             title="${this.escape(m.MachineName ?? '')}">${this.escape(this.machineLabel(m))}</div>
                        ${m.MachineDescription
                            ? `<div class="cw-machine-desc">${this.escape(m.MachineDescription)}</div>` : ''}
                        <dl class="cw-machine-specs">
                            ${specs.filter(([, v]) => v != null).map(([k, v]) => `
                                <dt>${this.escape(k)}</dt><dd>${this.escape(v!)}</dd>`).join('')}
                        </dl>
                        <div class="cw-machine-lines">
                            Priced: ${this.escape(m.lines.join(', '))}
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    }

    /**
     * The alternatives for one process, with what each would cost.
     *
     * Sorted cheapest first and showing the difference against what is
     * currently applied, because the question being asked is "what would
     * another machine do to this price", not "list the machines".
     */
    private renderMachinePicker(): string {
        if (this.pickerLineId == null) return '';
        const options = this.optionsFor(this.pickerLineId);
        const line = this.costing.find(c => c.Id === this.pickerLineId);
        if (!options.length || !line)
            return `<div class="cw-picker"><div class="cw-picker-head">
                        <span>No alternative machines fit this part</span>
                        <button type="button" class="cw-picker-close">&times;</button>
                    </div></div>`;

        const current = Number(line.Total ?? 0);
        const hours = Number(line.Quantity ?? 0);
        const n = (v: any) => v == null ? '' : String(Number(v));

        return `<div class="cw-picker">
            <div class="cw-picker-head">
                <span>${this.escape(line.Name ?? '')} &mdash; ${hours} h on:</span>
                <button type="button" class="cw-picker-close" title="Close">&times;</button>
            </div>
            <div class="cw-picker-list">
                ${options.map(o => {
                    const total = Number(o.LineTotal ?? 0);
                    const delta = total - current;
                    const selected = o.IsSelected === 1;
                    const env = [o.MachineWorkEnvelopeX, o.MachineWorkEnvelopeY, o.MachineWorkEnvelopeZ]
                        .every(v => v != null)
                        ? `${n(o.MachineWorkEnvelopeX)}×${n(o.MachineWorkEnvelopeY)}×${n(o.MachineWorkEnvelopeZ)}`
                        : '';
                    return `
                    <button type="button" class="cw-pick ${selected ? 'is-current' : ''}"
                            data-line="${this.pickerLineId}" data-machine="${o.MachineId}"
                            ${selected ? 'disabled' : ''}>
                        ${o.MachinePicture
                            ? `<img src="/upload/${this.escape(o.MachinePicture)}" alt="" />`
                            : `<span class="cw-pick-nopic"></span>`}
                        <span class="cw-pick-body">
                            <span class="cw-pick-name">${this.escape(o.MachineName ?? '')}
                                ${o.IsRecommended === 1 ? '<i class="cw-pick-tag">suggested</i>' : ''}
                                ${o.FitsWeight === 0 ? '<i class="cw-pick-warn">over weight limit</i>' : ''}
                            </span>
                            <span class="cw-pick-spec">${n(o.MachineAxisNumber)}-axis${env ? ' · ' + env + ' mm' : ''}</span>
                        </span>
                        <span class="cw-pick-money">
                            <span class="cw-pick-rate">${n(o.HourlyRate)}/h</span>
                            <span class="cw-pick-total">${total.toFixed(2)}</span>
                            ${selected ? '<span class="cw-pick-delta is-current">current</span>'
                                : `<span class="cw-pick-delta ${delta < 0 ? 'is-down' : delta > 0 ? 'is-up' : ''}">
                                       ${delta === 0 ? '&plusmn;0' : (delta > 0 ? '+' : '') + delta.toFixed(2)}
                                   </span>`}
                        </span>
                    </button>`;
                }).join('')}
            </div>
        </div>`;
    }

    private renderTrayBody(): string {
        const e = (v: any) => this.escape(v == null ? '' : String(v));
        const empty = (what: string) => `<p class="cw-placeholder">No ${what} for this part yet.</p>`;

        if (this.trayTab === 'costing') {
            if (!this.costing.length) return empty('costing lines');
            // The machine cards and the picker live in the left rail; this tab
            // keeps only the per-line cell that opens them.
            return `<table class="cw-table">
                <thead><tr>
                    <th>#</th><th>Category</th><th>Name</th><th>Description</th>
                    <th>Machine</th>
                    <th class="num">Qty</th><th class="num">Unit price</th>
                    <th class="num">Total</th><th>Currency</th>
                </tr></thead>
                <tbody>${this.costing.map((c, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${e(c.CostingCategoryId)}</td>
                        <td>${e(c.Name)}</td>
                        <td>${e(c.Description)}</td>
                        <td class="cw-machine">${this.machineCell(c)}</td>
                        <td class="num">${e(c.Quantity)}${c.DimensionUnitCode ? ' ' + e(c.DimensionUnitCode) : ''}</td>
                        <td class="num">${e(c.UnitPrice)}</td>
                        <td class="num">${e(c.Total)}</td>
                        <td>${e(c.CurrencyCode)}</td>
                    </tr>`).join('')}</tbody>
                <tfoot><tr>
                    <td colspan="7" class="num">Total</td>
                    <td class="num total">${this.costingTotal().toFixed(2)}</td>
                    <td class="total">${e(this.currencyCode())}</td>
                </tr></tfoot>
            </table>`;
        }

        if (this.trayTab === 'bom') {
            if (!this.bom.length) return empty('BOM lines');
            return `<table class="cw-table">
                <thead><tr><th>#</th><th>Part number</th><th>Description</th>
                    <th class="num">Qty</th><th>TC Eng No</th></tr></thead>
                <tbody>${this.bom.map((b, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${e(b.PartNumber)}</td>
                        <td>${e(b.Description)}</td>
                        <td class="num">${e(b.Quantity)}</td>
                        <td>${e(b.InternalEngineeringNumber)}</td>
                    </tr>`).join('')}</tbody>
            </table>`;
        }

        if (!this.specialProcess.length) return empty('special processes');
        return `<table class="cw-table">
            <thead><tr><th>#</th><th>Process</th></tr></thead>
            <tbody>${this.specialProcess.map((sp, i) => `
                <tr><td>${i + 1}</td><td>${e(sp.SpecialProcessName)}</td></tr>`).join('')}</tbody>
        </table>`;
    }

    private escape(s: string): string {
        return String(s ?? '').replace(/[&<>"']/g, c =>
            ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]!));
    }
}
