import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { CostingPartCostingResultsRow } from './CostingPartCostingResultsRow';

export interface CostingPartCostingResultsColumns {
    Id: Column<CostingPartCostingResultsRow>;
    CostingPartId: Column<CostingPartCostingResultsRow>;
    CostingCategoryId: Column<CostingPartCostingResultsRow>;
    Name: Column<CostingPartCostingResultsRow>;
    Description: Column<CostingPartCostingResultsRow>;
    Quantity: Column<CostingPartCostingResultsRow>;
    DimensionUnitId: Column<CostingPartCostingResultsRow>;
    DimensionUnit: Column<CostingPartCostingResultsRow>;
    UnitPrice: Column<CostingPartCostingResultsRow>;
    CurrencyId: Column<CostingPartCostingResultsRow>;
    Total: Column<CostingPartCostingResultsRow>;
    IsTimeUnit: Column<CostingPartCostingResultsRow>;
    IsManual: Column<CostingPartCostingResultsRow>;
    InsertDate: Column<CostingPartCostingResultsRow>;
    InsertUserId: Column<CostingPartCostingResultsRow>;
    UpdateDate: Column<CostingPartCostingResultsRow>;
    UpdateUserId: Column<CostingPartCostingResultsRow>;
    DeleteDate: Column<CostingPartCostingResultsRow>;
    DeleteUserId: Column<CostingPartCostingResultsRow>;
    IsActive: Column<CostingPartCostingResultsRow>;
}

export class CostingPartCostingResultsColumns extends ColumnsBase<CostingPartCostingResultsRow> {
    static readonly columnsKey = 'Costing.CostingPartCostingResults';
    static readonly Fields = fieldsProxy<CostingPartCostingResultsColumns>();
}