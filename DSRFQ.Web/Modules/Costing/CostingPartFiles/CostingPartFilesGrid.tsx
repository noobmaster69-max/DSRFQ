import {
    Decorators, EntityGrid, htmlEncode, indexOf, ToolButton
} from '@serenity-is/corelib';
import { Column, GridOptions } from '@serenity-is/sleekgrid';
import {
    CostingPartFilesColumns, CostingPartFilesRow, CostingPartFilesService
} from '../../ServerTypes/Costing';
import { CostingPartFilesCss } from './CostingPartFilesCss';

/** CostingPartDocuments.Type, and how each is badged. */
const DOC_TYPE: Record<number, { label: string; color: string }> = {
    1: {label: '2D', color: '#007bff'},
    2: {label: '3D', color: '#28a745'},
    3: {label: 'CAD', color: '#6c757d'}
};

/**
 * Search every uploaded file by what the pipeline read out of it.
 *
 * The Drawing Library lists PARTS, so finding a file meant knowing which part
 * it belonged to. Here a file is the row, and the quick-search box reaches the
 * child tables too -- a BOM line's part number, a plating spec -- through the
 * view's SearchText column.
 */
@Decorators.registerClass('DSRFQ.Costing.CostingPartFilesGrid')
export class CostingPartFilesGrid extends EntityGrid<CostingPartFilesRow> {
    protected getColumnsKey() { return CostingPartFilesColumns.columnsKey; }
    protected getRowDefinition() { return CostingPartFilesRow; }
    protected getService() { return CostingPartFilesService.baseUrl; }

    /** Detail rows already fetched, keyed by document id. */
    private details = new Map<number, any>();
    private expanded: number | null = null;

    protected getDefaultSortBy() { return ['UploadedAt DESC']; }

    protected afterInit() {
        super.afterInit();
        const host = this.domNode;
        if (host && !host.querySelector('#dsrfq-file-library-css')) {
            const wrap = document.createElement('div');
            wrap.innerHTML = CostingPartFilesCss();
            host.insertBefore(wrap, host.firstChild);
        }
    }

    protected getButtons(): ToolButton[] {
        const buttons = super.getButtons();
        // The library is a view over files the pipeline created; nothing here
        // is typed in.
        const add = indexOf(buttons, x => x.cssClass == 'add-button');
        if (add >= 0) buttons.splice(add, 1);
        return buttons;
    }

    protected getColumns(): Column[] {
        const columns = super.getColumns();
        const e = (v: any) => htmlEncode(v == null ? '' : String(v));

        const pic = columns.find(c => c.field === 'PartPicture');
        if (pic) {
            pic.name = '';
            pic.sortable = false;
            pic.format = ctx => ctx.value
                ? `<img class="fl-thumb" src="/upload/${e(ctx.value)}" alt="" />`
                : `<span class="fl-thumb is-empty"></span>`;
        }

        const type = columns.find(c => c.field === 'DocumentType');
        if (type) {
            type.format = ctx => {
                const meta = DOC_TYPE[ctx.value] ?? DOC_TYPE[3];
                return `<span class="fl-type" style="background:${meta.color}">${meta.label}</span>`;
            };
        }

        // The file name is the thing being searched for, so it doubles as the
        // download link rather than needing a separate action column.
        const name = columns.find(c => c.field === 'FileName');
        if (name) {
            name.format = ctx => {
                const dir = ctx.item?.FileDirectory;
                const label = e(ctx.value);
                return dir
                    ? `<a class="fl-file" href="/upload/${e(dir)}" target="_blank"
                           rel="noopener noreferrer" title="Download ${label}">${label}</a>`
                    : label;
            };
        }

        // Three separate dimension columns would cost 3 x 90px to say one
        // thing. Length carries all three; Width/Height stay in the row for
        // filtering and export.
        const size = columns.find(c => c.field === 'Length');
        if (size) {
            size.sortable = true;
            size.format = ctx => {
                const i = ctx.item ?? {};
                const n = (v: any) => v == null ? null : String(Number(v));
                return [i.Length, i.Width, i.Height].every((v: any) => v != null)
                    ? `${n(i.Length)} × ${n(i.Width)} × ${n(i.Height)}`
                    : '';
            };
        }

        const weight = columns.find(c => c.field === 'GrossWeight');
        if (weight)
            weight.format = ctx => ctx.value == null ? ''
                : `${Number(ctx.value)} kg`;

        // Counts read as noise at zero; only a non-zero one is worth the ink.
        for (const [field, cls] of [['BomLineCount', 'fl-count'],
                                    ['SpecialProcessCount', 'fl-count'],
                                    ['BalloonCount', 'fl-count']] as const) {
            const col = columns.find(c => c.field === field);
            if (col)
                col.format = ctx => Number(ctx.value) > 0
                    ? `<span class="${cls}">${e(ctx.value)}</span>` : '';
        }

        const dup = columns.find(c => c.field === 'DuplicateCount');
        if (dup) {
            dup.format = ctx => Number(ctx.value) > 0
                ? `<span class="fl-dup" title="${e(ctx.value)} other upload(s) of this file">${e(ctx.value)}</span>`
                : '';
        }

        columns.splice(1, 0, {
            field: 'Open',
            name: '',
            width: 92,
            minWidth: 92,
            sortable: false,
            format: ctx => `
                <button type="button" class="fl-act fl-detail"
                        title="Show the BOM, processes and duplicates">Detail</button>
                <a class="fl-act fl-open" href="/Costing/Workspace/${ctx.item?.CostingPartId}"
                   target="_blank" rel="noopener noreferrer" title="Open the costing workspace">Open</a>`
        });

        return columns;
    }

