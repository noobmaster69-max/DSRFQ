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

    static readonly deletePermission = 'Administration:General';
    static readonly insertPermission = 'Administration:General';
    static readonly readPermission = 'Administration:General';
    static readonly updatePermission = 'Administration:General';

    static readonly Fields = fieldsProxy<MachinesRow>();
}