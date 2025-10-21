import { fieldsProxy } from '@serenity-is/corelib';

export interface CostingPartDocumentsRow {
    Id?: number;
    CostingPartId?: number;
    FileDirectory?: string;
    FileName?: string;
    Type?: number;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
    CostingPartPartNumber?: string;
}

export abstract class CostingPartDocumentsRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'FileDirectory';
    static readonly localTextPrefix = 'Costing.CostingPartDocuments';

    static readonly deletePermission = 'Administration:General';
    static readonly insertPermission = 'Administration:General';
    static readonly readPermission = 'Administration:General';
    static readonly updatePermission = 'Administration:General';

    static readonly Fields = fieldsProxy<CostingPartDocumentsRow>();
}