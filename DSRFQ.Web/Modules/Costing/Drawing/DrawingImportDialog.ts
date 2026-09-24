import {
    confirmDialog,
    Decorators,
    isEmptyOrNull,
    notifyError,
    notifySuccess,
    PropertyDialog,
    serviceRequest
} from "@serenity-is/corelib";
import {DrawingImportForm} from "./DrawingImportForm";
import {DrawingImportCss} from "./DrawingImportCss";
import {CostingPartsService} from "../../ServerTypes/Costing/CostingPartsService";
import {CostingPartDocumentsService} from "../../ServerTypes/Costing/CostingPartDocumentsService";
import {fetchServiceHealth, HealthStage, STATE_TEXT} from "../ServiceHealth/ServiceHealthClient";

type ProcessingMode = 'serial' | 'parallel';

interface ModeChoice {
    mode: ProcessingMode;
    title: string;
    tag: string;
    summary: string;
    pros: string[];
    cons: string[];
}

/**
 * What the two modes actually mean for the person uploading, in their terms.
 *
 * A part fans out to three recognition services, each of which rasterises the
 * whole drawing and runs detection models over it. Whether that should overlap
 * depends on the machine, so the choice is offered rather than assumed.
 */
const MODE_CHOICES: ModeChoice[] = [
    {
        mode: 'serial',
        title: 'One step at a time',
        tag: 'Recommended',
        summary: 'Each stage finishes before the next begins.',
        pros: [
            'Far less likely to fail on a large or multi-page drawing',
            'Leaves memory for the database and other users',
            'A failure points at one stage, so it is easy to see what broke'
        ],
        cons: [
            'Slower overall — stages cannot overlap'
        ]
    },
    {
        mode: 'parallel',
        title: 'All at once',
        tag: 'Fastest',
        summary: 'Recognition stages run at the same time.',
        pros: [
            'Finishes sooner when the machine is otherwise idle',
            'Good for small, single-page drawings'
        ],
        cons: [
            'Several stages hold the whole drawing in memory together',
            'On a busy machine this can exhaust memory and fail the part',
            'Per-stage timings mostly measure contention, not the work'
        ]
    }
];

type Stage = 'drawing' | 'costing' | 'ballooning';

/**
 * The three things an upload can set off, in the order they run.
 *
 * All ticked is the old behaviour and stays the default. Untick what this
 * upload does not need: a drawing sent only to be ballooned should not sit
 * through costing, which on a part with no 3D model fails after minutes of
 * waiting for an analysis that never starts.
 */
const STAGE_CHOICES: { stage: Stage; title: string; detail: string }[] = [
    {
        stage: 'drawing',
        title: 'Drawing',
        detail: 'Convert the drawing, read its title block, notes and parts list.'
    },
    {
        stage: 'costing',
        title: 'Costing',
        detail: 'Price the part. Needs a 3D model (STEP/STP); without one it fails.'
    },
    {
        stage: 'ballooning',
        title: 'Ballooning',
        detail: 'Find the dimensions and number them on the drawing.'
    }
];

@Decorators.registerClass('DSRFQ.Drawing.DrawingImportDialog')
export class DrawingImportDialog extends PropertyDialog<any, any> {

    private form: DrawingImportForm;
    /** Mirrors the consumer's own default, so the dialog agrees with it. */
    private processingMode: ProcessingMode = 'serial';
    /** Every stage, as before this choice existed. */
    private stages = new Set<Stage>(['drawing', 'costing', 'ballooning']);
    /** Latest readiness per stage from the server, or null while unknown. */
    private health: HealthStage[] | null = null;
    private healthTimer: any;
    /** The operator already agreed to upload while a service was down. */
    private confirmedDown = false;

    /**
     * Called once the parts and their documents exist, before the dialog closes.
     *
     * The grid used to refresh on the element's `dialogclose` event, which is a
     * jQuery-UI-era hook that a Bootstrap modal never raises -- so the new rows
     * only appeared if you refreshed by hand. Firing an explicit callback at the
     * point the rows are known to exist does not depend on which dialog
     * implementation is in play.
     */
    public onUploaded: () => void;

    protected getFormKey() { return DrawingImportForm.formKey; }

    constructor() {
        super();
        let th = this
        this.form = new DrawingImportForm(this.idPrefix);
        this.renderModeChooser();
    }

