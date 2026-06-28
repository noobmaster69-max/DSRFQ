import { fieldsProxy } from '@serenity-is/corelib';

export interface MaterialsRow {
    Id?: number;
    Code?: string;
    Name?: string;
    Description?: string;
    Density?: number;
    DimensionUnitId?: number;
    CompanyId?: number;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
    CompanyName?: string;
}

export abstract class MaterialsRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'Code';
    static readonly localTextPrefix = 'Material.Materials';

    static readonly deletePermission = 'Administration:General';
    static readonly insertPermission = 'Administration:General';
    static readonly readPermission = 'Administration:General';
    static readonly updatePermission = 'Administration:General';

    static readonly Fields = fieldsProxy<MaterialsRow>();
}