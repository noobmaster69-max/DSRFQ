import {Decorators, EntityGrid, htmlEncode, indexOf, notifyError, notifySuccess, SettingStorage, ToolButton} from '@serenity-is/corelib';
import { CostingPartsColumns, CostingPartsRow, CostingPartsService, RerunStage } from '../../ServerTypes/Costing';
import { CostingPartsDialog } from './CostingPartsDialog';
import {DrawingImportDialog} from "../Drawing/DrawingImportDialog";
import {Column, GridOptions} from "@serenity-is/sleekgrid";
import {CardViewMixin} from "@serenity-is/pro.extensions";
import mqtt from "mqtt"

// Side-effect import. CostingPartsColumns declares [InlineImageFormatter] and
// the columns script names the formatter as a string, so the class has to be
// in this page's bundle for Serenity to resolve it; nothing here references
// it directly, hence the bare import.
import "@/Common/Formatters/InlineImageFormatter";

/**
 * A stage the operator can put a part back through, and how to read whether
 * that stage is currently busy.
 */
interface RerunAction {
    stage: RerunStage;
    /** Button text. The column is 150px wide, so this has to stay one word. */
    short: string;
    /** Full name, used in the confirm prompt and the tooltip. */
    label: string;
    icon: string;
    /**
     * Every status this stage owns. Drawing has two because one run does the
     * conversion and the OCR, so either being in flight means a re-run would
     * collide with work already queued.
     */
    statusFields: string[];
    hint: string;
}

/**
 * The stages a user can re-run from the grid.
 *
 * Drawing conversion and OCR are one entry, not two: the consumer converts the
 * drawing and writes the recognised fields from a single queue message, so
 * separate buttons would be two controls doing identical work.
 */
const RERUN_ACTIONS: RerunAction[] = [
    {
        stage: RerunStage.Drawing,
        short: 'Drawing',
        label: 'Drawing conversion + OCR',
        icon: 'fa-file-image-o',
        statusFields: ['DrawingConversionStatusName', 'OcrStatusName'],
        hint: 'Convert the drawing again and re-read its title block. ' +
              'Replaces the converted pages; fields you typed by hand are kept.'
    },
    {
        stage: RerunStage.Costing,
        short: 'Costing',
        label: 'Costing',
        icon: 'fa-calculator',
        statusFields: ['CostingStatusName'],
        hint: 'Recalculate the cost. Clears the previous cost lines first.'
    },
    {
        stage: RerunStage.Ballooning,
        short: 'Balloon',
        label: 'Ballooning',
        icon: 'fa-dot-circle-o',
        statusFields: ['BalloonStatusName'],
        hint: 'Detect balloons again. Clears the previous balloons first.'
    }
];

/**
 * What the operator needs to know before clicking: is this stage busy, did it
 * fail, has it already produced something a re-run would throw away.
 */
type StageState = 'idle' | 'running' | 'done' | 'failed';

/** Status names from MasterCostingStatus that mean the stage did not finish. */
const FAILED_STATUSES = ['Failed', 'Upload Failed'];

function stageState(item: any, action: RerunAction): StageState {
    const values = action.statusFields.map(f => item?.[f]);

    // Order matters: a stage that failed and was requeued is busy, not failed,
    // and "done" only counts when every status it owns is done.
    if (values.some(v => v === 'In Progress'))
        return 'running';
    if (values.some(v => FAILED_STATUSES.includes(v)))
        return 'failed';
    if (values.every(v => v === 'Completed'))
        return 'done';
    return 'idle';
}

/** Tooltip text; says why the button is dead rather than just greying it out. */
function stageHint(action: RerunAction, state: StageState): string {
    switch (state) {
        case 'running': return `${action.label} is already running`;
        case 'failed': return `${action.label} failed. ${action.hint}`;
        case 'done': return `${action.label} finished. ${action.hint}`;
        default: return action.hint;
    }
}
@Decorators.registerClass('DSRFQ.Costing.CostingPartsGrid')
export class CostingPartsGrid extends EntityGrid<CostingPartsRow> {
    protected getColumnsKey() { return CostingPartsColumns.columnsKey; }
    protected getDialogType() { return CostingPartsDialog; }
    protected getRowDefinition() { return CostingPartsRow; }
    protected getService() { return CostingPartsService.baseUrl; }
    protected getPersistanceStorage(): SettingStorage {
        return window.localStorage;
    }

