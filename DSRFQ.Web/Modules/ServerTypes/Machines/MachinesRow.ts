import { fieldsProxy } from '@serenity-is/corelib';

export interface MachinesRow {
    Id?: number;
    Name?: string;
    Description?: string;
    Precision?: number;
    AxisNumber?: number;
    Cost?: number;
    WorkEnvelopeX?: number;
    WorkEnvelopeY?: number;
    WorkEnvelopeZ?: number;
    WeightLimit?: number;
    CurrencyId?: number;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
    CompanyId?: number;
}

export abstract class MachinesRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'Name';
    static readonly localTextPrefix = 'Machines.Machines';

    static readonly deletePermission = '?';
    static readonly insertPermission = '?';
    static readonly readPermission = '?';
    static readonly updatePermission = '?';

    static readonly Fields = fieldsProxy<MachinesRow>();
}