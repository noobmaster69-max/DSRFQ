import { fieldsProxy } from '@serenity-is/corelib';

export interface CostingPartsRow {
    Id?: number;
    PartNumber?: string;
    Revision?: string;
    Description?: string;
    Length?: number;
    Width?: number;
    Height?: number;
    DimensionUnitId?: number;
    PartPicture?: string;
    MaterialId?: number;
    MaterialTemperId?: number;
    GrossVolume?: number;
    NetVolume?: number;
    VolumeUnitId?: number;
    GrossWeight?: number;
    NetWeight?: number;
    WeightUnitId?: number;
    NumberOfFace?: number;
    NumberOfHole?: number;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
}

export abstract class CostingPartsRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'PartNumber';
    static readonly localTextPrefix = 'Costing.CostingParts';

    static readonly deletePermission = 'Administration:General';
    static readonly insertPermission = 'Administration:General';
    static readonly readPermission = 'Administration:General';
    static readonly updatePermission = 'Administration:General';

    static readonly Fields = fieldsProxy<CostingPartsRow>();
}