    protected onClick(e: Event, row: number, cell: number) {
        super.onClick(e, row, cell);
        if (e.defaultPrevented) return;

        const target = (e.target as HTMLElement)?.closest('.fl-detail') as HTMLElement;
        if (!target) return;
        e.preventDefault();

        const item = this.itemAt(row);
        if (!item?.Id) return;
        this.toggleDetail(item);
    }

    /**
     * Fetch the child-table detail for one file and show it beneath the grid.
     *
     * On demand, not joined into the list: a part can carry 400 balloons and
     * 40 BOM lines, and none of that belongs in every row of a search result.
     */
    private toggleDetail(item: CostingPartFilesRow) {
        const panel = this.detailPanel();
        if (this.expanded === item.Id) {
            this.expanded = null;
            panel.innerHTML = '';
            return;
        }
        this.expanded = item.Id!;

        const render = (d: any) => panel.innerHTML = this.detailHtml(item, d);
        const cached = this.details.get(item.Id!);
        if (cached) { render(cached); return; }

        panel.innerHTML = `<div class="fl-detail-panel"><em>Loading…</em></div>`;
        CostingPartFilesService.Detail(
            {CostingPartId: item.CostingPartId, DocumentId: item.Id},
            response => {
                this.details.set(item.Id!, response);
                if (this.expanded === item.Id) render(response);
            },
            {
                blockUI: false,
                onError: () => {
                    panel.innerHTML =
                        `<div class="fl-detail-panel">Could not load the detail for this file.</div>`;
                    return true;
                }
            });
    }

    private detailPanel(): HTMLElement {
        let el = this.domNode.querySelector('.fl-detail-host') as HTMLElement;
        if (!el) {
            el = document.createElement('div');
            el.className = 'fl-detail-host';
            this.domNode.appendChild(el);
        }
        return el;
    }

    private detailHtml(item: CostingPartFilesRow, d: any): string {
        const e = (v: any) => htmlEncode(v == null ? '' : String(v));
        const section = (title: string, body: string) =>
            body ? `<div class="fl-sec"><h4>${title}</h4>${body}</div>` : '';

        const bom = (d.Bom ?? []).map((b: any) => `
            <tr><td>${e(b.PartNumber)}</td><td>${e(b.Description)}</td>
                <td class="num">${b.Quantity == null ? '' : Number(b.Quantity)}</td>
                <td>${e(b.InternalEngineeringNumber)}</td></tr>`).join('');

        const proc = (d.SpecialProcesses ?? [])
            .map((p: string) => `<li>${e(p)}</li>`).join('');

        const cost = (d.Costing ?? []).map((c: any) => `
            <tr><td>${e(c.Name)}</td>
                <td class="num">${c.Quantity == null ? '' : Number(c.Quantity)}</td>
                <td class="num">${c.UnitPrice == null ? '' : Number(c.UnitPrice)}</td>
                <td class="num">${c.Total == null ? '' : Number(c.Total)}</td>
                <td>${e(c.MachineName)}</td></tr>`).join('');

        const dups = (d.Duplicates ?? []).map((f: any) => `
            <a class="fl-duplink" href="/Costing/Workspace/${f.CostingPartID}"
               target="_blank" rel="noopener noreferrer">part ${f.CostingPartID}</a>`).join(' ');

        return `<div class="fl-detail-panel">
            <div class="fl-detail-head">
                <b>${e(item.FileName)}</b>
                <span>part ${e(item.CostingPartId)}${item.PartNumber ? ' · ' + e(item.PartNumber) : ''}</span>
                <button type="button" class="fl-detail-close fl-act fl-detail">Close</button>
            </div>
            ${section('BOM', bom ? `<table class="fl-tbl"><thead><tr>
                <th>Part number</th><th>Description</th><th class="num">Qty</th>
                <th>TcENG</th></tr></thead><tbody>${bom}</tbody></table>` : '')}
            ${section('Special processes', proc ? `<ul class="fl-list">${proc}</ul>` : '')}
            ${section('Costing', cost ? `<table class="fl-tbl"><thead><tr>
                <th>Line</th><th class="num">Qty</th><th class="num">Unit</th>
                <th class="num">Total</th><th>Machine</th></tr></thead>
                <tbody>${cost}</tbody></table>` : '')}
            ${section('Also uploaded as', dups)}
            ${!bom && !proc && !cost && !dups
                ? '<p class="fl-none">Nothing was extracted from this file.</p>' : ''}
        </div>`;
    }

    protected getSlickOptions(): GridOptions {
        const options = super.getSlickOptions();
        options.rowHeight = 44;
        return options;
    }
}
