import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { CostingPartSpecialProcessResultsRow } from './CostingPartSpecialProcessResultsRow';

export interface CostingPartSpecialProcessResultsColumns {
    Id: Column<CostingPartSpecialProcessResultsRow>;
    CostingPartId: Column<CostingPartSpecialProcessResultsRow>;
    SpecialProcessName: Column<CostingPartSpecialProcessResultsRow>;
    SpecialProcessId: Column<CostingPartSpecialProcessResultsRow>;
    IsManual: Column<CostingPartSpecialProcessResultsRow>;
    InsertDate: Column<CostingPartSpecialProcessResultsRow>;
    InsertUserId: Column<CostingPartSpecialProcessResultsRow>;
    UpdateDate: Column<CostingPartSpecialProcessResultsRow>;
    UpdateUserId: Column<CostingPartSpecialProcessResultsRow>;
    DeleteDate: Column<CostingPartSpecialProcessResultsRow>;
    DeleteUserId: Column<CostingPartSpecialProcessResultsRow>;
    IsActive: Column<CostingPartSpecialProcessResultsRow>;
}

export class CostingPartSpecialProcessResultsColumns extends ColumnsBase<CostingPartSpecialProcessResultsRow> {
    static readonly columnsKey = 'Costing.CostingPartSpecialProcessResults';
    static readonly Fields = fieldsProxy<CostingPartSpecialProcessResultsColumns>();
}