import { getLookup, getLookupAsync, fieldsProxy } from "@serenity-is/corelib";

export interface FeatureCategoriesRow {
    Id?: number;
    Name?: string;
    Description?: string;
    InsertDate?: string;
    InsertUserId?: number;
    UpdateDate?: string;
    UpdateUserId?: number;
    DeleteDate?: string;
    DeleteUserId?: number;
    IsActive?: number;
}

export abstract class FeatureCategoriesRow {
    static readonly idProperty = 'Id';
    static readonly nameProperty = 'Name';
    static readonly localTextPrefix = 'Master.FeatureCategories';
    static readonly lookupKey = 'MasterFeatureCategories';

    /** @deprecated prefer `getLookupAsync` */
    static getLookup() { return getLookup<FeatureCategoriesRow>('MasterFeatureCategories') }
    static async getLookupAsync() { return getLookupAsync<FeatureCategoriesRow>('MasterFeatureCategories') }

    static readonly deletePermission = 'Administration:General';
    static readonly insertPermission = 'Administration:General';
    static readonly readPermission = '?';
    static readonly updatePermission = 'Administration:General';

    static readonly Fields = fieldsProxy<FeatureCategoriesRow>();
}
