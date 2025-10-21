import { fieldsProxy } from '@serenity-is/corelib';

export interface CostingPartDocumentImagesRow {
    Id?: number;
    CostingPartDocumentId?: number;
    FileDirectory?: string;
    FileName?: string;
    Page?: number;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
    CostingPartDocumentFileDirectory?: string;
}

export abstract class CostingPartDocumentImagesRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'FileDirectory';
    static readonly localTextPrefix = 'Costing.CostingPartDocumentImages';

    static readonly deletePermission = 'Administration:General';
    static readonly insertPermission = 'Administration:General';
    static readonly readPermission = 'Administration:General';
    static readonly updatePermission = 'Administration:General';

    static readonly Fields = fieldsProxy<CostingPartDocumentImagesRow>();
}