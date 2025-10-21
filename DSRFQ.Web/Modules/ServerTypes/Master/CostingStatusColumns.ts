import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { CostingStatusRow } from './CostingStatusRow';

export interface CostingStatusColumns {
    Id: Column<CostingStatusRow>;
    Name: Column<CostingStatusRow>;
    Color: Column<CostingStatusRow>;
    InsertDate: Column<CostingStatusRow>;
    InsertUserId: Column<CostingStatusRow>;
    UpdateDate: Column<CostingStatusRow>;
    UpdateUserId: Column<CostingStatusRow>;
    DeleteDate: Column<CostingStatusRow>;
    DeleteUserId: Column<CostingStatusRow>;
    IsActive: Column<CostingStatusRow>;
}

export class CostingStatusColumns extends ColumnsBase<CostingStatusRow> {
    static readonly columnsKey = 'Master.CostingStatus';
    static readonly Fields = fieldsProxy<CostingStatusColumns>();
}