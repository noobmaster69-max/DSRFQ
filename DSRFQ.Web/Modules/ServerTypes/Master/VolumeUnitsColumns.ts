import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { VolumeUnitsRow } from './VolumeUnitsRow';

export interface VolumeUnitsColumns {
    Id: Column<VolumeUnitsRow>;
    Code: Column<VolumeUnitsRow>;
    Name: Column<VolumeUnitsRow>;
    InsertDate: Column<VolumeUnitsRow>;
    InsertUserId: Column<VolumeUnitsRow>;
    UpdateDate: Column<VolumeUnitsRow>;
    UpdateUserId: Column<VolumeUnitsRow>;
    DeleteDate: Column<VolumeUnitsRow>;
    DeleteUserId: Column<VolumeUnitsRow>;
    IsActive: Column<VolumeUnitsRow>;
}

export class VolumeUnitsColumns extends ColumnsBase<VolumeUnitsRow> {
    static readonly columnsKey = 'Master.VolumeUnits';
    static readonly Fields = fieldsProxy<VolumeUnitsColumns>();
}