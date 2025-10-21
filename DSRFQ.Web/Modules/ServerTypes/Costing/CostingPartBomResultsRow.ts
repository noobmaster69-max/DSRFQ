import { fieldsProxy } from '@serenity-is/corelib';

export interface CostingPartBomResultsRow {
    Id?: number;
    CostingPartId?: number;
    PartNumber?: string;
    Description?: string;
    Quantity?: number;
    InternalEngineeringNumber?: string;
    IsManual?: number;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
    CostingPartPartNumber?: string;
}

export abstract class CostingPartBomResultsRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'PartNumber';
    static readonly localTextPrefix = 'Costing.CostingPartBomResults';

    static readonly deletePermission = 'Administration:General';
    static readonly insertPermission = 'Administration:General';
    static readonly readPermission = 'Administration:General';
    static readonly updatePermission = 'Administration:General';

    static readonly Fields = fieldsProxy<CostingPartBomResultsRow>();
}