import { fieldsProxy } from '@serenity-is/corelib';

export interface RawMaterialCostsRow {
    Id?: number;
    MaterialId?: number;
    MaterialTemperId?: number;
    MaterialShapeId?: number;
    WeightDimensionUnitId?: number;
    CurrencyId?: number;
    UnitPrice?: number;
    FromDate?: string;
    ToDate?: string;
    CompanyId?: number;
    GroupId?: number;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
    MaterialCode?: string;
    WeightDimensionUnitCode?: string;
}

export abstract class RawMaterialCostsRow {
    static readonly idProperty = 'Id';
    static readonly localTextPrefix = 'Material.RawMaterialCosts';

    static readonly deletePermission = 'Administration:General';
    static readonly insertPermission = 'Administration:General';
    static readonly readPermission = 'Administration:General';
    static readonly updatePermission = 'Administration:General';

    static readonly Fields = fieldsProxy<RawMaterialCostsRow>();
}