    /**
     * Pending per-row re-reads, keyed by part id.
     *
     * The consumer publishes several messages per stage (ballooning sends one
     * per page), and only the last of a burst is worth acting on, so each new
     * message for a part cancels the previous timer.
     */
    private rowRefreshTimers = new Map<number, any>();
    private cardView: CardViewMixin<CostingPartsRow>;
    private cardRedrawTimer: any;
    private pollTimer: any;

    protected afterInit() {
        super.afterInit();

        // Cards, not rows. Eleven columns meant scrolling sideways to answer
        // "what happened to this part"; a card puts the identity, the four
        // pipeline stages and the actions in one block that can be read at a
        // glance. CardViewMixin does the layout - a responsive wall of cards
        // over the same RemoteView - so the search box, the filters, sorting,
        // paging and the progress-driven row refresh all keep working, and the
        // operator can switch back to the table whenever a column is wanted.
        this.cardView = new CardViewMixin({
            grid: this,
            viewType: 'card',
            renderItem: (item: any) => this.cardHtml(item),
        });
        this.cardView.switchView('card', true);

        // CardViewMixin renders outside the grid's canvas, so SlickGrid's
        // onClick never sees these buttons - without this every action on a
        // card is dead. Delegated on the grid root because the cards are
        // rebuilt on every refresh, and matched by the id written onto the
        // card rather than a row index, which card view does not have.
        this.element[0]?.addEventListener('click', (e: MouseEvent) => {
            const target = (e.target as HTMLElement)?.closest('.inline-action') as HTMLElement;
            if (!target) return;
            const card = target.closest('.cp-card') as HTMLElement;
            if (!card) return;               // table view; onClick handles it

            e.preventDefault();
            e.stopPropagation();
            const id = Number(card.getAttribute('data-cp-id'));
            const item = this.view?.getItemById(id);
            if (item) this.runAction(item, target);
        });

        let th = this
        // The page's own host, not localhost - see BallooningWidget.
        const client = mqtt.connect(`ws://${location.hostname}:15675/ws`,{
            username:"guest",
            password:"guest",
        })

        client.on("connect", () => {
            console.log("Connected to RabbitMQ Web Mqtt")
            client.subscribe("Progress",err=>{
                if(!err){
                    console.log("Subscribed to Progress")
                }
            })
        })

        client.on("message", (topic, message) => {
            let msg: any;
            try {
                msg = JSON.parse(message.toString());
            } catch {
                return;                     // not ours; ignore rather than throw
            }
            const id = Number(msg["Id"]);
            if (!id)
                return;

            // The text lands immediately -- it is the live part of the row and
            // the payload already carries it.
            const item = th.view.getItemById(id);
            if (!item)
                return;                     // another page, or a filtered-out row
            item.Message = msg["Message"];
            th.view.updateItem(id, item);
            th.scheduleCardRedraw();

            // The statuses, the Run buttons and the document list all move when
            // a stage starts or finishes, and none of that is in the payload --
            // it is written to the database by the consumer. Re-read just this
            // row so the operator does not have to hit refresh to see a stage
            // go from In Progress to Completed.
            th.queueRowRefresh(id);
        })

        // Backstop for the live messages. A browser that cannot reach 15675 (a
        // firewall that only opens it to one network, a proxy), a message sent
        // before the stage's final status write, or a stage the dispatcher
        // moves without publishing anything - each left a card at In Progress
        // until someone pressed refresh. While any visible part still has a
        // stage in flight, re-read just those rows on a slow timer.
        this.pollTimer = setInterval(() => this.pollActiveRows(), 15000);
    }

