import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { DimensionUnitsRow } from './DimensionUnitsRow';

export interface DimensionUnitsColumns {
    Id: Column<DimensionUnitsRow>;
    Code: Column<DimensionUnitsRow>;
    Name: Column<DimensionUnitsRow>;
    InsertDate: Column<DimensionUnitsRow>;
    InsertUserId: Column<DimensionUnitsRow>;
    UpdateDate: Column<DimensionUnitsRow>;
    UpdateUserId: Column<DimensionUnitsRow>;
    DeleteDate: Column<DimensionUnitsRow>;
    DeleteUserId: Column<DimensionUnitsRow>;
    IsActive: Column<DimensionUnitsRow>;
}

export class DimensionUnitsColumns extends ColumnsBase<DimensionUnitsRow> {
    static readonly columnsKey = 'Master.DimensionUnits';
    static readonly Fields = fieldsProxy<DimensionUnitsColumns>();
}