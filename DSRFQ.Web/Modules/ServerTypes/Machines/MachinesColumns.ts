import { ColumnsBase, fieldsProxy } from '@serenity-is/corelib';
import { Column } from '@serenity-is/sleekgrid';
import { MachinesRow } from './MachinesRow';

export interface MachinesColumns {
    Id: Column<MachinesRow>;
    Name: Column<MachinesRow>;
    Description: Column<MachinesRow>;
    Precision: Column<MachinesRow>;
    AxisNumber: Column<MachinesRow>;
    Cost: Column<MachinesRow>;
    WorkEnvelopeX: Column<MachinesRow>;
    WorkEnvelopeY: Column<MachinesRow>;
    WorkEnvelopeZ: Column<MachinesRow>;
    WeightLimit: Column<MachinesRow>;
    CurrencyId: Column<MachinesRow>;
    InsertDate: Column<MachinesRow>;
    InsertUserId: Column<MachinesRow>;
    UpdateDate: Column<MachinesRow>;
    UpdateUserId: Column<MachinesRow>;
    DeleteDate: Column<MachinesRow>;
    DeleteUserId: Column<MachinesRow>;
    IsActive: Column<MachinesRow>;
    CompanyId: Column<MachinesRow>;
}

export class MachinesColumns extends ColumnsBase<MachinesRow> {
    static readonly columnsKey = 'Machines.Machines';
    static readonly Fields = fieldsProxy<MachinesColumns>();
}