    /** Append the mode chooser below the file picker. */
    private renderModeChooser() {
        if (!document.getElementById('dsrfq-drawing-import-css'))
            document.head.insertAdjacentHTML('beforeend', DrawingImportCss());

        const host = this.propertyGrid?.domNode
            ?? this.domNode.querySelector('.s-Form') as HTMLElement | null;
        if (!host) return;

        const wrap = document.createElement('div');
        wrap.className = 'di-modes';
        wrap.innerHTML = `
            <div class="di-modes-title">How should these drawings be processed?</div>
            <div class="di-mode-grid">
                ${MODE_CHOICES.map(choice => `
                <label class="di-mode ${choice.mode === this.processingMode ? 'is-selected' : ''}"
                       data-mode="${choice.mode}">
                    <input type="radio" name="${this.idPrefix}ProcessingMode"
                           value="${choice.mode}"
                           ${choice.mode === this.processingMode ? 'checked' : ''} />
                    <span class="di-mode-head">
                        ${choice.title}
                        <span class="di-mode-tag">${choice.tag}</span>
                    </span>
                    <div class="di-mode-sub">${choice.summary}</div>
                    <ul class="di-points">
                        ${choice.pros.map(p =>
                            `<li class="di-pro"><span class="di-mark">+</span><span>${p}</span></li>`).join('')}
                        ${choice.cons.map(c =>
                            `<li class="di-con"><span class="di-mark">!</span><span>${c}</span></li>`).join('')}
                    </ul>
                </label>`).join('')}
            </div>
            <div class="di-note">
                Not sure? Keep <b>one step at a time</b>. It is slower but much
                harder to fail; you can re-run a part in the other mode later.
            </div>`;

        host.after(wrap);
        this.renderStageChooser(wrap);

        wrap.querySelectorAll<HTMLInputElement>('input[type=radio]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.processingMode = radio.value as ProcessingMode;
                wrap.querySelectorAll('.di-mode').forEach(card =>
                    card.classList.toggle('is-selected',
                        (card as HTMLElement).dataset.mode === this.processingMode));
            });
        });
    }

    /**
     * The stage tick boxes, above the mode chooser.
     *
     * Ticking nothing would upload drawings that never get looked at, so the
     * last box cannot be unticked - the Import button says what will run.
     */
    private renderStageChooser(after: HTMLElement) {
        const wrap = document.createElement('div');
        wrap.className = 'di-stages';
        wrap.innerHTML = `
            <div class="di-modes-title">What should run after the upload?</div>
            <div class="di-stage-list">
                ${STAGE_CHOICES.map(s => `
                <label class="di-stage is-on" data-stage="${s.stage}">
                    <input type="checkbox" value="${s.stage}" checked />
                    <span class="di-stage-text">
                        <b>${s.title}</b>
                        <small>${s.detail}</small>
                    </span>
                    <span class="di-stage-health" data-state="unknown" aria-live="polite">
                        <span class="di-health-icon">○</span><span class="di-health-text">Checking…</span>
                    </span>
                </label>`).join('')}
            </div>
            <div class="di-note di-stage-note">All three run by default. Untick what this
                upload does not need - a stage you skip can still be run later from the grid.
                <a href="/Costing/ServiceStatus" target="_blank" rel="noopener">Service status</a></div>`;
        after.before(wrap);

        // Live while the dialog is open: a service started in the control
        // panel shows up here without reopening the dialog.
        const check = () => fetchServiceHealth(true)
            .then(r => { this.health = r.Stages; this.paintHealth(wrap); })
            .catch(() => { this.health = null; this.paintHealth(wrap); });
        check();
        this.healthTimer = setInterval(() => {
            if (!wrap.isConnected) { clearInterval(this.healthTimer); return; }
            check();
        }, 10000);

        wrap.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach(box => {
            box.addEventListener('change', () => {
                const stage = box.value as Stage;
                if (box.checked)
                    this.stages.add(stage);
                else if (this.stages.size > 1)
                    this.stages.delete(stage);
                else
                    box.checked = true;     // the last one stays on
                box.closest('.di-stage')?.classList.toggle('is-on', box.checked);
                this.updateImportButton();
            });
        });
        this.updateImportButton();
    }

    /** Show next to each stage whether the services it needs are running. */
    private paintHealth(wrap: HTMLElement) {
        wrap.querySelectorAll<HTMLElement>('.di-stage').forEach(label => {
            const stage = label.dataset.stage as Stage;
            const slot = label.querySelector('.di-stage-health') as HTMLElement;
            const info = this.health?.find(h => h.Stage === stage);
            const state = info?.State ?? 'unknown';
            const text = !this.health ? 'Status unavailable'
                : state === 'blocked' ? `Not running: ${info.Blocking.join(', ')}. The job will wait in the queue.`
                : state === 'degraded' ? `Runs without ${info.Degrading.join(', ')}`
                : STATE_TEXT[state]?.label ?? 'Checking…';
            slot.dataset.state = state;
            (slot.querySelector('.di-health-icon') as HTMLElement).textContent = STATE_TEXT[state]?.icon ?? '○';
            (slot.querySelector('.di-health-text') as HTMLElement).textContent = text;
            slot.title = text;
        });
    }

    /** Ticked stages whose required services are down right now. */
    private blockedTickedStages(): HealthStage[] {
        return (this.health ?? []).filter(h => h.State === 'blocked' && this.stages.has(h.Stage as Stage));
    }

    /** Say on the button what the Import will actually set off. */
    private updateImportButton() {
        // The dialog's buttons are plain Bootstrap buttons in the modal footer
        // with no distinguishing class, so it is found by its own text - which
        // is why the "Import" prefix below never changes.
        const modal = this.domNode?.closest('.modal') ?? this.domNode?.ownerDocument?.body;
        const button = [...(modal?.querySelectorAll('.modal-footer button, button') ?? [])]
            .find(b => (b.textContent || '').trim().startsWith('Import')) as HTMLElement;
        if (!button)
            return;
        const picked = STAGE_CHOICES.filter(s => this.stages.has(s.stage)).map(s => s.title);
        button.textContent = picked.length === STAGE_CHOICES.length
            ? 'Import'
            : `Import (${picked.join(' + ')})`;
    }

    protected getDialogTitle(): string {
        return "Upload Drawing";
    }

    protected getDialogButtons() {
        let th = this
        return [
            {
                text: 'Import',
                click: () => {
                    if (!this.validateBeforeSave())
                        return;

                    if (this.form.FileName.value.length==0 ) {
                        notifyError("Please at least upload a file!");
                        return;
                    }

                    // A ticked stage whose service is down would sit Pending
                    // with no explanation. Say so and let the operator decide:
                    // the job is safe in the queue and starts once it is back.
                    const blocked = th.blockedTickedStages();
                    if (blocked.length && !th.confirmedDown) {
                        const lines = blocked.map(b =>
                            `${b.Stage[0].toUpperCase() + b.Stage.slice(1)}: ${b.Blocking.join(', ')} not running`);
                        confirmDialog(
                            `${lines.join('\n')}\n\nUpload anyway? These stages will wait in the queue and ` +
                            `start automatically when the service is running again.`,
                            () => {
                                th.confirmedDown = true;
                                (th.domNode.closest('.modal')?.querySelector('.modal-footer button') as HTMLElement)?.click();
                            });
                        return;
                    }
                    let files  =this.form.FileName.value
                    CostingPartsService.Create({
                        Entity:{
                            // Travels with the part so the consumer honours the
                            // choice made here rather than its global default.
                            ProcessingMode: th.processingMode,
                            // In pipeline order, so the consumer and the grid
                            // read the same list the operator ticked.
                            RequestedStages: STAGE_CHOICES
                                .filter(s => th.stages.has(s.stage))
                                .map(s => s.stage).join(',')
                        }
                    },async response=>{
                        for(let i =0;i<files.length;i++){
                            const ext = files[i].OriginalName.split('.').pop().toLowerCase();

                            const twoD = ["pdf", "svg", "png", "jpg", "jpeg", "tiff", "bmp"];
                            const threeD = ["stl", "step", "stp", "iges", "igs", "obj", "fbx", "gltf", "glb", "3mf"];
                            let type = 1
                            if (twoD.includes(ext)){
                                type = 1
                            }
                            if (threeD.includes(ext)) {
                                type = 2
                            }

                            if (["dwg", "dxf"].includes(ext)){
                                type = 3
                            } 
                             await CostingPartDocumentsService.Create({
                                Entity:{
                                    CostingPartId:response.EntityId,
                                    FileDirectory:files[i].Filename,
                                    FileName:files[i].OriginalName,
                                    Type: type
                                }
                            })
                        }
                        let data = {
                            Message : response.EntityId.toString(),
                        }
                        serviceRequest(
                            "/UploadDrawing",
                            data,
                            response => {

                            },
                            {
                                onError: (error) => {
                                    notifyError("Error uploading drawing: " + error.message);
                                }
                            }
                        );
                        // The rows and their documents exist by this point --
                        // Create returned the id and every document awaited --
                        // so the grid has something to show. /UploadDrawing is
                        // fire-and-forget; the pipeline statuses it drives
                        // arrive later over MQTT, on the rows we are about to
                        // display.
                        notifySuccess("The drawings have been uploaded.");
                        th.onUploaded?.();
                        th.dialogClose();
                    })
                    
                    
                },
            },
            {
                text: 'Cancel',
                click: () => this.dialogClose()
            }
        ];
    }
}