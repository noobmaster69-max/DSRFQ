import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { WeightUnitsRow } from './WeightUnitsRow';

export interface WeightUnitsColumns {
    Id: Column<WeightUnitsRow>;
    Code: Column<WeightUnitsRow>;
    Name: Column<WeightUnitsRow>;
    InsertDate: Column<WeightUnitsRow>;
    InsertUserId: Column<WeightUnitsRow>;
    UpdateDate: Column<WeightUnitsRow>;
    UpdateUserId: Column<WeightUnitsRow>;
    DeleteDate: Column<WeightUnitsRow>;
    DeleteUserId: Column<WeightUnitsRow>;
    IsActive: Column<WeightUnitsRow>;
}

export class WeightUnitsColumns extends ColumnsBase<WeightUnitsRow> {
    static readonly columnsKey = 'Master.WeightUnits';
    static readonly Fields = fieldsProxy<WeightUnitsColumns>();
}