    /**
     * Redraw the cards after a single row changed.
     *
     * CardViewMixin only re-renders on view.onDataChanged - a full reload.
     * view.updateItem raises onRowsChanged instead, so a refreshed row changed
     * the data underneath while the card on screen kept showing the old status:
     * the live refresh worked in table view and did nothing in card view, which
     * is the view this grid opens in. Batched, since a burst of progress
     * messages would otherwise rebuild the cards once per message.
     */
    private scheduleCardRedraw() {
        if (!this.cardView)
            return;
        clearTimeout(this.cardRedrawTimer);
        this.cardRedrawTimer = setTimeout(() => {
            const cards = this.element[0]?.querySelector('.card-container') as HTMLElement;
            if (!cards || cards.style.display === 'none')
                return;                     // table view repaints its own rows
            const scroll = cards.scrollTop;
            // Private in the typings, public at runtime; it is exactly the
            // redraw switchView and onDataChanged use.
            (this.cardView as any).updateCardItems();
            cards.scrollTop = scroll;       // rebuilt cards must not jump the list
        }, 150);
    }

    /** Re-read the visible parts that still have a stage queued or running. */
    private pollActiveRows() {
        if (document.hidden || !this.view)
            return;
        const recent = Date.now() - 2 * 60 * 60 * 1000;
        const ids = (this.view.getItems() as any[])
            .filter(item => RERUN_ACTIONS.some(action => action.statusFields.some(f => {
                const status = item?.[f];
                if (status === 'In Progress')
                    return true;
                // Pending forever is normal for a stage switched off, so only
                // a recently touched part counts as waiting for the queue.
                const touched = Date.parse(item?.UpdateDate ?? item?.InsertDate ?? '');
                return status === 'Pending' && touched > recent;
            })))
            .map(item => Number(item.Id))
            .filter(id => id && !this.rowRefreshTimers.has(id))
            .slice(0, 25);
        ids.forEach(id => this.refreshRow(id));
    }

    /** Re-read one row shortly after its last progress message. */
    private queueRowRefresh(id: number) {
        clearTimeout(this.rowRefreshTimers.get(id));
        this.rowRefreshTimers.set(id, setTimeout(() => {
            this.rowRefreshTimers.delete(id);
            this.refreshRow(id);
        }, 1200));
    }

    /**
     * Replaces one row's data in place.
     *
     * Deliberately not this.refresh(): a full reload on every stage transition
     * throws away scroll position and any in-flight sort or filter, and with
     * several parts running at once it would fire constantly.
     */
    private refreshRow(id: number) {
        CostingPartsService.Retrieve({ EntityId: id }, response => {
            const fresh = response?.Entity;
            if (!fresh)
                return;

            const current = this.view.getItemById(id);
            if (!current)
                return;                     // scrolled away or filtered out since

            // Message is [NotMapped], so Retrieve never returns it. Without
            // this the freshly-read row would blank the cell we just filled.
            (fresh as any).Message = (current as any).Message;
            this.view.updateItem(id, fresh);
            this.scheduleCardRedraw();
        }, {
            blockUI: false,
            // A row that vanished, or a blip in the service, must not put a
            // modal over a grid the operator is only watching.
            onError: () => true
        });
    }

    public destroy() {
        this.rowRefreshTimers.forEach(t => clearTimeout(t));
        this.rowRefreshTimers.clear();
        clearTimeout(this.cardRedrawTimer);
        clearInterval(this.pollTimer);
        super.destroy();
    }

