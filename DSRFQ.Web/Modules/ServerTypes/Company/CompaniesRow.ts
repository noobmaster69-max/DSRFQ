import { getLookup, getLookupAsync, fieldsProxy } from "@serenity-is/corelib";

export interface CompaniesRow {
    Id?: number;
    Name?: string;
    Picture?: string;
    GroupId?: number;
    GroupName?: string;
    CompanyGroupList?: string;
    OrganizationId?: string;
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

export abstract class CompaniesRow {
    static readonly idProperty = 'Id';
    static readonly isActiveProperty = 'IsActive';
    static readonly nameProperty = 'Name';
    static readonly localTextPrefix = 'Company.Companies';
    static readonly lookupKey = 'Companies';

    /** @deprecated use getLookupAsync instead */
    static getLookup() { return getLookup<CompaniesRow>('Companies') }
    static async getLookupAsync() { return getLookupAsync<CompaniesRow>('Companies') }

    static readonly deletePermission = '?';
    static readonly insertPermission = '?';
    static readonly readPermission = 'Company:View';
    static readonly updatePermission = '?';

    static readonly Fields = fieldsProxy<CompaniesRow>();
}