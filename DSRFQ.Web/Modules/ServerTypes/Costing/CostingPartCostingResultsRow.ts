import { fieldsProxy } from '@serenity-is/corelib';

export interface CostingPartCostingResultsRow {
    Id?: number;
    CostingPartId?: number;
    CostingCategoryId?: number;
    Name?: string;
    Description?: string;
    Quantity?: number;
    DimensionUnitId?: number;
    DimensionUnit?: string;
    UnitPrice?: number;
    CurrencyId?: number;
    Total?: number;
    IsTimeUnit?: number;
    IsManual?: number;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
    CostingPartPartNumber?: string;
    DimensionUnitCode?: string;
    CurrencyCode?: string;
}

export abstract class CostingPartCostingResultsRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'Name';
    static readonly localTextPrefix = 'Costing.CostingPartCostingResults';

    static readonly deletePermission = 'Administration:General';
    static readonly insertPermission = 'Administration:General';
    static readonly readPermission = 'Administration:General';
    static readonly updatePermission = 'Administration:General';

    static readonly Fields = fieldsProxy<CostingPartCostingResultsRow>();
}