    protected getButtons(): ToolButton[] {

        var buttons = super.getButtons();
        buttons.splice(indexOf(buttons, x => x.cssClass == "add-button"), 1);
        buttons.push({
            title: 'Upload Drawing',
            icon:"fa fa-upload text-green",
            cssClass: 'export-xlsx-button',
            onClick: () => {

                var dialog = new DrawingImportDialog();
                // Refresh when the upload actually succeeds, not on the close
                // event: `dialogclose` is jQuery UI and a Bootstrap modal never
                // raises it, so the new parts did not appear until the operator
                // refreshed by hand. The close handler stays as a backstop for
                // the cancel path and to drop the reference.
                dialog.onUploaded = () => this.refresh();
                dialog.element.on('dialogclose', () => {
                    this.refresh();
                    dialog = null;
                });
                dialog.dialogOpen();
            }
        });

        return buttons;
    }
    /**
     * One part, rendered as a card.
     *
     * The row used to be eleven columns wide - picture, number, revision,
     * description, four separate status cells, documents, message, and three
     * button groups - which meant scrolling sideways to answer "what happened
     * to this part". A card puts the identity top-left, the four pipeline
     * stages together where they can be compared at a glance, and the actions
     * bottom-right.
     *
     * Deliberately still a SlickGrid row. The grid brings the search box, the
     * column filters, sorting, paging, the toolbar and - the part that matters
     * most here - the per-row refresh driven by the consumer's progress
     * messages. Hand-rolling a card wall would have thrown all of that away to
     * gain a layout that a full-width card gives anyway.
     */
    private cardHtml(item: any): HTMLElement {
        const enc = (s: any) => htmlEncode(s ?? '');
        const host = window.location.protocol + '//' + window.location.host;

        const stages: [string, string, string][] = [
            ['Conversion', item.DrawingConversionStatusName, item.DrawingConversionStatusColor],
            ['OCR', item.OcrStatusName, item.OcrStatusColor],
            ['Costing', item.CostingStatusName, item.CostingStatusColor],
            ['Balloon', item.BalloonStatusName, item.BalloonStatusColor],
        ];
        const chips = stages.map(([label, name, color]) => `
            <span class="cp-chip" title="${enc(label)}: ${enc(name)}">
              <b style="color:${enc(color) || 'currentColor'}">&#11044;</b>
              <span class="cp-chip-label">${enc(label)}</span>
              <span class="cp-chip-value">${enc(name)}</span>
            </span>`).join('');

        let docs = '';
        try {
            const list = item.DocumentList ? JSON.parse(item.DocumentList) : [];
            docs = list.map((x: any) => `
                <a class="cp-doc" target="_blank" rel="noopener"
                   href="${enc(host + '/upload/' + x.FileDirectory)}"
                   title="${enc(x.FileName)}">
                  <span class="cp-doc-type" style="background:${enc(x.Color)}">${enc(x.Type)}</span>
                  <span class="cp-doc-name">${enc(x.FileName)}</span>
                </a>`).join('');
        } catch {
            // A malformed DocumentList must not blank the whole card.
            docs = '';
        }

        const runs = RERUN_ACTIONS.map(a => {
            const state = stageState(item, a);
            const running = state === 'running';
            return `<button type="button" class="inline-action cp-rerun cp-rerun-${state}"
                            data-stage="${a.stage}" ${running ? 'disabled aria-busy="true"' : ''}
                            aria-label="${enc('Re-run ' + a.label)}"
                            title="${enc(stageHint(a, state))}">
                      <i class="fa ${running ? 'fa-circle-o-notch cp-rerun-spin' : a.icon} cp-rerun-icon"></i>
                      <span class="cp-rerun-label">${enc(a.short)}</span>
                    </button>`;
        }).join('');

        // An ELEMENT, not a string. CardViewMixin appends whatever renderItem
        // returns; hand it a string and it appends nothing, which shows up as
        // a wall of correctly laid-out but completely empty cards.
        const el = document.createElement('div');
        el.innerHTML = `
          <div class="cp-card" data-cp-id="${enc(item.Id)}">
            <div class="cp-card-top">
              <div class="cp-card-thumb">
                ${item.PartPicture
                  ? `<img src="${enc(host + '/upload/' + item.PartPicture)}" alt="" loading="lazy" />`
                  : `<span class="cp-card-nothumb" title="No 3D preview yet">&#9633;</span>`}
              </div>
              <div class="cp-card-id">
                <div class="cp-card-head">
                  <span class="cp-part">${enc(item.PartNumber) || '<em>Unnamed</em>'}</span>
                  ${item.Revision ? `<span class="cp-rev">Rev ${enc(item.Revision)}</span>` : ''}
                  <span class="cp-id">#${enc(item.Id)}</span>
                </div>
                <div class="cp-desc" title="${enc(item.Description)}">${enc(item.Description) || '<em>No description</em>'}</div>
              </div>
            </div>
            <div class="cp-chips">${chips}</div>
            ${docs ? `<div class="cp-docs">${docs}</div>` : ''}
            ${item.Message ? `<div class="cp-msg" title="${enc(item.Message)}">${enc(item.Message)}</div>` : ''}
            <div class="cp-card-actions">
              <button class="inline-action open-workspace-button btn btn-primary btn-sm">Open</button>
              <div class="cp-rerun-group" role="group" aria-label="Re-run a pipeline stage">${runs}</div>
              <a class="inline-action delete-button" title="Delete this part"><i class="fa fa-trash"></i></a>
            </div>
          </div>`;
        return el.firstElementChild as HTMLElement;
    }

    protected getColumns(): Column[] {
        let columns =  super.getColumns();
        let documentListCol = columns.find(item=>item.field == "DocumentList")
        if(documentListCol){
            documentListCol.format = (ctx)=>{
                if (!ctx.item.DocumentList) return "";
                let items = JSON.parse(ctx.item.DocumentList);
                let host = window.location.protocol + "//" + window.location.host;

                let html = items.map((x: any) =>
                    `<div style="display: flex;justify-content: start;align-items: center;gap:10px;margin-bottom: 5px"><div style="width:40px;height:30px;line-height:30px;text-align: center;border-radius:5px;background-color:${x.Color};color:#ffffff">${x.Type}</div>
                    <div><a href="${host + "/upload/" + x.FileDirectory}"  target="_blank">${x.FileName}</a></div> </div>`
                ).join('');
                return `<div style="overflow-y:auto; margin-top: 3px; height: 100%; min-width:300px;">${html}</div>`
            }
        }

        
        let drawingConversionStatusCol = columns.find(item=>item.field == "DrawingConversionStatusName")
        if(drawingConversionStatusCol){
            drawingConversionStatusCol.formatter = (row,cell,value,column,item)=>{
                let html = `<b style="cursor:pointer;color:${item.DrawingConversionStatusColor};margin-right:10px" title="${item.DrawingConversionStatusName}">⬤</b> ${item.DrawingConversionStatusName}`
                return html
            }
        }

        let ocrStatusCol = columns.find(item=>item.field == "OcrStatusName")
        if(ocrStatusCol){
            ocrStatusCol.formatter = (row,cell,value,column,item)=>{
                let html = `<b style="cursor:pointer;color:${item.OcrStatusColor};margin-right:10px" title="${item.OcrStatusName}">⬤</b> ${item.OcrStatusName}`
                return html
            }
        }

        let costingStatusCol = columns.find(item=>item.field == "CostingStatusName")
        if(costingStatusCol){
            costingStatusCol.formatter = (row,cell,value,column,item)=>{
                let html = `<b style="cursor:pointer;color:${item.CostingStatusColor};margin-right:10px" title="${item.CostingStatusName}">⬤</b> ${item.CostingStatusName}`
                return html
            }
        }
        let balloonStatusCol = columns.find(item=>item.field == "BalloonStatusName")
        if(balloonStatusCol){
            balloonStatusCol.formatter = (row,cell,value,column,item)=>{
                let html = `<b style="cursor:pointer;color:${item.BalloonStatusColor};margin-right:10px" title="${item.BalloonStatusName}">⬤</b> ${item.BalloonStatusName}`
                return html
            }
        }
        columns.splice(1,0,{
            field: "Delete",
            name: '',
            format:ctx=>{
                return  `<a class="inline-action delete-button"><i class="fa fa-trash" style="color:var(--bs-danger)"></i></a>`
            },
            width:150,
            minWidth:150
        })
        columns.splice(2,0,{
            field: "View Result",
            name: '',
            format:ctx=>{
                return  `<div><button class="inline-action open-workspace-button btn btn-primary">Open</button></div>`
            },
            width:150,
            minWidth:150
        })

        columns.splice(3,0,{
            field: "Rerun",
            name: 'Run',
            toolTip: 'Put this part back through a stage of the pipeline',
            format: ctx => {
                // Each button reports the stage's own status rather than just
                // going dead, so the operator can tell a stage that is still
                // running from one that failed and is worth re-running.
                const buttons = RERUN_ACTIONS.map(a => {
                    const state = stageState(ctx.item, a);
                    const running = state === 'running';
                    return `<button type="button"
                                    class="inline-action cp-rerun cp-rerun-${state}"
                                    data-stage="${a.stage}"
                                    ${running ? 'disabled aria-busy="true"' : ''}
                                    aria-label="${htmlEncode(`Re-run ${a.label}`)}"
                                    title="${htmlEncode(stageHint(a, state))}">
                                <i class="fa ${running ? 'fa-circle-o-notch cp-rerun-spin' : a.icon} cp-rerun-icon"></i>
                                <span class="cp-rerun-label">${htmlEncode(a.short)}</span>
                                <i class="fa fa-repeat cp-rerun-go"></i>
                            </button>`;
                }).join('');
                return `<div class="cp-rerun-group" role="group"
                             aria-label="Re-run a pipeline stage">${buttons}</div>`;
            },
            width: 150,
            minWidth: 150
        })

        return columns
    }
    /**
     * What an .inline-action does, for one item.
     *
     * Shared by both views. In card view the buttons are NOT in the grid's
     * canvas - CardViewMixin renders them into its own container - so
     * SlickGrid's onClick never sees them and every button was dead. The card
     * delegate in afterInit routes here instead.
     */
    private runAction(item: CostingPartsRow, target: HTMLElement) {
        if (!item || !target) return;

        if (target.classList.contains("delete-button")) {
            let grid = this
            Q.confirm(Q.text('Delete this record?'), () => {
                CostingPartsService.Delete({EntityId: item.Id})
                    .then(function () { grid.refresh() })
            })
            return;
        }
        if (target.classList.contains("open-workspace-button")) {
            window.open(`${window.location.origin}/Costing/Workspace/${item.Id}`, "_blank");
            return;
        }
        if (target.classList.contains("cp-rerun")) {
            this.rerun(item, Number(target.getAttribute("data-stage")),
                       target as HTMLButtonElement);
        }
    }

    protected onClick(e,row:number,cell:number){
        super.onClick(e,row,cell);
        if(e.isDefaultPrevented()){
            return
        }

        // closest(), not a single parentElement hop: the re-run buttons wrap
        // their icon and label in their own elements, so a click can land two
        // levels below the button that carries the class.
        let target = (e.target as HTMLElement)?.closest('.inline-action') as HTMLElement;
        let item = this.itemAt(row);
        if (target) {
            e.preventDefault();
            this.runAction(item, target);
        }
    }

    /**
     * Queues one stage for one part.
     *
     * Confirms first because a re-run discards what the previous run produced -
     * cost lines, balloons - and on a part someone has already reviewed that is
     * not recoverable from the UI.
     */
    protected rerun(item: CostingPartsRow, stage: RerunStage, button: HTMLButtonElement) {
        const action = RERUN_ACTIONS.find(a => a.stage === stage);
        if (!action)
            return;

        Q.confirm(
            `Run ${action.label} again for part ${item.PartNumber || item.Id}?\n\n${action.hint}`,
            () => {
                // Disable straight away: the round trip is short but the queue
                // pickup is not, so without this a second click lands before the
                // status column has changed.
                button.disabled = true;
                CostingPartsService.Rerun(
                    { CostingPartId: item.Id, Stage: stage },
                    response => {
                        notifySuccess(response.Message);
                        this.refresh();
                    },
                    {
                        onError: error => {
                            button.disabled = false;
                            notifyError(error?.error?.message ??
                                `Could not queue ${action.label}.`);
                        }
                    });
            });
    }
    protected getSlickOptions(): GridOptions {
        let opt = super.getSlickOptions();
        // Only used when the operator switches back to the table view; the
        // card view lays itself out and ignores this.
        opt.rowHeight = 120;
        return opt;
    }
}