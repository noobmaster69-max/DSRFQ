import { fieldsProxy } from '@serenity-is/corelib';

export interface SurfaceTreatmentProcessesRow {
    Id?: number;
    Name?: string;
    Description?: string;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
    SpecificationNumber?: string;
    Comments?: string;
    Restriction?: string;
    SupplierName?: string;
    Country?: string;
    State?: string;
    City?: string;
    DateApprove?: string;
    DateExpire?: string;
    Capable?: number;
}

export abstract class SurfaceTreatmentProcessesRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'Name';
    static readonly localTextPrefix = 'Master.SurfaceTreatmentProcesses';

    static readonly deletePermission = 'Administration:General';
    static readonly insertPermission = 'Administration:General';
    static readonly readPermission = 'Administration:General';
    static readonly updatePermission = 'Administration:General';

    static readonly Fields = fieldsProxy<SurfaceTreatmentProcessesRow>();
}