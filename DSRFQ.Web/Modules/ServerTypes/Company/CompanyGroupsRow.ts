import { getLookup, getLookupAsync, fieldsProxy } from "@serenity-is/corelib";

export interface CompanyGroupsRow {
    Id?: number;
    CompanyId?: number;
    GroupId?: number;
    CompanyName?: string;
    GroupName?: string;
    InsertUserId?: number;
    InsertDate?: string;
    InsertBy?: string;
    UpdateUserId?: number;
    UpdateDate?: string;
    UpdateBy?: string;
    DeleteUserId?: number;
    DeleteDate?: string;
    DeleteBy?: string;
    IsActive?: number;
}

export abstract class CompanyGroupsRow {
    static readonly idProperty = 'Id';
    static readonly isActiveProperty = 'IsActive';
    static readonly localTextPrefix = 'Company.CompanyGroups';
    static readonly lookupKey = 'CompanyGroups';

    /** @deprecated use getLookupAsync instead */
    static getLookup() { return getLookup<CompanyGroupsRow>('CompanyGroups') }
    static async getLookupAsync() { return getLookupAsync<CompanyGroupsRow>('CompanyGroups') }

    static readonly deletePermission = 'Company:Delete';
    static readonly insertPermission = 'Company:Insert';
    static readonly readPermission = 'Company:View';
    static readonly updatePermission = 'Company:Update';

    static readonly Fields = fieldsProxy<CompanyGroupsRow>();
}