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

    static readonly deletePermission = '?';
    static readonly insertPermission = '?';
    static readonly readPermission = '?';
    static readonly updatePermission = '?';

    static readonly Fields = fieldsProxy<RawMaterialCostsRow>();
}