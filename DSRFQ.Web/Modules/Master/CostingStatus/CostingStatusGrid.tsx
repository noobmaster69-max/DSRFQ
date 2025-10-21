import { Decorators, EntityGrid } from '@serenity-is/corelib';
import { CostingStatusColumns, CostingStatusRow, CostingStatusService } from '../../ServerTypes/Master';
import { CostingStatusDialog } from './CostingStatusDialog';
import {Column} from "@serenity-is/sleekgrid";

@Decorators.registerClass('DSRFQ.Master.CostingStatusGrid')
export class CostingStatusGrid extends EntityGrid<CostingStatusRow> {
    protected getColumnsKey() { return CostingStatusColumns.columnsKey; }
    protected getDialogType() { return CostingStatusDialog; }
    protected getRowDefinition() { return CostingStatusRow; }
    protected getService() { return CostingStatusService.baseUrl; }
    protected getColumns(): Column[] {
        let columns = super.getColumns();
        let colorCol = columns.find(item => item.field == "Color")
        colorCol.formatter = (row, cell, value, column, item) => {
            let html = `<b style="cursor:pointer;color:${item.Color};margin-right:10px">⬤</b>`
            return html
        }
        return columns;
    }
}