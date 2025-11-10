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

    static readonly deletePermission = '?';
    static readonly insertPermission = '?';
    static readonly readPermission = '?';
    static readonly updatePermission = '?';

    static readonly Fields = fieldsProxy<MaterialsRow>();
}