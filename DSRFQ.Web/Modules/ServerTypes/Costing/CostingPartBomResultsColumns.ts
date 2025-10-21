import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { CostingPartBomResultsRow } from './CostingPartBomResultsRow';

export interface CostingPartBomResultsColumns {
    Id: Column<CostingPartBomResultsRow>;
    CostingPartId: Column<CostingPartBomResultsRow>;
    PartNumber: Column<CostingPartBomResultsRow>;
    Description: Column<CostingPartBomResultsRow>;
    Quantity: Column<CostingPartBomResultsRow>;
    InternalEngineeringNumber: Column<CostingPartBomResultsRow>;
    IsManual: Column<CostingPartBomResultsRow>;
    InsertDate: Column<CostingPartBomResultsRow>;
    InsertUserId: Column<CostingPartBomResultsRow>;
    UpdateDate: Column<CostingPartBomResultsRow>;
    UpdateUserId: Column<CostingPartBomResultsRow>;
    DeleteDate: Column<CostingPartBomResultsRow>;
    DeleteUserId: Column<CostingPartBomResultsRow>;
    IsActive: Column<CostingPartBomResultsRow>;
}

export class CostingPartBomResultsColumns extends ColumnsBase<CostingPartBomResultsRow> {
    static readonly columnsKey = 'Costing.CostingPartBomResults';
    static readonly Fields = fieldsProxy<CostingPartBomResultsColumns>();
}