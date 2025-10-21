import { fieldsProxy } from '@serenity-is/corelib';

export interface CostingPartSpecialProcessResultsRow {
    Id?: number;
    CostingPartId?: number;
    SpecialProcessName?: string;
    SpecialProcessId?: number;
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

export abstract class CostingPartSpecialProcessResultsRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'SpecialProcessName';
    static readonly localTextPrefix = 'Costing.CostingPartSpecialProcessResults';

    static readonly deletePermission = 'Administration:General';
    static readonly insertPermission = 'Administration:General';
    static readonly readPermission = 'Administration:General';
    static readonly updatePermission = 'Administration:General';

    static readonly Fields = fieldsProxy<CostingPartSpecialProcessResultsRow>();
}