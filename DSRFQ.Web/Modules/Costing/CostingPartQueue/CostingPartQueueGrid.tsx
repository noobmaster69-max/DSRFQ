import {
    confirmDialog, Criteria, Decorators, EntityGrid, htmlEncode, indexOf,
    ListRequest, notifyError, notifySuccess, serviceRequest, ToolButton
} from '@serenity-is/corelib';
import { Column, GridOptions } from '@serenity-is/sleekgrid';
import {
    CostingPartQueueColumns, CostingPartQueueRow, CostingPartQueueService
} from '../../ServerTypes/Costing';
import { CostingPartQueueCss } from './CostingPartQueueCss';

/** How often the page re-reads the queue while Live is on. */
const REFRESH_MS = 5000;

const LANE_LABEL: Record<string, string> = {
    drawing: 'Drawing + OCR',
    costing: 'Costing',
    ballooning: 'Ballooning'
};

interface LaneSummary {
    Lane?: string;
    Running?: number;
    Queued?: number;
    Failed?: number;
    OldestWaitSeconds?: number;
    RunningPart?: string;
    RunningSeconds?: number;
}

/** Seconds as something readable in a 90px column. */
function duration(seconds: number | null | undefined): string {
    if (seconds == null) return '';
    // The server and the browser can disagree by a second either way; a
    // negative elapsed time is noise, not information.
    const s = Math.max(0, Math.round(seconds));
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

/**
 * What is running, what is waiting, and what stopped.
 *
 * The queue exists because nothing throttled the pipeline: every RFQ handler
 * spawned a thread and returned, so ten drawings uploaded together started ten
 * conversions at once. Work now waits in CostingPartQueue and the consumer
 * admits one job per lane at a time -- which is only reassuring if you can see
 * it happening, hence this page.
 */
@Decorators.registerClass('DSRFQ.Costing.CostingPartQueueGrid')
export class CostingPartQueueGrid extends EntityGrid<CostingPartQueueRow> {
    protected getColumnsKey() { return CostingPartQueueColumns.columnsKey; }
    protected getRowDefinition() { return CostingPartQueueRow; }
    protected getService() { return CostingPartQueueService.baseUrl; }

    /** Hide finished jobs by default; the page is about what is happening now. */
    private liveOnly = true;
    private live = true;
    private timer: any = null;
    private lanesEl: HTMLElement;
    private alertEl: HTMLElement;

    protected getDefaultSortBy() {
        // Newest first. Order within a lane is the Position column's job --
        // sorting by status would put 'cancelled' above 'running'.
        return ['QueuedAt DESC'];
    }

    protected afterInit() {
        super.afterInit();
        this.mountLaneStrip();
        this.setLive(true);
    }

    /**
     * The lane strip sits above the grid's own toolbar container, so a grid
     * refresh does not tear it down.
     */
    private mountLaneStrip() {
        const host = this.domNode;
        if (!host) return;

        const wrap = document.createElement('div');
        wrap.innerHTML = `${CostingPartQueueCss()}
            <div class="cq-alert"></div>
            <div class="cq-lanes"></div>`;
        host.insertBefore(wrap, host.firstChild);

        this.lanesEl = wrap.querySelector('.cq-lanes');
        this.alertEl = wrap.querySelector('.cq-alert');
        this.loadSummary();
    }

    private loadSummary() {
        serviceRequest(CostingPartQueueService.baseUrl + '/Summary', {},
            (response: any) => this.renderSummary(response),
            // Silent: the strip is a summary of what the grid already shows, so
            // a failed poll should not put an alert over a working page.
            { blockUI: false, onError: () => true });
    }

    private renderSummary(response: { Lanes?: LaneSummary[]; ConsumerLooksDown?: boolean }) {
        if (!this.lanesEl) return;

        const lanes = response?.Lanes ?? [];
        this.lanesEl.innerHTML = lanes.map(lane => {
            const running = (lane.Running ?? 0) > 0;
            const waiting = (lane.Queued ?? 0) > 0;
            const state = running ? 'is-running' : waiting ? 'is-waiting' : '';
            const now = running
                ? `Running <b>${htmlEncode(lane.RunningPart ?? '')}</b>
                   <span class="cq-lane-idle">for ${duration(lane.RunningSeconds)}</span>`
                : `<span class="cq-lane-idle">Idle</span>`;

            return `
            <div class="cq-lane ${state}">
                <div class="cq-lane-head">
                    <span>${htmlEncode(LANE_LABEL[lane.Lane] ?? lane.Lane ?? '')}</span>
                    <span class="cq-lane-limit">${lane.Running ?? 0} running</span>
                </div>
                <div class="cq-lane-now">${now}</div>
                <div class="cq-lane-counts">
                    <span><b>${lane.Queued ?? 0}</b> waiting</span>
                    ${waiting ? `<span>oldest <b>${duration(lane.OldestWaitSeconds)}</b></span>` : ''}
                    ${(lane.Failed ?? 0) > 0
                        ? `<span class="is-fail"><b>${lane.Failed}</b> failed today</span>` : ''}
                </div>
            </div>`;
        }).join('');

        this.alertEl.innerHTML = response?.ConsumerLooksDown
            ? 'Work has been waiting with nothing running. The RFQ consumer ' +
              '(rabbitMq.py) is probably not up &mdash; nothing will start until it is.'
            : '';
    }

    /** Only waiting and running jobs, unless the user asks for the history. */
    protected onViewSubmit() {
        if (!super.onViewSubmit())
            return false;

        const request = this.view.params as ListRequest;
        request.Criteria = this.liveOnly
            ? Criteria.and(request.Criteria,
                Criteria('Status').in(['queued', 'running']))
            : request.Criteria;
        return true;
    }

    protected getButtons(): ToolButton[] {
        const buttons = super.getButtons();
        // Rows are written by the pipeline, not typed in.
        const add = indexOf(buttons, x => x.cssClass == 'add-button');
        if (add >= 0) buttons.splice(add, 1);

        buttons.push({
            title: 'Live',
            icon: 'fa fa-bolt text-green',
            cssClass: 'cq-live-button',
            hint: `Re-read the queue every ${REFRESH_MS / 1000} seconds`,
            onClick: () => this.setLive(!this.live),
            separator: true
        });

        buttons.push({
            title: 'Show finished',
            icon: 'fa fa-history',
            cssClass: 'cq-history-button',
            hint: 'Include completed, failed and cancelled jobs',
            onClick: () => {
                this.liveOnly = !this.liveOnly;
                this.refresh();
            }
        });

        return buttons;
    }

    private setLive(on: boolean) {
        this.live = on;
        if (this.timer) {
            window.clearInterval(this.timer);
            this.timer = null;
        }
        if (on) {
            this.timer = window.setInterval(() => {
                // A refresh while a dialog or an inline action is mid-flight is
                // merely wasted; a refresh after the page is gone throws.
                if (!document.body.contains(this.domNode)) {
                    this.setLive(false);
                    return;
                }
                this.refresh();
                this.loadSummary();
            }, REFRESH_MS);
        }
        this.updateInterface();
    }

    protected updateInterface() {
        super.updateInterface();
        // Both buttons are toggles, and a toolbar button gives no sign of being
        // on, so the state is carried by a class rather than left implicit.
        this.toolbar?.findButton('cq-live-button')?.toggleClass('cq-on', this.live);
        this.toolbar?.findButton('cq-history-button')?.toggleClass('cq-on', !this.liveOnly);
    }

    public refresh() {
        super.refresh();
        // Keeps the strip in step with the rows below it, including after a
        // manual refresh or an action.
        this.loadSummary();
    }

    public destroy() {
        if (this.timer) {
            window.clearInterval(this.timer);
            this.timer = null;
        }
        super.destroy();
    }

    protected getColumns(): Column[] {
        const columns = super.getColumns();

        const status = columns.find(c => c.field === 'Status');
        if (status) {
            status.format = ctx => {
                const value = String(ctx.value ?? '');
                return `<span class="cq-pill is-${htmlEncode(value)}">${htmlEncode(value)}</span>`;
            };
        }

        const elapsed = columns.find(c => c.field === 'ElapsedSeconds');
        if (elapsed) {
            elapsed.format = ctx => {
                const text = duration(ctx.value);
                // Says which clock it is: a queued job's elapsed is how long it
                // has waited, a running one's is how long it has been going.
                const what = ctx.item?.Status === 'queued' ? 'waiting' : 'running';
                return ctx.item?.FinishedAt
                    ? htmlEncode(text)
                    : `<span title="${htmlEncode(what)} for ${htmlEncode(text)}">${htmlEncode(text)}</span>`;
            };
        }

        const position = columns.find(c => c.field === 'Position');
        if (position)
            position.format = ctx => ctx.value ? String(ctx.value) : '';

        columns.splice(1, 0, {
            field: 'Actions',
            name: '',
            width: 160,
            minWidth: 160,
            format: ctx => {
                const status = ctx.item?.Status;
                const actions: string[] = [];
                if (status === 'queued') {
                    actions.push(`<button type="button" class="cq-act cq-move-up"
                        title="Run this next in its lane">Move up</button>`);
                    actions.push(`<button type="button" class="cq-act cq-act-cancel cq-cancel"
                        title="Take this off the queue">Cancel</button>`);
                } else if (status === 'running') {
                    actions.push(`<button type="button" class="cq-act cq-act-cancel cq-cancel"
                        title="Release the lane slot this job is holding">Release</button>`);
                } else {
                    actions.push(`<button type="button" class="cq-act cq-requeue"
                        title="Queue this part again">Retry</button>`);
                }
                return `<div class="cq-actions">${actions.join('')}</div>`;
            }
        });

        return columns;
    }

    protected onClick(e: Event, row: number, cell: number) {
        super.onClick(e, row, cell);
        if (e.defaultPrevented)
            return;

        const target = (e.target as HTMLElement)?.closest('.cq-act') as HTMLButtonElement;
        if (!target)
            return;

        e.preventDefault();
        const item = this.itemAt(row);
        if (!item?.Id)
            return;

        if (target.classList.contains('cq-move-up'))
            this.act('Prioritise', item, target);
        else if (target.classList.contains('cq-cancel'))
            this.confirmCancel(item, target);
        else if (target.classList.contains('cq-requeue'))
            this.act('Requeue', item, target);
    }

    /**
     * Releasing a running job is not the same as cancelling a waiting one --
     * the consumer cannot interrupt its own threads -- so the prompt says what
     * it actually does rather than asking "are you sure".
     */
    private confirmCancel(item: CostingPartQueueRow, button: HTMLButtonElement) {
        const running = item.Status === 'running';
        const message = running
            ? `Release the ${item.Lane} slot held by part ` +
              `${item.PartNumber || item.CostingPartId}?\n\n` +
              `The consumer cannot stop work it has already started, so this ` +
              `frees the lane for the next job and marks this part Failed. ` +
              `Whatever is already running may still finish in the background.`
            : `Take part ${item.PartNumber || item.CostingPartId} off the ` +
              `${item.Lane} queue?\n\nIt will not run until it is queued again.`;

        confirmDialog(message, () => this.act('Cancel', item, button));
    }

    private act(action: string, item: CostingPartQueueRow, button: HTMLButtonElement) {
        // The round trip is short but the next Live refresh is not, so without
        // this a second click lands before the row has changed.
        button.disabled = true;
        serviceRequest(CostingPartQueueService.baseUrl + '/' + action,
            { QueueItemId: item.Id },
            (response: any) => {
                notifySuccess(response?.Message ?? 'Done.');
                this.refresh();
            },
            {
                onError: response => {
                    button.disabled = false;
                    notifyError(response?.Error?.Message ??
                        `Could not ${action.toLowerCase()} this job.`);
                    // Handled here, so corelib does not also alert it.
                    return true;
                }
            });
    }

    protected getSlickOptions(): GridOptions {
        const options = super.getSlickOptions();
        options.rowHeight = 34;
        return options;
    }
}
