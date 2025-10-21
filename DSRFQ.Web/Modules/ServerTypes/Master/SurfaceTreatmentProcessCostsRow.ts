import { fieldsProxy } from '@serenity-is/corelib';

export interface SurfaceTreatmentProcessCostsRow {
    Id?: number;
    SurfaceTreatmentProcessId?: number;
    DimensionUnitId?: number;
    PricePerUnitArea?: number;
    Default?: number;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
    SurfaceTreatmentProcessName?: string;
    DimensionUnitCode?: string;
}

export abstract class SurfaceTreatmentProcessCostsRow {
    static readonly idProperty = 'Id';
    static readonly localTextPrefix = 'Master.SurfaceTreatmentProcessCosts';

    static readonly deletePermission = 'Administration:General';
    static readonly insertPermission = 'Administration:General';
    static readonly readPermission = 'Administration:General';
    static readonly updatePermission = 'Administration:General';

    static readonly Fields = fieldsProxy<SurfaceTreatmentProcessCostsRow>();
}